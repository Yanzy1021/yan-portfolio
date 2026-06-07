// /api/avatar - GET (public), PUT (auth)
const { getData, setData } = require('../lib/kv');
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const avatar = await getData('avatar');
    return res.json(avatar || {});
  }

  if (req.method === 'PUT') {
    const allowed = await requireAuth(req, res);
    if (!allowed) return;
    const avatar = await getData('avatar') || {};
    const updated = { ...avatar, ...req.body };
    await setData('avatar', updated);
    return res.json(updated);
  }

  res.status(405).json({ error: 'Method not allowed' });
};
