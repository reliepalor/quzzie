import { callGroq } from "../backend/services/groqService.js";

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { topic, subject, testType, questionCount, level, subLevel } = req.body;

  const randomSeed = Math.floor(Math.random() * 100000);

  const prompt = `
Random Seed: ${randomSeed}

Generate ${questionCount} ${testType} quiz questions.

Topic: ${topic}
Subject: ${subject}
Level: ${level}
Grade/Year: ${subLevel}

Requirements:
- Each question must use different scenarios
- iconKeyword → simple object name
- imageQuery → realistic image search phrase

Return ONLY JSON:

{
 "quiz":[
  {
   "id":1,
   "question":"",
   "iconKeyword":"",
   "imageQuery":"",
   "options":["","","",""],
   "answer":"",
   "explanation":""
  }
 ]
}
`;

  try {

    const text = await callGroq(
      [{ role: "user", content: prompt }],
      1
    );

    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return res.status(200).json(JSON.parse(cleaned));

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "AI generation failed"
    });

  }

}