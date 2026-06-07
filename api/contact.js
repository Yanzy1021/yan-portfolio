// /api/contact - GET (public), PUT (auth)
const { getData, setData } = require('../lib/kv');
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const contact = await getData('contact');
    return res.json(contact || {});
  }

  if (req.method === 'PUT') {
    const allowed = await requireAuth(req, res);
    if (!allowed) return;
    const contact = await getData('contact') || {};
    const updated = { ...contact, ...req.body };
    await setData('contact', updated);
    return res.json(updated);
  }

  res.status(405).json({ error: 'Method not allowed' });
};
