// /api/articles/[id] - PUT (update), DELETE
const { getData, setData } = require('../lib/kv');
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
  const id = req.query.id;
  const method = req.method;

  if (method === 'PUT') {
    const allowed = await requireAuth(req, res);
    if (!allowed) return;
    const articles = await getData('articles') || [];
    const idx = articles.findIndex(a => a.id === id);
    if (idx === -1) return res.status(404).json({ error: '文章不存在' });
    articles[idx] = { ...articles[idx], ...req.body, id: articles[idx].id, updatedAt: new Date().toISOString() };
    await setData('articles', articles);
    return res.json(articles[idx]);
  }

  if (method === 'DELETE') {
    const allowed = await requireAuth(req, res);
    if (!allowed) return;
    const articles = await getData('articles') || [];
    const idx = articles.findIndex(a => a.id === id);
    if (idx === -1) return res.status(404).json({ error: '文章不存在' });
    articles.splice(idx, 1);
    await setData('articles', articles);
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
