// api/quiz-attempts.js
import { listQuizAttempts, saveQuizAttempt } from '../backend/services/neonService.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { userId, limit } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    try {
      const parsedLimit = Number(limit ?? 20);
      const attempts = await listQuizAttempts(userId, Number.isFinite(parsedLimit) ? parsedLimit : 20);
      return res.status(200).json(attempts);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to load quiz attempts', details: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const savedAttempt = await saveQuizAttempt(req.body);
      return res.status(201).json(savedAttempt);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to save quiz attempt', details: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}