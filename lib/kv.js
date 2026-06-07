/**
 * Data Store - 数据读写抽象层
 * Upstash Redis（Vercel 官方推荐）优先，本地 JSON 文件兜底
 */
const { Redis } = require('@upstash/redis');

const REDIS_KEYS = {
  works: 'portfolio:works',
  articles: 'portfolio:articles',
  tools: 'portfolio:tools',
  avatar: 'portfolio:avatar',
  contact: 'portfolio:contact',
  admin: 'portfolio:admin',
};

// Lazy-init Redis client
let _redis = null;
function getRedis() {
  if (_redis) return _redis;
  // Support both Vercel KV variables and Upstash Redis variables
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (url && token) {
    _redis = new Redis({ url, token });
    return _redis;
  }
  return null;
}

// -------- Public API --------

async function getData(key) {
  const redisKey = REDIS_KEYS[key];
  if (!redisKey) return null;

  // Try Redis first
  const redis = getRedis();
  if (redis) {
    try {
      const val = await redis.get(redisKey);
      if (val !== null && val !== undefined) {
        // Upstash Redis REST returns string; parse if needed
        return typeof val === 'string' ? JSON.parse(val) : val;
      }
    } catch (e) {
      console.warn('[Redis] get failed, falling back to local file:', e.message);
    }
  }

  // Local fallback (dev / local Node)
  try {
    const fs = require('fs');
    const path = require('path');
    const fp = path.join(__dirname, '..', 'data', key + '.json');
    if (fs.existsSync(fp)) return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch (e) {}
  return null;
}

async function setData(key, data) {
  const redisKey = REDIS_KEYS[key];
  if (!redisKey) return;

  // Write to Redis first
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(redisKey, JSON.stringify(data));
      return;
    } catch (e) {
      console.warn('[Redis] set failed, falling back to local file:', e.message);
    }
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

module.exports = { getData, setData, paginate, REDIS_KEYS };
