#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const contents = fs.readFileSync(envPath, 'utf8');
  const out = {};
  contents.split(/\r?\n/).forEach(line => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const i = t.indexOf('=');
    if (i === -1) return;
    let k = t.slice(0, i);
    let v = t.slice(i + 1);
    if ((v.startsWith("\'") && v.endsWith("\'")) || (v.startsWith('"') && v.endsWith('"'))) v = v.slice(1, -1);
    out[k] = v;
  });
  return out;
}

const env = loadEnv();
const key = env.VITE_GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;
if (!key) {
  console.error('No API key found in .env.local (VITE_GOOGLE_API_KEY) or environment.');
  process.exit(1);
}

async function tryUrl(url) {
  try {
    const res = await fetch(url, { method: 'GET' });
    const text = await res.text();
    console.log('----', url, '->', res.status);
    try {
      console.log(JSON.stringify(JSON.parse(text), null, 2));
    } catch (e) {
      console.log(text);
    }
  } catch (err) {
    console.error('Error fetching', url, err);
  }
}

async function main(){
  // try both v1 and v1beta endpoints
  const base = 'https://generativelanguage.googleapis.com';
  const urls = [
    `${base}/v1/models?key=${encodeURIComponent(key)}`,
    `${base}/v1beta/models?key=${encodeURIComponent(key)}`,
    // also try list using IAM-like format
    `${base}/v1/models`,
    `${base}/v1beta/models`
  ];

  for (const u of urls) {
    await tryUrl(u);
  }
}

main();
