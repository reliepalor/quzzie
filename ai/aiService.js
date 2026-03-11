import { generateWithGemini } from "./gemini.js";
import { generateWithDeepSeek } from "./deepseek.js";
import { generateWithOllama } from "./ollama.js";

export async function generateQuiz(prompt) {

  try {
    console.log("Using Gemini...");
    return await generateWithGemini(prompt);
  } catch (err) {
    console.warn("Gemini failed:", err.message);
  }

  try {
    console.log("Using DeepSeek...");
    return await generateWithDeepSeek(prompt);
  } catch (err) {
    console.warn("DeepSeek failed:", err.message);
  }

  try {
    console.log("Using Ollama...");
    return await generateWithOllama(prompt);
  } catch (err) {
    console.error("All AI providers failed");
    throw new Error("AI generation unavailable");
  }

}