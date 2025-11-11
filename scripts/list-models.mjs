import util from 'util';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  // load .env.local into process.env for convenience
  const contents = fs.readFileSync(envPath, 'utf8');
  contents.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq);
    let val = trimmed.slice(eq + 1);
    // strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  });
}

const key = process.env.VITE_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;
if (!key) {
  console.error('No API key found in process.env.VITE_GOOGLE_API_KEY or .env.local');
  process.exit(1);
}

async function main(){
  try{
    const client = new GoogleGenerativeAI(key);
    console.log('Client created. Inspecting available list APIs...');

    if (typeof client.listModels === 'function'){
      const res = await client.listModels();
      console.log('listModels result:');
      console.log(util.inspect(res, { depth: 4, colors: true }));
      return;
    }

    if (client.models && typeof client.models.list === 'function'){
      const res = await client.models.list();
      console.log('models.list result:');
      console.log(util.inspect(res, { depth: 4, colors: true }));
      return;
    }

    // fallback: try calling a generate to get a hint (but safer to list)
    console.log('No listModels API found. Dumping client keys:');
    console.log(Object.keys(client));
  }catch(err){
    console.error('Error while listing models:', err);
    process.exitCode = 2;
  }
}

main();
