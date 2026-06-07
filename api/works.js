// /api/works - GET (list/paginate), POST (create), PUT (update by id), DELETE (delete by id)
const { getData, setData, paginate } = require('../lib/kv');
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
  const method = req.method;
  const id = req.query.id;

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

  if (method === 'PUT') {
    const allowed = await requireAuth(req, res);
    if (!allowed) return;
    const works = await getData('works') || [];
    const idx = works.findIndex(w => w.id === id);
    if (idx === -1) return res.status(404).json({ error: '作品不存在' });
    works[idx] = { ...works[idx], ...req.body, id: works[idx].id, updatedAt: new Date().toISOString() };
    await setData('works', works);
    return res.json(works[idx]);
  }

  if (method === 'DELETE') {
    const allowed = await requireAuth(req, res);
    if (!allowed) return;
    const works = await getData('works') || [];
    const idx = works.findIndex(w => w.id === id);
    if (idx === -1) return res.status(404).json({ error: '作品不存在' });
    works.splice(idx, 1);
    await setData('works', works);
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
