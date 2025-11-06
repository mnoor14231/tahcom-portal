# ⚠️ IMPORTANT: Add Google Service Account to Vercel

The backend API needs Google credentials to access your Google Sheets.

## Steps to Fix:

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/muneers-projects-276a49f7/tahcom-api/settings/environment-variables

2. **Add Environment Variable:**
   - Click "Add New"
   - **Key:** `GOOGLE_SERVICE_ACCOUNT`
   - **Value:** Copy the ENTIRE content from your Google Service Account JSON file (all on one line, no line breaks)
   - **Note:** Get the JSON from Google Cloud Console → IAM & Admin → Service Accounts → Create/Download key
   - **Important:** This file should NOT be committed to git (it's in .gitignore)
   - **Environment:** Select "Production" (and "Preview" if you want)
   - Click "Save"

3. **Redeploy Backend:**
   ```bash
   cd server
   vercel --prod
   ```

4. **Test:**
   - Visit: https://tahcom-hhakuuyz7-muneers-projects-276a49f7.vercel.app/api/partners/sheets/1Oxn5lrydQ_Gt0rYfwwiqrmf3X_jqbhFZwoAZKwzI6d0
   - Should return JSON with sheets list

## How to Get Service Account JSON:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: IAM & Admin → Service Accounts
3. Create a new service account or select existing one
4. Click "Keys" → "Add Key" → "Create new key" → JSON
5. Download the JSON file
6. Copy the ENTIRE content (all on one line, no line breaks)
7. Paste it as the value for `GOOGLE_SERVICE_ACCOUNT` in Vercel

After adding this, the backend will be able to access Google Sheets and the data will show on your phone!

