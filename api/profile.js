// api/profile.js
import { getProfile, upsertProfile } from '../backend/services/neonService.js';

export default async function handler(req, res) {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  if (req.method === 'GET') {
    try {
      const profile = await getProfile(userId);
      if (!profile) return res.status(404).json({ error: 'Profile not found' });
      return res.status(200).json(profile);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to load profile', details: error.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const payload = {
        user_id: userId,
        display_name: typeof req.body?.display_name === 'string' ? req.body.display_name : null,
        avatar_url: typeof req.body?.avatar_url === 'string' ? req.body.avatar_url : null,
        created_at: typeof req.body?.created_at === 'string' ? req.body.created_at : new Date().toISOString(),
      };
      const profile = await upsertProfile(payload);
      return res.status(200).json(profile);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to save profile', details: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}