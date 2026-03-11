import dotenv from "dotenv";
dotenv.config();

import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.post("/api/generate", async (req, res) => {

  const { topic, subject, testType, questionCount, level, subLevel } = req.body;

  const prompt = `
You are an expert teacher.

Generate ${questionCount} ${testType} quiz questions.

Topic: ${topic}
Subject: ${subject}
Level: ${level}
Grade/Year: ${subLevel}

Adjust the difficulty so it is appropriate for the student's level.

Return ONLY JSON:

{
  "quiz":[
    {
      "id":1,
      "question":"",
      "options":["","","",""],
      "answer":"",
      "explanation":""
    }
  ]
}
`;

  try {

    console.log("Groq key loaded:", process.env.GROQ_API_KEY?.slice(0,10));

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const text = response.data.choices[0].message.content;

    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    res.json(JSON.parse(cleaned));

  } catch (error) {

    console.error("Groq error:", error.response?.data || error.message);

    res.status(500).json({
      error: "AI generation failed",
      details: error.response?.data || error.message
    });

  }

});

app.post("/api/check-topic", async (req, res) => {

  const { topic, level, subLevel } = req.body;

  const prompt = `
You are an educational content safety checker.

Analyze the topic for a quiz generator.

Topic: "${topic}"
Level: "${level}"
Grade/Year: "${subLevel}"

Return ONLY JSON:

{
  "tooAdvanced": boolean,
  "sensitive": boolean,
  "reason": "short explanation"
}

Rules:
- tooAdvanced = true if topic is difficult for the grade level
- sensitive = true if topic involves sexual, explicit, violent, or adult material inappropriate for children
`;

  try {

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const text = response.data.choices[0].message.content;
    const cleaned = text.replace(/```json|```/g, "").trim();

    res.json(JSON.parse(cleaned));

  } catch (error) {

    console.error("Topic check error:", error.response?.data || error.message);

    res.status(500).json({
      error: "Topic analysis failed"
    });

  }

});

app.listen(3000, () => {
  console.log("API running on port 3000");
});