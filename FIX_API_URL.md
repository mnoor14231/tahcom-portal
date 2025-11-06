# 🔧 Fix API URL Issue

The backend URL keeps changing with each Vercel deployment. Here's how to fix it permanently:

## Option 1: Use Vercel Environment Variable (Recommended)

1. **Go to Frontend Project Settings:**
   - Visit: https://vercel.com/muneers-projects-276a49f7/tahcom-kpi-portal/settings/environment-variables

2. **Add Environment Variable:**
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://tahcom-jd6bzo23i-muneers-projects-276a49f7.vercel.app/api/partners`
   - **Environment:** Production, Preview, Development
   - Click "Save"

3. **Redeploy Frontend:**
   ```bash
   cd tahcom-kpi-portal
   vercel --prod
   ```

## Option 2: Use Custom Domain (Best for Production)

1. **Add Custom Domain to Backend:**
   - Go to: https://vercel.com/muneers-projects-276a49f7/tahcom-api/settings/domains
   - Add your custom domain (e.g., `api.tahcom.com`)
   - Update DNS records as instructed

2. **Update Frontend:**
   - Set `VITE_API_BASE_URL` to `https://api.tahcom.com/api/partners`

## Current Backend URL:
**https://tahcom-jd6bzo23i-muneers-projects-276a49f7.vercel.app**

## Test Backend:
Visit: https://tahcom-jd6bzo23i-muneers-projects-276a49f7.vercel.app/api/partners/sheets/1Oxn5lrydQ_Gt0rYfwwiqrmf3X_jqbhFZwoAZKwzI6d0

This should return JSON with your sheets list.

