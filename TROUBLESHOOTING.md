# 🔧 Troubleshooting Guide - Backend Connection

## ✅ Latest Deployment (Updated)

**Frontend:**
https://tahcom-kpi-portal-nbxsum1jn-muneers-projects-276a49f7.vercel.app/our-partners

**Backend:**
https://tahcom-n78gnlfnq-muneers-projects-276a49f7.vercel.app

**Environment Variable:**
`VITE_API_BASE_URL` = `https://tahcom-n78gnlfnq-muneers-projects-276a49f7.vercel.app/api/partners`

---

## 🧪 How to Test

### Step 1: Test Backend Directly
Open these URLs in your browser:

1. **Health Check:**
   https://tahcom-n78gnlfnq-muneers-projects-276a49f7.vercel.app/health
   - Should return: `{"ok":true,"timestamp":"..."}`

2. **Test Endpoint:**
   https://tahcom-n78gnlfnq-muneers-projects-276a49f7.vercel.app/api/partners/test
   - Should return: `{"ok":true,"message":"Partners API is working",...}`

3. **Sheets Endpoint:**
   https://tahcom-n78gnlfnq-muneers-projects-276a49f7.vercel.app/api/partners/sheets/1Oxn5lrydQ_Gt0rYfwwiqrmf3X_jqbhFZwoAZKwzI6d0
   - Should return your sheets list

### Step 2: Test Frontend
1. Open: https://tahcom-kpi-portal-nbxsum1jn-muneers-projects-276a49f7.vercel.app/our-partners
2. Open Browser Console (F12)
3. Look for these logs:
   ```
   [OurPartners] Using VITE_API_BASE_URL: https://...
   [OurPartners] Final API_BASE: https://...
   [OurPartners] Fetching from: https://...
   [OurPartners] Response status: 200 OK
   [OurPartners] Received data: {...}
   ```

### Step 3: Check for Errors
If you see errors in the console:
- **"Failed to fetch"** → Backend not accessible or CORS issue
- **"404 Not Found"** → Wrong API URL
- **"403 Forbidden"** → Google Sheets permission issue
- **"500 Internal Server Error"** → Backend error (check logs)

---

## 🐛 Common Issues

### Issue 1: "Failed to fetch"
**Cause:** Backend URL changed or not accessible

**Solution:**
1. Check the latest backend URL in Vercel dashboard
2. Update environment variable:
   ```bash
   cd tahcom-kpi-portal
   vercel env rm VITE_API_BASE_URL production --yes
   echo "https://NEW-BACKEND-URL/api/partners" | vercel env add VITE_API_BASE_URL production
   ```
3. Update fallback URL in `src/pages/OurPartners.tsx` (line 41)
4. Redeploy frontend:
   ```bash
   npm run build
   vercel --prod
   ```

### Issue 2: Environment Variable Not Working
**Cause:** Vite needs env vars at build time

**Solution:**
1. Check env var is set in Vercel dashboard
2. Rebuild and redeploy (env vars are baked into the build)
3. Clear browser cache (Ctrl+Shift+R)

### Issue 3: CORS Error
**Cause:** Backend not allowing frontend origin

**Solution:**
- Backend already has CORS enabled (`origin: true`)
- If still failing, check backend logs

### Issue 4: Google Sheets Permission Error
**Cause:** Service account not shared with spreadsheet

**Solution:**
1. Open your Google Sheet
2. Click "Share" button
3. Add: `sheets-writer@gen-lang-client-0250382533.iam.gserviceaccount.com`
4. Give it "Viewer" or "Editor" access

---

## 🎯 Permanent Solution: Custom Domain

To avoid URL changes:

1. **Add Custom Domain to Backend:**
   - Go to: https://vercel.com/muneers-projects-276a49f7/tahcom-api/settings/domains
   - Add domain (e.g., `api.tahcom.com`)
   - Update DNS as instructed

2. **Update Environment Variable:**
   ```bash
   vercel env rm VITE_API_BASE_URL production --yes
   echo "https://api.tahcom.com/api/partners" | vercel env add VITE_API_BASE_URL production
   ```

3. **Update Code Fallback:**
   - Edit `src/pages/OurPartners.tsx`
   - Change `backendUrl` to your custom domain

4. **Redeploy:**
   ```bash
   npm run build
   vercel --prod
   ```

---

## 📊 Debug Information

The frontend now logs detailed information:
- API URL being used
- Environment variables
- Full error details
- Request/response status

**Check Browser Console (F12) for:**
- `[OurPartners] Using VITE_API_BASE_URL: ...`
- `[OurPartners] Final API_BASE: ...`
- `[OurPartners] Fetching from: ...`
- `[OurPartners] Response status: ...`
- `[OurPartners] Full error details: ...` (if error)

---

## ✅ Current Status

- ✅ Backend deployed: `tahcom-n78gnlfnq-muneers-projects-276a49f7.vercel.app`
- ✅ Environment variable set
- ✅ Frontend deployed: `tahcom-kpi-portal-nbxsum1jn-muneers-projects-276a49f7.vercel.app`
- ✅ CORS enabled
- ✅ Error logging improved
- ✅ Debug information added

**Test the app now and check the browser console for detailed logs!**

