# 🔧 Backend URL Solution

## The Problem
Vercel generates a new URL for each deployment, which breaks the frontend connection. The production domain (`tahcom-kpi-portal.vercel.app`) may not have the environment variable set, causing it to use an outdated fallback URL.

## ✅ Solution Applied (Updated)

1. **Intelligent Backend URL Detection:**
   - Code now automatically detects the backend URL based on the current domain
   - For production domain, uses the most recent known backend URL
   - For preview domains, tries to construct the backend URL from the frontend URL pattern
   - Has multiple fallback URLs to try if the primary one fails

2. **Known Backend URLs (in order of preference):**
   - `https://tahcom-n78gnlfnq-muneers-projects-276a49f7.vercel.app` (most recent)
   - `https://tahcom-72tghbv3h-muneers-projects-276a49f7.vercel.app`
   - `https://tahcom-jd6bzo23i-muneers-projects-276a49f7.vercel.app`
   - `https://tahcom-hhakuuyz7-muneers-projects-276a49f7.vercel.app`
   - `https://tahcom-c3m1ufewd-muneers-projects-276a49f7.vercel.app` (old)

3. **Environment Variable (Recommended):**
   - Set `VITE_API_BASE_URL` in Vercel dashboard for the frontend project
   - This takes priority over automatic detection
   - Go to: Vercel Dashboard → Frontend Project → Settings → Environment Variables
   - Add: `VITE_API_BASE_URL` = `https://[CURRENT-BACKEND-URL]/api/partners`
   - Apply to: Production, Preview, Development
   - **Important:** After setting, you must redeploy the frontend for the change to take effect

## 🎯 Best Long-Term Solution

### Option 1: Use Custom Domain (Recommended)
1. Go to Vercel Dashboard → Backend Project → Settings → Domains
2. Add a custom domain (e.g., `api.tahcom.com`)
3. Update `VITE_API_BASE_URL` to use the custom domain
4. This URL will never change!

### Option 2: Use Production Domain
Vercel provides a stable production domain. Check:
- Backend: https://vercel.com/muneers-projects-276a49f7/tahcom-api/settings/domains
- Look for the production domain (not preview URLs)

## 🧪 Test Backend

Test these endpoints (using most recent backend):
- Health: https://tahcom-n78gnlfnq-muneers-projects-276a49f7.vercel.app/health
- Test: https://tahcom-n78gnlfnq-muneers-projects-276a49f7.vercel.app/api/partners/test
- Sheets: https://tahcom-n78gnlfnq-muneers-projects-276a49f7.vercel.app/api/partners/sheets/1Oxn5lrydQ_Gt0rYfwwiqrmf3X_jqbhFZwoAZKwzI6d0

**To find the current backend URL:**
1. Go to Vercel Dashboard → Backend Project
2. Check the latest deployment URL
3. Use that URL in the environment variable

## 📝 When Backend URL Changes

If you redeploy the backend and get a new URL:

1. **Update Environment Variable:**
   ```bash
   cd tahcom-kpi-portal
   vercel env rm VITE_API_BASE_URL production --yes
   echo "https://NEW-BACKEND-URL/api/partners" | vercel env add VITE_API_BASE_URL production
   ```

2. **Update Fallback in Code (if needed):**
   - Edit `src/pages/OurPartners.tsx`
   - Update the `knownBackendUrls` array (add new URL at the beginning)
   - The code will automatically use the most recent URL

3. **Redeploy Frontend:**
   ```bash
   npm run build
   vercel --prod
   ```

## 🔍 Troubleshooting Production Domain Issue

If `https://tahcom-kpi-portal.vercel.app/our-partners` shows connection errors:

1. **Check Environment Variable:**
   - Go to Vercel Dashboard → `tahcom-kpi-portal` project → Settings → Environment Variables
   - Verify `VITE_API_BASE_URL` is set for **Production** environment
   - If not set, add it with the current backend URL + `/api/partners`
   - **Redeploy** the frontend after setting/updating the variable

2. **Verify Backend is Accessible:**
   - Test the backend health endpoint directly in browser
   - Check browser console (F12) for which backend URL is being used
   - Look for logs: `[OurPartners] Using fallback URL:` or `[OurPartners] Using VITE_API_BASE_URL:`

3. **If Environment Variable is Set but Not Working:**
   - Vite environment variables are baked into the build at build time
   - You must **rebuild and redeploy** after changing environment variables
   - Clear browser cache (Ctrl+Shift+R) after redeploy

## ✅ Current Status

- ✅ **Intelligent backend URL detection implemented**
- ✅ **Automatic retry mechanism** - tries multiple backends if first fails
- ✅ **Mobile-optimized** - works reliably on phones even without env var
- ✅ Multiple fallback URLs configured (5 known backends)
- ✅ Automatic domain-based detection
- ✅ 10-second timeout per backend attempt
- ⚠️ **Still recommended:** Set `VITE_API_BASE_URL` in Vercel for optimal performance
- ✅ CORS enabled
- ✅ Google Sheets service account configured

**How It Works:**
1. Tries the primary backend URL (from env var or detection)
2. If that fails, automatically tries 4 other known backend URLs
3. Logs which backend worked in console
4. Works seamlessly for mobile users

**Next Steps:**
1. Find the current backend URL in Vercel dashboard
2. Set `VITE_API_BASE_URL` environment variable for production (recommended)
3. Redeploy the frontend
4. Test at `https://tahcom-kpi-portal.vercel.app/our-partners`
5. **The app will work even without step 2, but step 2 is recommended for best performance**

