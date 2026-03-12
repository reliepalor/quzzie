import axios from "axios";

export async function callGroq(messages, temperature = 1, retries = 3) {
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
          timeout: 60000,
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

      console.warn(`Groq attempt ${attempt} failed`);

      if (isLast || !isRetryable) throw err;

      const delay = Math.pow(2, attempt - 1) * 1000;

      await new Promise((res) => setTimeout(res, delay));

    }
  }
}