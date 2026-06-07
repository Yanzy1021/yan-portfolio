/**
 * seed.js - 初始化 Upstash Redis 数据
 * 用法: 设置 UPSTASH_REDIS_REST_URL 和 UPSTASH_REDIS_REST_TOKEN 环境变量后运行 node seed.js
 *
 * 将本地 data/*.json 的数据导入 Upstash Redis
 */
const { Redis } = require('@upstash/redis');
const fs = require('fs');
const path = require('path');

const REDIS_KEYS = {
  works: 'portfolio:works',
  articles: 'portfolio:articles',
  tools: 'portfolio:tools',
  avatar: 'portfolio:avatar',
  contact: 'portfolio:contact',
  admin: 'portfolio:admin',
};

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

async function seed() {
  console.log('开始导入数据到 Upstash Redis...\n');

  for (const [key, redisKey] of Object.entries(REDIS_KEYS)) {
    const fp = path.join(__dirname, 'data', key + '.json');
    if (!fs.existsSync(fp)) {
      console.log(`  跳过 ${key}.json（文件不存在）`);
      continue;
    }
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    await redis.set(redisKey, JSON.stringify(data));
    console.log(`  ${key}: ${JSON.stringify(data).length} bytes -> ${redisKey}`);
  }

  console.log('\n导入完成！');
}

seed().catch(err => {
  console.error('导入失败:', err.message);
  process.exit(1);
});
