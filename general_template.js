// For the general email template becuase the prompt given to the gemini api is general prompt.

// Import required modules and dependencies
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { PromptTemplate } = require("@langchain/core/prompts");
const { RunnableSequence } = require("@langchain/core/runnables");
const fs = require('fs');
require('dotenv').config();

// Initialize the chat model with API key from environment variables
const chatModel = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
  model: "gemini-2.0-flash"
});

// Create a PromptTemplate for summarizing the document into structured JSON
const prompt = PromptTemplate.fromTemplate(`
  You are an expert email marketer tasked with extracting the most important key points and sections from a long document's title and content (such as a product description, a meeting agenda, or a newsletter draft) and returning them in a structured JSON array suitable for summarizing in an email.

  Your output must be a valid JSON array (without markdown code blocks).

  Each object within the array must represent a key point or logical section extracted from the document. Each object must contain exactly two key-value pairs:
  1. The key "title" with a concise string value for the section heading or key point summary.
  2. The key "content" with a string value containing the detailed text for that section or key point. Use plain text, bullet points (like \n*, \n-, or similar), or newlines (\n) for formatting within the string where appropriate.

  Structure the JSON array as follows:
  - The first object should represent the email subject line. Use the document's title for the "title" and the "content" fields (formatted as bold).
  - Subsequent objects should represent the main logical sections or key points extracted from the document content. Identify distinct topics, arguments, or steps presented in the document and turn each into a separate object in the array.
  - If any specific details like times, dates, locations, names, or product specifications are present in the source content for a section, you must include this information within the "content" string for that relevant section.
  - Try to include contact information at the end and also add the RSVP request above it.
  Do NOT include any other keys in the objects or any surrounding text outside the JSON array.

  ---
  Using the following document:

  Title: {title}
  Content: {content}

  Please generate the JSON array output based on the document content and the required email summary structure, strictly following the format and sections described above:
`);

// Create a chain that uses the prompt and chat model to process the document
const chain = RunnableSequence.from([prompt, chatModel]);

// Function to generate a structured outline from document content
async function generateOutline(title, content) {
  try {
    // Invoke the chain with the provided document title and content
    const result = await chain.invoke({ title, content });
    
    // Clean the response to remove markdown code blocks if present
    let jsonString = result.content;
    jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Parse the cleaned JSON response
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse JSON response:", jsonString);
      throw e;
    }

    // Save the structured JSON output to a file
    fs.writeFileSync("output.json", JSON.stringify(jsonResponse, null, 2));
    console.log(" JSON output saved to output.json");

    // Generate the HTML version of the document summary and save it to a file
    const htmlOutput = generateHtmlOutput(jsonResponse);
    fs.writeFileSync("output.html", htmlOutput);
    console.log(" HTML output saved to output.html");

    return jsonResponse;
  } catch (err) {
    console.error("Error generating outline:", err.message);
    throw err;
  }
}

// Function to generate an HTML representation of the document summary
function generateHtmlOutput(sections) {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sections[0].content.title || "Document"}</title>
  <style>
    body {
      font-family: sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 5px;
    }
    h2 {
      color: #0056b3;
    }
    h3 {
      color: #0056b3;
      font-size: 1.1em;
    }
    p {
      margin-bottom: 1em;
    }
    strong {
      font-weight: bold;
    }
    ul, ol {
      padding-left: 20px;
      margin-bottom: 1em;
    }
    li {
      margin-bottom: 0.5em;
    }
    .section-content {
      margin-bottom: 1.5em;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>${sections[0].content.title || "Document Title"}</h2>`;

  sections.forEach(section => {
    html += `<div class="section-content">`;

    // Add section content to the HTML dynamically
    if (section.title && section.content) {
      html += `<h3>${section.title}</h3>`;
      html += `<div class="content">${processContent(section.content)}</div>`;
    }

    html += `</div>`;
  });

  html += `</div></body></html>`;
  return html;
}

// Function to process and format the content into HTML
function processContent(content) {
  let htmlContent = '';
  
  if (typeof content === 'string') {
    // Process plain text content
    htmlContent = parseText(content);
  } else if (Array.isArray(content)) {
    // Process list content
    htmlContent = '<ul>';
    content.forEach(item => {
      htmlContent += `<li>${processContent(item)}</li>`;
    });
    htmlContent += '</ul>';
  } else if (typeof content === 'object') {
    // Process object content as key-value pairs
    htmlContent = '<ul>';
    for (const [key, value] of Object.entries(content)) {
      htmlContent += `<li><strong>${key}:</strong> ${processContent(value)}</li>`;
    }
    htmlContent += '</ul>';
  }
  
  return htmlContent;
}

// Function to parse text into HTML with bullet points and line breaks
function parseText(text) {
  let formattedText = '';
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let isList = false;
  let listType = '';

  lines.forEach(line => {
    // Detect bullet points or numbered lists
    if (line.startsWith('*') || line.startsWith('-')) {
      if (!isList) {
        formattedText += '<ul>';
        isList = true;
        listType = 'bullet';
      }
      formattedText += `<li>${line.replace(/^[-*]\s*/, '')}</li>`;
    } else if (line.match(/^\d+\.\s/)) {
      if (!isList) {
        formattedText += '<ol>';
        isList = true;
        listType = 'numbered';
      }
      formattedText += `<li>${line.replace(/^\d+\.\s/, '')}</li>`;
    } else {
      // Regular paragraph
      if (isList) {
        formattedText += (listType === 'bullet') ? '</ul>' : '</ol>';
        isList = false;
      }
      formattedText += `<p>${line}</p>`;
    }
  });

  if (isList) {
    formattedText += (listType === 'bullet') ? '</ul>' : '</ol>';
  }

  return formattedText;
}

// Main function to read input file and generate document summary
async function main() {
  try {
    const input = fs.readFileSync("sampleInput.txt", "utf-8");
    const title = "Project Alpha - Kickoff Meeting Agenda";
    await generateOutline(title, input);
  } catch (err) {
    console.error("Error during file processing:", err.message);
  }
}

// Execute the main function
main();
