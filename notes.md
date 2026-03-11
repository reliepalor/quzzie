🏗️ 1. Project Architecture (The "All-in-One" Vercel Setup)

Instead of a separate backend, we use Vercel Serverless Functions. This allows you to deploy the entire project from a single GitHub repository for free.

Frontend: Angular 19 (hosted as a static site).

Backend API: Node.js Functions (located in the /api folder).

AI Engine: Gemini 2.0 Flash (chosen for its speed and massive 1M token window for reading notes).

🎨 2. The User Journey (MVP Stepper)

We will build a 3-Step UI in Angular to make the configuration simple.

Step 1: Identity & Level

The user picks their academic stage. Selecting a level dynamically reveals the specific grade/year.

Elementary: Buttons for Grade 1 to Grade 6.

High School: Buttons for Grade 7 to Grade 10.

Senior High: Buttons for Grade 11 to Grade 12.

College: Buttons for 1st Year to 4th Year.

Step 2: Source & Topic

The user chooses how the AI gets its information:

Option A (AI Knowledge): User types a topic (e.g., "Civil War") and picks a subject (Math, Science, etc.).

Option B (File Upload): User uploads a PDF/TXT. Angular reads this file as a Base64 string to send to the API.

Step 3: Quiz Style

Type: Multiple Choice, Enumeration (Identification), or True/False.

Length: A slider for 5, 10, or 20 questions.

🛠️ 3. The Technical Core

The Angular Logic (Dynamic Grades)

Use Angular Signals to track the selected level and filter the grade options instantly.

TypeScript



// Example Logic

levels = {

  Elementary: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],

  HighSchool: ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'],

  // ... more

};

selectedLevel = signal('Elementary');

availableGrades = computed(() => this.levels[this.selectedLevel()]);

The AI Prompt (The Teacher Persona)

Your Vercel function will send a structured "System Instruction" to Gemini.

"You are an expert educator. Generate a [TestType] quiz for [GradeLevel]. If notes are provided, use only the notes. If not, use general academic standards for that grade. Return ONLY JSON."

The JSON Structure

By forcing Gemini into JSON Mode, your app can easily grade the "Enumeration" part by comparing the user's text to the correctAnswer key in the JSON object.

🚀 4. Deployment & Security

Environment Variables: Your Gemini API Key is stored in the Vercel Dashboard, not the code.

File Limits: Since Vercel has a 4.5MB request limit, we add a check in Angular: if (file.size > 4 * 1024 * 1024) alert('File too large!');

CORS: Vercel automatically handles the communication between your Angular frontend and its own /api folder.

📈 5. Summary Table

CategoryMVP SpecsNameQuizzieStackAngular 19 + Node.js (Vercel)Cost$0.00Max PDF Size4MB (approx. 500 pages of text)Test TypesMCQ, Enumeration, True/FalseGemini Modelgemini-2.0-flash