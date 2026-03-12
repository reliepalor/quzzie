import { callGroq } from "../backend/services/groqService.js";

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { topic, level, subLevel } = req.body;

  const prompt = `
You are an educational safety checker.

Topic: "${topic}"
Level: "${level}"
Grade: "${subLevel}"

Return JSON:

{
 "tooAdvanced": boolean,
 "sensitive": boolean,
 "reason": ""
}
`;

  try {

    const text = await callGroq(
      [{ role: "user", content: prompt }],
      0
    );

    const cleaned = text.replace(/```json|```/g, "").trim();

    return res.status(200).json(JSON.parse(cleaned));

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "Topic analysis failed"
    });

  }

}