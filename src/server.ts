import "dotenv/config";
import express from "express";
import axios from "axios";
import {
  createRateLimitMiddleware,
  validateCheckTopicRequest,
  validateGenerateRequest,
  validateImageRequest
} from "../backend/services/apiSecurity.js";
import { fetchImage } from "../backend/services/imageService.js";

const app = express();
app.use(express.json());
app.use(
  "/api/generate",
  createRateLimitMiddleware({
    key: "server-generate",
    max: 6,
    windowMs: 60_000,
    message: "Too many quiz generation requests. Try again in a minute."
  })
);
app.use(
  "/api/check-topic",
  createRateLimitMiddleware({
    key: "server-check-topic",
    max: 12,
    windowMs: 60_000,
    message: "Too many topic checks. Try again in a minute."
  })
);
app.use(
  "/api/image",
  createRateLimitMiddleware({
    key: "server-image",
    max: 20,
    windowMs: 60_000,
    message: "Too many image lookups. Try again in a minute."
  })
);

function extractJsonPayload(text: string) {
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

app.post("/api/check-topic", async (req, res) => {
  const parsedRequest = validateCheckTopicRequest(req.body);

  if (!parsedRequest.ok) {
    return res.status(400).json({ error: parsedRequest.error });
  }

  const { topic, level, subLevel } = parsedRequest.value;

  const prompt = `
You are an educational safety checker.

Topic: "${topic}"
Level: "${level}"
Grade: "${subLevel}"

Return ONLY JSON:

{
 "tooAdvanced": boolean,
 "sensitive": boolean,
 "reason": ""
}
`;

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0
      },
      {
        headers: {
          Authorization: `Bearer ${process.env["GROQ_API_KEY"]}`,
          "Content-Type": "application/json"
        }
      }
    );

    const aiText = response.data.choices[0].message.content;
    const cleaned = extractJsonPayload(aiText);

    return res.json(JSON.parse(cleaned));
  } catch (error: any) {
    console.error("Topic check error:", error.response?.data || error.message);

    return res.status(500).json({
      error: "Topic analysis failed",
      details: error.message
    });
  }
});

app.post("/api/generate", async (req, res) => {
  const parsedRequest = validateGenerateRequest(req.body);

  if (!parsedRequest.ok) {
    return res.status(400).json({ error: parsedRequest.error });
  }

  const { level, subLevel, topic, subject, testType, questionCount } = parsedRequest.value;

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
        model: "llama-3.3-70b-versatile",
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
    const parsed = JSON.parse(extractJsonPayload(aiText));

    return res.json(parsed);
  } catch (error: any) {
    console.error("Groq error:", error.response?.data || error.message);

    return res.status(500).json({
      error: "AI Generation Failed",
      details: error.message
    });
  }
});

app.get("/api/image", async (req, res) => {
  const parsedRequest = validateImageRequest(req.query["q"], req.query["subject"] || "");

  if (!parsedRequest.ok) {
    return res.status(400).json({ error: parsedRequest.error });
  }

  const { query, subject } = parsedRequest.value;

  try {
    const image = await fetchImage(query, subject);

    return res.status(200).json(image);
  } catch (error: any) {
    console.error("Image lookup error:", error?.message || error);

    return res.json({
      type: "video",
      url: "/images/thinking.mp4"
    });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});