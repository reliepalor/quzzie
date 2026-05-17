import { callGroq } from "../backend/services/groqService.js";

function extractJsonPayload(text) {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return cleaned;
  }

  return cleaned.slice(firstBrace, lastBrace + 1);
}

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { topic, subject, testType, questionCount, level, subLevel, testMode } = req.body;

  const randomSeed = Math.floor(Math.random() * 100000);

  const prompt = `
Random Seed: ${randomSeed}

Generate ${questionCount} ${testType} quiz questions.

Topic: ${topic}
Subject: ${subject}
Level: ${level}
Grade/Year: ${subLevel}
Test Mode: ${testMode || 'learning'}

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

    return res.status(200).json(JSON.parse(extractJsonPayload(text)));

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "AI generation failed"
    });

  }

}