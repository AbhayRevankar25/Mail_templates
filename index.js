const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { PromptTemplate } = require("@langchain/core/prompts");
const { RunnableSequence } = require("@langchain/core/runnables");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const { marked } = require("marked");
require('dotenv').config();

// Initialize the Google Generative AI model with your API key
const chatModel = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,  // Ensure to store the API key in your environment variables
  model: "gemini-2.0-flash",
});

// Create a prompt template to generate a structured email outline
const prompt = PromptTemplate.fromTemplate(`
You are an expert email marketer tasked with extracting the most important key points and sections from a long document's title and content (such as a product description, a meeting agenda, or a newsletter draft) and returning them in a structured JSON array suitable for summarizing in an email.

Your output must be a valid JSON array (without markdown code blocks).
let the output dont hallucinate.

Each object must contain:
1. "title": concise string for section heading
2. "content": detailed string (plain text or bullet points)

Structure:
- First object: email subject line using the document's title for both "title" and "content"
- Subsequent objects: logical sections or key points
- If it has the welcoming part, add that in the introduction.
- If the email is about a meeting, include the meeting details (place, date, time) or placeholders if missing.
- For a meeting agenda, include step-by-step details with key points for each agenda item.
- Add preparation instructions for the meeting if relevant.
- Add an RSVP request with an explanation.
- Include contact information at the end with placeholders for the email and phone number (replace with actual values if found).

Title: {title}
Content: {content}

Generate the JSON array as per the above rules:
`);

const chain = RunnableSequence.from([prompt, chatModel]);

// Function to parse the document based on its extension
async function parseDocument(filePath) {
  const ext = filePath.split(".").pop().toLowerCase();
  let rawText;

  // If the document is a PDF
  if (ext === "pdf") {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    rawText = data.text;
  } 
  // If the document is markdown
  else if (ext === "md") {
    const markdown = fs.readFileSync(filePath, "utf-8");
    rawText = marked.parse(markdown).replace(/<[^>]*>/g, "");
  } 
  // If it's a plain text file
  else {
    rawText = fs.readFileSync(filePath, "utf-8");
  }

  const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);
  const title = lines.length > 0 ? lines[0] : "Untitled";
  const content = rawText;

  return { title, content };
}

// Function to generate the email outline
async function generateOutline(subject, content, extractedTitle) {
  try {
    const result = await chain.invoke({ title: subject, content });
    let jsonString = result.content.replace(/```json|```/g, '').trim();

    let jsonResponse = JSON.parse(jsonString);

    // Replace the first object with the correct subject-title format
    jsonResponse[0] = {
      title: "Subject",
      content: extractedTitle || "Untitled"
    };

    // Save the JSON output to a file
    fs.writeFileSync("output.json", JSON.stringify(jsonResponse, null, 2));
    console.log("JSON output saved to output.json");

    // Generate and save the HTML output
    const htmlOutput = generateHtmlOutput(jsonResponse);
    fs.writeFileSync("output.html", htmlOutput);
    console.log("HTML output saved to output.html");

    return jsonResponse;
  } catch (err) {
    console.error("Error generating outline:", err.message);
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


// Main function to process the document
async function main() {
  try {
    const filePath = process.argv[2] || "sampleInput.txt";  // Take the file path from the command line or use default
    const { title: extractedTitle, content } = await parseDocument(filePath);
    await generateOutline("Subject", content, extractedTitle);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main();
