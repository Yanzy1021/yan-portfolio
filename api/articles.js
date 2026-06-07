// /api/articles - GET (list/paginate), POST (create)
const { getData, setData, paginate } = require('../lib/kv');
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
  const method = req.method;
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

  res.status(405).json({ error: 'Method not allowed' });
};
