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

// Function to process the content of the document
function processContent(content) {
  if (!content) return "";

  // Extract subheaders marked with **Subheader** followed by content
  const regex = /\*\*(.+?)\*\*\s*([\s\S]*?)(?=\*\*|$)/g;
  let html = "";
  let match;

  // If there are subheaders, format them
  while ((match = regex.exec(content)) !== null) {
    const subheader = match[1].trim();
    const text = match[2].trim().replace(/\n+/g, "<br>");
    html += `<h4>${subheader}</h4><p>${text}</p>`;
  }

  // If no matches, just return as paragraph
  if (!html) {
    return `<p>${content.replace(/\n+/g, "<br>")}</p>`;
  }

  return html;
}

// Function to generate HTML output from the structured JSON data
function generateHtmlOutput(sections) {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${sections[0]?.title || "Document"}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f4f6f8;
      color: #333;
      margin: 0;
      padding: 20px;
    }
    .container {
      background: #fff;
      max-width: 800px;
      margin: auto;
      padding: 40px;
      border-radius: 10px;
      box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
    }
    h2 {
      font-size: 28px;
      color: #1a73e8;
      text-align: center;
      margin-bottom: 30px;
    }
    h3 {
      font-size: 22px;
      color: #0d47a1;
      margin-top: 30px;
      border-left: 5px solid #1a73e8;
      padding-left: 10px;
    }
    h4 {
      font-size: 18px;
      color: #3367d6;
      margin-top: 20px;
    }
    p {
      line-height: 1.6;
      margin: 10px 0;
    }
    .section-content {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid #ddd;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>${sections[0]?.title || "Untitled Document"}</h2>`;

  // Loop through each section
  sections.forEach(section => {
    html += `
    <div class="section-content">
      <h3>${section.title}</h3>
      ${processContent(section.content)}
    </div>`;
  });

  html += `
  </div>
</body>
</html>`;
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
