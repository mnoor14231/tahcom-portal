# Test These Endpoints

## 1. Health Check (Basic API Status)
https://tahcom-api.vercel.app/health

Should return: `{"ok":true,"backend":"tahcom-api-server",...}`

## 2. Google Sheets Diagnostic (Check Configuration)
https://tahcom-api.vercel.app/api/partners/diagnose

This will show:
- Is Google Sheets initialized?
- Service account email
- Any initialization errors
- Instructions on what to fix

## 3. Test Partners API
https://tahcom-api.vercel.app/api/partners/test

Should show if the API is working and Google Sheets status

## 4. Get Sheets List (Requires Spreadsheet ID)
https://tahcom-api.vercel.app/api/partners/sheets/1Oxn5lrydQ_Gt0rYfwwiqrmf3X_jqbhFZwoAZKwzI6d0

Replace the ID with your actual spreadsheet ID

## What to Check:
1. Visit the `/api/partners/diagnose` endpoint first
2. Check if Google Sheets is initialized
3. If not, check the error message
4. Make sure the spreadsheet is shared with: sheets-writer@gen-lang-client-0250382533.iam.gserviceaccount.com

