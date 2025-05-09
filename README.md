# Smart Email Template Generator using Gemini & LangChain

This Node.js application extracts structured email outlines from unstructured documents (PDF, Markdown, or plain text) using Google Gemini Pro (`gemini-2.0-flash`) and LangChain's prompt orchestration. The tool outputs both a JSON structure for the email sections and a styled HTML email template.

---

## 🚀 Features

- 📄 Parses PDF, Markdown, and TXT files
- 🧠 Uses Google Gemini via LangChain to extract structured summaries
- 📬 Outputs:
  - A clean **JSON** email outline
  - A beautiful **HTML** email template
- 🎯 Tailored for use cases like:
  - Meeting invites
  - Newsletters
  - Product announcements

---

## 🛠️ Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/your-username/email-template-generator.git
cd email-template-generator
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set your Google Generative AI API key

Create a `.env` file in the root directory and add:

```env
GOOGLE_API_KEY=your_google_genai_api_key_here
```

> 🔑 Get your API key from [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)

---

## 📂 Usage

### Run the script with a document file path:

```bash
node index.js path/to/your/document.pdf
```

If no path is provided, it defaults to `sampleInput.txt`.

### Supported formats:

- `.pdf`
- `.md`
- `.txt`

### Output:

- ✅ `output.json` – structured email outline
- ✅ `output.html` – styled HTML email template

---

## 📦 Example Output

### JSON (output.json)

```json
[
  {
    "title": "Subject",
    "content": "Weekly Team Sync"
  },
  {
    "title": "Introduction",
    "content": "This email summarizes the upcoming weekly sync meeting."
  },
  {
    "title": "Agenda",
    "content": "- Updates from each department\n- Q&A session\n- Planning next week"
  },
  {
    "title": "RSVP",
    "content": "Please confirm your attendance by EOD."
  }
]
```

### HTML (output.html)

A polished, mobile-friendly HTML email with:
- Proper headers and section formatting
- Modern fonts and layout
- Styled call-to-action (CTA)

---

## 🧠 How It Works

1. **Input Parsing**:
   - Detects file type (`.pdf`, `.md`, `.txt`)
   - Extracts text accordingly using:
     - `pdf-parse` for PDFs
     - `marked` for Markdown
     - `fs.readFileSync` for text

2. **Prompt Construction**:
   - Uses LangChain's `PromptTemplate` to format a task prompt for Gemini
   - Sends it to Gemini Pro via `ChatGoogleGenerativeAI` LLM wrapper

3. **Output Generation**:
   - Gemini returns a structured email breakdown
   - Parsed into:
     - `output.json` for logical structure
     - `output.html` for visual presentation

---

## 🔧 File Structure

```
.
├── index.js             # Main entry point
├── output.json          # Final structured output (auto-generated)
├── output.html          # HTML email output (auto-generated)
├── sampleInput.txt      # Sample input file
├── .env                 # API key (not committed)
├── .gitignore           # Node modules, env, outputs
└── README.md            # This file
```

---

## ✨ Tech Stack

- 💬 [LangChain JS](https://js.langchain.com/)
- 🤖 [Google Generative AI (Gemini)](https://ai.google.dev/)
- 📦 `pdf-parse`, `marked`, `dotenv`, `fs`
- 🖥️ Node.js
- 🎨 HTML/CSS (for email formatting)

---

## 🧪 Sample Run

```bash
node index.js sampleInput.txt
```

This will generate:
- `output.json`: structured outline
- `output.html`: styled email preview

---

## 📜 License

MIT License — use, share, and modify freely.

---

## 👨‍💻 Author

Built by Abhay Revankar

---

> Note: This tool uses Google Gemini via API and may incur usage limits or costs.
