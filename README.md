Email Template Generator
This project is a Node.js application that processes a long document (such as a product description, meeting agenda, or newsletter draft) and generates a structured email outline in both JSON and HTML formats. The output is suitable for summarizing content in an email with sections such as subject line, key points, meeting details, and preparation instructions.

Features
Document Parsing: Supports parsing PDF, Markdown, and plain text files.

Email Outline Generation: Converts document content into a structured JSON array for email summarization.

HTML Output: Generates a styled HTML version of the email outline.

API Integration: Uses Google Generative AI (Gemini 2.0 Flash) for content analysis and summarization.

Prerequisites
Before running the project, ensure you have the following:

Node.js (version 16 or higher)

npm (Node Package Manager)

Additionally, you will need a Google API key for the Google Generative AI API. Store this key in an .env file.

Setup
Clone this repository to your local machine:

bash
Copy
Edit
git clone https://github.com/yourusername/email-template-generator.git
cd email-template-generator
Install the required dependencies:

bash
Copy
Edit
npm install
Create a .env file in the root directory with your Google API key:

bash
Copy
Edit
GOOGLE_API_KEY=your_google_api_key_here
Install the necessary external packages for document parsing:

bash
Copy
Edit
npm install pdf-parse marked
Usage
Place the document file you want to process (either a PDF, Markdown, or plain text file) in the project directory.

Run the script with the following command, specifying the file you want to process (e.g., sampleInput.pdf):

bash
Copy
Edit
node index.js sampleInput.pdf
The script will generate two output files:

output.json: A structured JSON file containing the email outline.

output.html: An HTML file containing a styled email template.

If no file is specified, the script will default to using sampleInput.txt.

Structure of Generated JSON
The output JSON will contain an array of objects, where each object represents a section of the email. Each section includes:

title: The title or heading of the section (e.g., "Subject", "Meeting Details").

content: The detailed content for that section (e.g., text, bullet points).

Example:

json
Copy
Edit
[
  {
    "title": "Subject",
    "content": "Meeting Agenda for the Product Launch"
  },
  {
    "title": "Introduction",
    "content": "Dear Team, Please find below the agenda for the upcoming product launch meeting."
  },
  {
    "title": "Agenda Item 1",
    "content": "Introduction of the new product and its features."
  }
]
Structure of Generated HTML
The HTML output will be a well-structured email template containing the same sections as the JSON output. The content is styled with a clean, responsive design suitable for email communication.
