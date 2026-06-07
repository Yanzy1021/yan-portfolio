// /api/articles - GET (list/paginate), POST (create), PUT (update by id), DELETE (delete by id)
const { getData, setData, paginate } = require('../lib/kv');
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
  const method = req.method;
  const id = req.query.id;

  if (method === 'GET') {
    const articles = await getData('articles') || [];
    if (req.query.page) {
      const result = paginate(articles, req.query.page, parseInt(req.query.limit) || 12);
      return res.json({
        items: result.items, total: result.total,
        page: result.page, limit: result.limit, totalPages: result.totalPages
      });
    }
    return res.json(articles);
  }

  if (method === 'POST') {
    const allowed = await requireAuth(req, res);
    if (!allowed) return;
    const articles = await getData('articles') || [];
    const article = {
      id: Date.now().toString(),
      title: req.body.title || '',
      date: req.body.date || '',
      summary: req.body.summary || '',
      image: req.body.image || '',
      icon: req.body.icon || '✱',
      link: req.body.link || '',
      createdAt: new Date().toISOString()
    };
    articles.push(article);
    await setData('articles', articles);
    return res.json(article);
  }

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
