# Backend API Setup for Vercel

The backend needs the Google Service Account credentials to access Google Sheets.

## Quick Fix - Add Environment Variable

1. Go to [Vercel Dashboard](https://vercel.com/muneers-projects-276a49f7/tahcom-api/settings/environment-variables)

2. Add a new environment variable:
   - **Name:** `GOOGLE_SERVICE_ACCOUNT`
   - **Value:** Copy the entire content of your `server/service-account.json` file (the whole JSON object as a single line)
   - **Note:** This file should NOT be committed to git (it's in .gitignore)
   - **Environment:** Production (and Preview if needed)

3. The JSON should be a valid Google Service Account JSON (all on one line, no line breaks)
   - Get it from Google Cloud Console → IAM & Admin → Service Accounts
   - Download the JSON key file
   - Copy the entire content as a single line

4. After adding, redeploy the backend:
   ```bash
   cd server
   vercel --prod
   ```

## Alternative: Include File in Deployment

If you prefer to include the file directly:
1. Make sure `service-account.json` exists locally (it's in `.gitignore` for security)
2. It will be included in the deployment automatically

## Test the API

After adding the environment variable and redeploying, test:
```
https://tahcom-hhakuuyz7-muneers-projects-276a49f7.vercel.app/api/partners/sheets/1Oxn5lrydQ_Gt0rYfwwiqrmf3X_jqbhFZwoAZKwzI6d0
```

This should return the list of sheets.

