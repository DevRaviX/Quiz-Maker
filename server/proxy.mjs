import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

// Load .env.local if present
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const dotenv = fs.readFileSync(envPath, 'utf8');
  dotenv.split(/\r?\n/).forEach(line => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const i = t.indexOf('=');
    if (i === -1) return;
    let k = t.slice(0, i);
    let v = t.slice(i + 1);
    if ((v.startsWith("\'") && v.endsWith("\'")) || (v.startsWith('"') && v.endsWith('"'))) v = v.slice(1, -1);
    process.env[k] = v;
  });
}

const API_KEY = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;
if (!API_KEY) {
  console.error('No Google API key found. Set GOOGLE_API_KEY or VITE_GOOGLE_API_KEY in .env.local or environment.');
  // we'll still start server but return 500 for generate calls
}

const DEFAULT_MODEL = 'models/gemini-2.5-flash';

const app = express();
app.use(bodyParser.json({ limit: '1mb' }));

// Simple CORS for local development
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.post('/api/generate', async (req, res) => {
  try {
    if (!API_KEY) return res.status(500).json({ error: 'Server not configured with API key.' });
    const { prompt, model } = req.body || {};
    if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Missing prompt string in request body.' });

    const modelName = model || DEFAULT_MODEL;
    const client = new GoogleGenAI(API_KEY);
    const genModel = client.getGenerativeModel({ model: modelName });
    const response = await genModel.generateContent(prompt);
    const text = response?.response?.text ? response.response.text() : '';
    return res.json({ text });
  } catch (err) {
    console.error('Proxy generate error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

// Export handler for Vercel serverless
export default app;

// For local development only
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 5174;
  app.listen(port, () => {
    console.log(`AI proxy server listening on http://localhost:${port}`);
  });
}
