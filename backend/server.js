import dotenv from "dotenv";
dotenv.config();

import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
const imageCache = new Map();

app.use(cors());
app.use(express.json());

// ─── Groq helper with retry logic ────────────────────────────────────────────
async function callGroq(messages, temperature = 1, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.3-70b-versatile",
          messages,
          temperature,
          max_tokens: 4096,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 60000, // 60 second timeout
          // Keep-alive to prevent ECONNRESET
          httpAgent: new (await import("http")).Agent({ keepAlive: true }),
          httpsAgent: new (await import("https")).Agent({ keepAlive: true }),
        }
      );
      return response.data.choices[0].message.content;
    } catch (err) {
      const isLast = attempt === retries;
      const isRetryable =
        err.code === "ECONNRESET" ||
        err.code === "ETIMEDOUT" ||
        err.code === "ECONNABORTED" ||
        err.response?.status === 429 ||
        err.response?.status >= 500;

      console.warn(`Groq attempt ${attempt} failed: ${err.code || err.response?.status}`);

      if (isLast || !isRetryable) throw err;

      // Exponential backoff: 1s, 2s, 4s...
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

// ─── /api/generate ────────────────────────────────────────────────────────────
app.post("/api/generate", async (req, res) => {
  const { topic, subject, testType, questionCount, level, subLevel } = req.body;
  const randomSeed = Math.floor(Math.random() * 100000);

  const prompt = `
    Random Seed: ${randomSeed}
    You are a creative Student Teacher who are generating a

    Generate ${questionCount} ${testType} quiz questions.

    Topic: ${topic}
    Subject: ${subject}
    Level: ${level}
    Grade/Year: ${subLevel}

    Requirements:
    - Each question must use a different scenario.
    - Do NOT repeat the same story in different questions, try different thing that is align with the chosen subject/topic.
    - Use different objects that is align with the level.
    - Use simple words for Elementary level, and increase the the meaning if its highschool to College to Anyone.      
    iconKeyword → simple object name
    imageQuery → realistic image search phrase

    Example:

    {
    "iconKeyword":"computer",
    "imageQuery":"computer programming code screen"
    }

    Return ONLY JSON with no markdown, no backticks, no explanation:

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
    console.log("Groq key loaded:", process.env.GROQ_API_KEY?.slice(0, 10));

    const text = await callGroq([{ role: "user", content: prompt }], 1);

    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    res.json(JSON.parse(cleaned));
  } catch (error) {
    const status = error.response?.status;
    const code = error.code;

    console.error("Groq error:", code || status, error.response?.data || error.message);

    if (status === 429) {
      return res.status(429).json({ error: "Rate limited. Please wait and try again." });
    }

    if (code === "ECONNRESET" || code === "ETIMEDOUT") {
      return res.status(503).json({
        error: "AI service connection dropped. Please try again.",
        details: code,
      });
    }

    res.status(500).json({
      error: "AI generation failed",
      details: error.response?.data || error.message,
    });
  }
});

// ─── /api/check-topic ─────────────────────────────────────────────────────────
app.post("/api/check-topic", async (req, res) => {
  const { topic, level, subLevel } = req.body;

  const prompt = `
You are an educational content safety checker.

Analyze the topic for a quiz generator.

Topic: "${topic}"
Level: "${level}"
Grade/Year: "${subLevel}"

Return ONLY JSON with no markdown, no backticks:

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
    const text = await callGroq([{ role: "user", content: prompt }], 0);
    const cleaned = text.replace(/```json|```/g, "").trim();
    res.json(JSON.parse(cleaned));
  } catch (error) {
    console.error("Topic check error:", error.response?.data || error.message);
    res.status(500).json({ error: "Topic analysis failed" });
  }
});

// ─── /api/image ───────────────────────────────────────────────────────────────
app.get("/api/image", async (req, res) => {
  try {
    let query = req.query.q;
    const subject = req.query.subject || "";

    if (!query) {
      return res.status(400).json({ error: "Missing query" });
    }

    query = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(" ")
      .slice(0, 4)
      .join(" ");

    console.log("Image search:", query, "| subject:", subject);

    // Try Wikimedia first
    try {
      const wiki = await axios.get("https://en.wikipedia.org/w/api.php", {
        params: {
          action: "query",
          generator: "search",
          gsrsearch: query,
          gsrlimit: 1,
          prop: "pageimages",
          piprop: "original",
          format: "json",
        },
        timeout: 8000,
      });

      const pages = wiki.data?.query?.pages;
      if (pages) {
        const page = Object.values(pages)[0];
        if (page?.original?.source) {
          console.log("✅ Wikimedia hit");
          return res.json({ type: "image", url: page.original.source });
        }
      }
    } catch (e) {
      console.log("❌ Wikimedia failed:", e.message);
    }

    // Try Unsplash
    try {
      const unsplash = await axios.get("https://api.unsplash.com/photos/random", {
        params: { query, orientation: "landscape" },
        headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
        timeout: 8000,
      });

      if (unsplash.data?.urls?.small) {
        console.log("✅ Unsplash hit");
        return res.json({ type: "image", url: unsplash.data.urls.small });
      }
    } catch (e) {
      console.log("❌ Unsplash failed:", e.message);
    }

    console.log("⚠️ All image sources failed, using fallback");
    return res.json({ type: "video", url: "/images/thinking.mp4" });
  } catch (error) {
    console.error("Image fetch error:", error.response?.data || error.message);
    return res.json({ type: "video", url: "/images/thinking.mp4" });
  }
});

app.listen(3000, () => {
  console.log("API running on port 3000");
});
