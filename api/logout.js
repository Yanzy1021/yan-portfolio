// POST /api/logout
const { removeToken } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  await removeToken(req);
  res.json({ success: true });
};
