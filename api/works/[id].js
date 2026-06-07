// /api/works/[id] - PUT (update), DELETE
const { getData, setData } = require('../lib/kv');
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
  const id = req.query.id;
  const method = req.method;

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
