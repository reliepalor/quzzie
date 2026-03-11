import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

app.post("/api/generate", async (req, res) => {

  const { level, subLevel, topic, subject, testType, questionCount } = req.body;

  const prompt = `
You are an expert teacher for ${level} (${subLevel}).

Create a ${questionCount}-question ${testType} quiz about ${topic} in ${subject}.

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

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-70b-versatile",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${process.env["GROQ_API_KEY"]}`,
          "Content-Type": "application/json"
        }
      }
    );

    const aiText = response.data.choices[0].message.content;

    const parsed = JSON.parse(aiText);

    res.json(parsed);

  } catch (error: any) {

    console.error("Groq error:", error.response?.data || error.message);

    res.status(500).json({
      error: "AI Generation Failed",
      details: error.message
    });

  }

});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});