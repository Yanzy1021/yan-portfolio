/**
 * KV Store - 数据读写抽象层
 * Vercel KV（Redis）优先，本地 JSON 文件兜底
 */
const { kv } = require('@vercel/kv');

const KV_KEYS = {
  works: 'portfolio:works',
  articles: 'portfolio:articles',
  tools: 'portfolio:tools',
  avatar: 'portfolio:avatar',
  contact: 'portfolio:contact',
  admin: 'portfolio:admin',
};

async function getData(key) {
  const kvKey = KV_KEYS[key];
  if (!kvKey) return null;
  try {
    const val = await kv.get(kvKey);
    if (val) return val;
  } catch (e) {
    // KV not available, fall through to local file
  }
  // Local fallback (only works in dev / local Node)
  try {
    const fs = require('fs');
    const path = require('path');
    const fp = path.join(__dirname, '..', 'data', key + '.json');
    if (fs.existsSync(fp)) return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch (e) {}
  return null;
}

async function setData(key, data) {
  const kvKey = KV_KEYS[key];
  if (!kvKey) return;
  try {
    await kv.set(kvKey, data);
  } catch (e) {
    // KV not available, fall through to local file
  }
  // Local fallback
  try {
    const fs = require('fs');
    const path = require('path');
    const fp = path.join(__dirname, '..', 'data', key + '.json');
    fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}

function paginate(data, page = 1, limit = 12) {
  const total = data.length;
  const totalPages = Math.ceil(total / limit);
  const p = Math.max(1, parseInt(page) || 1);
  const start = (p - 1) * limit;
  const items = data.slice(start, start + limit);
  return { items, total, page: p, limit, totalPages };
}

module.exports = { getData, setData, paginate, KV_KEYS };
