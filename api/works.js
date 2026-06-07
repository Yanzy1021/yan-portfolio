// /api/works - GET (list/paginate), POST (create)
const { getData, setData, paginate } = require('../lib/kv');
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
  const method = req.method;
  if (method === 'GET') {
    const works = await getData('works') || [];
    if (req.query.page) {
      const result = paginate(works, req.query.page, parseInt(req.query.limit) || 12);
      return res.json({
        items: result.items, total: result.total,
        page: result.page, limit: result.limit, totalPages: result.totalPages
      });
    }
    return res.json(works);
  }

  if (method === 'POST') {
    const allowed = await requireAuth(req, res);
    if (!allowed) return;
    const works = await getData('works') || [];
    const work = {
      id: Date.now().toString(),
      title: req.body.title || '',
      description: req.body.description || '',
      image: req.body.image || '',
      link: req.body.link || '',
      createdAt: new Date().toISOString()
    };
    works.push(work);
    await setData('works', works);
    return res.json(work);
  }

  res.status(405).json({ error: 'Method not allowed' });
};
