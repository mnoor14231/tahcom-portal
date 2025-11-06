# 🔧 Fix Environment Variable & Data Loading Issue

## Problem 1: Duplicate Environment Variable

You're seeing this error:
> "A variable with the name 'VITE_API_BASE_URL' already exists for the target production"

## ✅ Solution Steps:

### Step 1: Delete the Duplicate Variable
1. In Vercel Dashboard → Environment Variables page
2. Find the **existing** `VITE_API_BASE_URL` variable
3. Click the **Delete icon** (minus sign in circle) next to it
4. Confirm deletion

### Step 2: Add the Correct Variable
1. Click **"+ Add Another"** button
2. **Key:** `VITE_API_BASE_URL`
3. **Value:** `https://tahcom-n78gnlfnq-muneers-projects-276a49f7.vercel.app/api/partners`
4. **Environments:** Check all three:
   - ✅ Production
   - ✅ Preview  
   - ✅ Development
5. Click **"Save"**

### Step 3: Redeploy Frontend
1. Go to: https://vercel.com/muneers-projects-276a49f7/tahcom-kpi-portal
2. Click **"Redeploy"** → **"Redeploy"**
3. Wait 2-3 minutes for deployment

---

## Problem 2: Excel/Google Sheets Data Not Showing

The frontend loads but data doesn't appear. Here's how to fix:

### Step 1: Check Browser Console
1. Open: `https://tahcom-kpi-portal.vercel.app/our-partners`
2. Press **F12** (or right-click → Inspect)
3. Go to **Console** tab
4. Look for errors or logs starting with `[OurPartners]`

**What to look for:**
- ✅ `[OurPartners] Using VITE_API_BASE_URL: ...` - Good!
- ✅ `[OurPartners] ✅ Success with backend X: ...` - Good!
- ❌ `[OurPartners] Trying backend 1/5...` then errors - Backend issue
- ❌ `Failed to fetch` - Connection issue
- ❌ `Permission denied` - Spreadsheet not shared

### Step 2: Verify Spreadsheet is Shared
The spreadsheet must be shared with the service account:

1. Open your Google Sheet: `1Oxn5lrydQ_Gt0rYfwwiqrmf3X_jqbhFZwoAZKwzI6d0`
2. Click **"Share"** button (top right)
3. Add this email: `sheets-writer@gen-lang-client-0250382533.iam.gserviceaccount.com`
4. Give it **"Viewer"** or **"Editor"** access
5. Click **"Send"**

### Step 3: Test Backend Directly
Test if the backend can access your spreadsheet:

Open in browser:
```
https://tahcom-n78gnlfnq-muneers-projects-276a49f7.vercel.app/api/partners/sheets/1Oxn5lrydQ_Gt0rYfwwiqrmf3X_jqbhFZwoAZKwzI6d0
```

**Expected response:**
```json
{
  "sheets": [
    {"id": 0, "title": "Sheet1"},
    {"id": 1, "title": "Solutions"},
    ...
  ]
}
```

**If you see an error:**
- `403 Forbidden` → Spreadsheet not shared (do Step 2)
- `404 Not Found` → Wrong spreadsheet ID
- `500 Error` → Backend issue

### Step 4: Clear Browser Cache
After redeploying:
1. Press **Ctrl + Shift + R** (Windows) or **Cmd + Shift + R** (Mac)
2. This forces a hard refresh

### Step 5: Check Spreadsheet ID
Make sure you're using the correct Google Sheet ID:
- Default: `1Oxn5lrydQ_Gt0rYfwwiqrmf3X_jqbhFZwoAZKwzI6d0`
- The ID is in the Google Sheets URL: `https://docs.google.com/spreadsheets/d/[ID]/edit`

---

## 🧪 Quick Test Checklist

After fixing the environment variable:

- [ ] Environment variable saved without errors
- [ ] Frontend redeployed
- [ ] Browser cache cleared (Ctrl+Shift+R)
- [ ] Spreadsheet shared with service account
- [ ] Backend test URL returns JSON
- [ ] Browser console shows success logs
- [ ] Data appears on the page

---

## 🆘 Still Not Working?

If data still doesn't show after all steps:

1. **Check Browser Console** (F12) for specific error messages
2. **Test Backend URL** directly in browser (Step 3 above)
3. **Verify Spreadsheet ID** is correct
4. **Check Network Tab** (F12 → Network) to see if API calls are failing

Share the error messages you see, and I can help further!

