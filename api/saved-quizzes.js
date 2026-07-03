// api/saved-quizzes.js
import { listSavedQuizzes, saveQuizBookmark } from '../backend/services/neonService.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    try {
      const savedQuizzes = await listSavedQuizzes(userId);
      return res.status(200).json(savedQuizzes);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to load saved quizzes', details: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const savedQuiz = await saveQuizBookmark(req.body);
      return res.status(201).json(savedQuiz);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to save quiz bookmark', details: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}