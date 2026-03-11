import axios from "axios";

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { level, subLevel, topic, subject, testType, questionCount } = req.body;

  const prompt = `
You are an expert teacher for ${level} (${subLevel}).

Create a ${questionCount}-question ${testType} quiz about ${topic} in the subject of ${subject}.

Return ONLY JSON in this format:

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
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const content = response.data.choices[0].message.content;

    res.status(200).json(JSON.parse(content));

  } catch (error) {

    console.error("Groq error:", error.response?.data || error.message);

    res.status(500).json({
      error: "AI generation failed"
    });

  }

}