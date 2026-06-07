/**
 * seed.js - 初始化 Vercel KV 数据
 * 用法: npx vercel env pull .env.local && node seed.js
 *
 * 将本地 data/*.json 的数据导入 Vercel KV
 */
const { kv } = require('@vercel/kv');
const fs = require('fs');
const path = require('path');

const KV_KEYS = {
  works: 'portfolio:works',
  articles: 'portfolio:articles',
  tools: 'portfolio:tools',
  avatar: 'portfolio:avatar',
  contact: 'portfolio:contact',
  admin: 'portfolio:admin',
};

async function seed() {
  console.log('开始导入数据到 Vercel KV...\n');

  for (const [key, kvKey] of Object.entries(KV_KEYS)) {
    const fp = path.join(__dirname, 'data', key + '.json');
    if (!fs.existsSync(fp)) {
      console.log(`  跳过 ${key}.json（文件不存在）`);
      continue;
    }
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    await kv.set(kvKey, data);
    console.log(`  ${key}: ${JSON.stringify(data).length} bytes -> ${kvKey}`);
  }

  console.log('\n导入完成！');
}

seed().catch(err => {
  console.error('导入失败:', err.message);
  process.exit(1);
});
