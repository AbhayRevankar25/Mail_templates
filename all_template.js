// this is divided based on the category of the message given.

// Required dependencies
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { PromptTemplate } = require("@langchain/core/prompts");
const { RunnableSequence } = require("@langchain/core/runnables");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const { marked } = require("marked");
require("dotenv").config();  // To load environment variables from the .env file

// Initialize the Google Generative AI model using the API key from the .env file
const chatModel = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,  // Ensure the GOOGLE_API_KEY is set in the .env file
  model: "gemini-2.0-flash",
});

// Function to return the correct prompt template based on document type
const getPromptForType = (type) => {
  switch (type) {
    case 'product_description':
      return PromptTemplate.fromTemplate(`
        You are an expert marketer tasked with summarizing a product description.
        Your output should include:
        - "title": product name or key heading
        - "content": detailed description, features, and benefits
        Structure:
        - First object: Subject line with the product's title
        - Subsequent objects: Features, benefits, and other key details
        If the document contains pricing, include that in the content.
        - Title: {title}
        Content: {content}
      `);

    case 'meeting_agenda':
      return PromptTemplate.fromTemplate(`
        You are an expert meeting organizer tasked with creating a structured meeting agenda.
        Your output should include:
        - "title": Meeting name or topic
        - "content": Detailed agenda including time and key discussion points
        Structure:
        - First object: Subject line with the meeting title
        - Subsequent objects: Key agenda items with time slots and discussion points
        - Title: {title}
        Content: {content}
      `);

    case 'newsletter_draft':
      return PromptTemplate.fromTemplate(`
        You are an expert content creator tasked with summarizing a newsletter draft.
        Your output should include:
        - "title": Section heading or topic of the newsletter
        - "content": Content of the newsletter in text, bullet points, or sub-sections
        Structure:
        - First object: Subject line with the newsletter's title
        - Subsequent objects: Key sections, e.g., latest updates, upcoming events
        - Title: {title}
        Content: {content}
      `);

    default:
      return PromptTemplate.fromTemplate(`
        You are an expert email marketer tasked with extracting key points from a document for an email summary.
        Your output should include:
        - "title": concise section heading
        - "content": detailed string (plain text or bullet points)
        Structure:
        - First object: Email subject line using the document's title
        - Subsequent objects: Logical sections or key points
        - Title: {title}
        Content: {content}
      `);
  }
};

// Choose the prompt template based on document type (example: 'product_description')
const promptForType = getPromptForType('product_description');

// Create a runnable sequence of prompts and the chat model
const chain = RunnableSequence.from([promptForType, chatModel]);

// Function to parse document based on file extension (PDF, Markdown, or Text)
async function parseDocument(filePath) {
  const ext = filePath.split(".").pop().toLowerCase();
  let rawText;

  // Handle PDF files using pdf-parse
  if (ext === "pdf") {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    rawText = data.text;
  } 
  // Handle Markdown files using marked
  else if (ext === "md") {
    const markdown = fs.readFileSync(filePath, "utf-8");
    rawText = marked.parse(markdown).replace(/<[^>]*>/g, "");  // Clean HTML tags from Markdown
  } 
  // Handle plain text files
  else {
    rawText = fs.readFileSync(filePath, "utf-8");
  }

  const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean); // Clean up text lines
  const title = lines.length > 0 ? lines[0] : "Untitled"; // Extract title (first line)
  const content = rawText;  // Full content of the document

  return { title, content };
}

// Function to generate an outline and output both JSON and HTML formats
async function generateOutline(subject, content, extractedTitle) {
  try {
    // Invoke the chain of prompts and model to generate structured output
    const result = await chain.invoke({ title: subject, content });

    // Clean the JSON response and replace the first object with correct title
    let jsonString = result.content.replace(/```json|```/g, '').trim();
    let jsonResponse = JSON.parse(jsonString);

    // Replace the first object with the correct subject-title format
    jsonResponse[0] = {
      title: "Subject",
      content: extractedTitle || "Untitled"
    };

    // Save the JSON output to a file
    fs.writeFileSync("output.json", JSON.stringify(jsonResponse, null, 2));
    console.log(" JSON output saved to output.json");

    // Generate and save the HTML output
    const htmlOutput = generateHtmlOutput(jsonResponse);
    fs.writeFileSync("output.html", htmlOutput);
    console.log(" HTML output saved to output.html");

    return jsonResponse;  // Return the structured JSON response
  } catch (err) {
    console.error("❌ Error generating outline:", err.message);
    throw err;
  }
}

// Function to generate HTML from the JSON response
function generateHtmlOutput(sections) {
  let html = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${sections[0].content || "Document"}</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f2f5; padding: 20px; color: #333; }
      .container { background: #ffffff; max-width: 700px; margin: auto; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); }
      h2 { font-size: 28px; color: #1a73e8; text-align: center; margin-bottom: 30px; }
      h3 { font-size: 20px; color: #0d47a1; margin-top: 25px; margin-bottom: 10px; border-left: 4px solid #1a73e8; padding-left: 10px; }
      .section-content { margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #e0e0e0; }
      p { margin-bottom: 1em; line-height: 1.6; }
      ul, ol { padding-left: 20px; margin-top: 0.5em; }
      li { margin-bottom: 0.5em; }
      @media (max-width: 768px) { .container { padding: 20px; } }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>${sections[0].content || "Email Title"}</h2>`;

  sections.slice(1).forEach(section => {
    html += `<div class="section-content">
      <h3>${section.title}</h3>
      <div>${processContent(section.content)}</div>
    </div>`;
  });

  html += `</div></body></html>`;
  return html;
}

// Function to process the content into HTML format
function processContent(content) {
  if (typeof content === 'string') return parseText(content);
  if (Array.isArray(content)) return `<ul>${content.map(item => `<li>${processContent(item)}</li>`).join('')}</ul>`;
  if (typeof content === 'object') {
    return `<ul>${Object.entries(content).map(([k, v]) => `<li><strong>${k}:</strong> ${processContent(v)}</li>`).join('')}</ul>`;
  }
  return '';
}

// Function to parse the text into HTML
function parseText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let html = '', listOpen = false, ordered = false;
  lines.forEach(line => {
    if (/^[-*]\s/.test(line)) {
      if (!listOpen) html += '<ul>', listOpen = true, ordered = false;
      html += `<li>${line.replace(/^[-*]\s/, '')}</li>`;
    } else if (/^\d+\.\s/.test(line)) {
      if (!listOpen) html += '<ol>', listOpen = true, ordered = true;
      html += `<li>${line.replace(/^\d+\.\s/, '')}</li>`;
    } else {
      if (listOpen) html += ordered ? '</ol>' : '</ul>', listOpen = false;
      html += `<p>${line}</p>`;
    }
  });
  if (listOpen) html += ordered ? '</ol>' : '</ul>';
  return html;
}

// Main function to start processing the document
async function main() {
  try {
    // Path to the input file (default to "sampleInput.txt")
    const filePath = process.argv[2] || "sampleInput.txt";
    
    // Parse the document to extract title and content
    const { title: extractedTitle, content } = await parseDocument(filePath);
    
    // Generate and save outline as JSON and HTML
    await generateOutline("Subject", content, extractedTitle);
  } catch (err) {
    console.error(" Error:", err.message);
  }
}

// Start the script by calling the main function
main();
