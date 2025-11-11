# Deployment Guide - Vercel

Your Quiz-Maker app is now configured for one-click deployment to Vercel! 🚀

## Steps to Deploy

### 1. **Create Vercel Account** (if you don't have one)
   - Visit [vercel.com](https://vercel.com)
   - Sign up with GitHub (recommended - you're already using GitHub!)
   - No credit card required for hobby projects

### 2. **Import Your Repository**
   - On Vercel dashboard, click **"Add New..."** → **"Project"**
   - Select **"Import Git Repository"**
   - Find and select your **Quiz-Maker** repo
   - Click **"Import"**

### 3. **Configure Environment Variables**
   - In the **"Environment Variables"** section, add:
     - **Name**: `VITE_GOOGLE_API_KEY`
     - **Value**: Your Google Generative AI API key (from `.env.local`)
   - Click **"Add"**

### 4. **Deploy**
   - Click **"Deploy"**
   - Vercel will:
     - Build your Vite app
     - Deploy the Express proxy as serverless functions
     - Provide a live URL (e.g., `https://quiz-maker-xyz.vercel.app`)

### 5. **Access Your Live App**
   - Visit the URL provided by Vercel
   - Your app is now live! 🎉

---

## After Deployment

### Security Notes
⚠️ **Important**: Your API key is stored securely in Vercel's encrypted environment variables and is never exposed in the browser.

### Monitor & Logs
- View deployment logs: Vercel Dashboard → Your Project → **"Deployments"** tab
- Check function logs: Click on any deployment → **"Functions"** tab

### Updates
- Any push to `main` branch auto-deploys
- Previous deployments are available via **"Deployments"** history

### Custom Domain (Optional)
1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Update DNS records as instructed by Vercel

---

## Troubleshooting

**❌ Build fails?**
- Check that `package.json` has all dependencies
- Verify `npm run build` works locally: `npm run build`

**❌ API calls fail with 404?**
- Ensure environment variable `VITE_GOOGLE_API_KEY` is set in Vercel
- Check proxy server logs in Vercel dashboard

**❌ API key not working?**
- Verify your Google API key is valid (test locally first)
- Ensure key has Generative AI API enabled in Google Cloud Console

---

## Local Development (Unchanged)
```bash
# Start dev server + proxy locally
npm run dev              # Vite frontend (port 3000)
node server/proxy.mjs    # Proxy server (port 5174, in another terminal)
```

---

**Need help?** Check Vercel docs: https://vercel.com/docs
