// GET /api/check-auth
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const allowed = await requireAuth(req, res);
  if (!allowed) return;
  res.json({ valid: true, username: 'admin' });
};
