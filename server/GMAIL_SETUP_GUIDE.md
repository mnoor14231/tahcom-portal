# Gmail OAuth Setup Guide

## Why Gmail Connection Failed

Most likely issue: The redirect URI in Google Cloud Console doesn't match `http://localhost:8787/api/gmail/callback`

Your `.env` file already has Gmail credentials, so this is a Google Cloud configuration issue.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Name it "Tahcom Email Agent" or similar

## Step 2: Enable Gmail API

1. Go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click **Enable**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure OAuth consent screen:
   - User Type: **External** (or Internal if using Google Workspace)
   - App name: "Tahcom Email Agent"
   - User support email: Your email
   - Authorized domains: `localhost` (for testing)
   - Scopes: Add these:
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
   - Test users: Add your Gmail address
   - Save

4. Create OAuth client:
   - Application type: **Web application**
   - Name: "Tahcom Email Agent Web Client"
   - Authorized JavaScript origins: `http://localhost:8787`
   - Authorized redirect URIs: `http://localhost:8787/api/gmail/callback`
   - Create
   - Copy the **Client ID** and **Client Secret**

## Step 4: Create .env File

Create `tahcom-kpi-portal/server/.env`:

```env
# Port
PORT=8787

# Anthropic AI (Claude)
ANTHROPIC_API_KEY=your_claude_api_key_here

# Azure (Outlook) - Already configured
AZURE_CLIENT_ID=340025df-641b-4c08-aa46-de03e37fa089
AZURE_CLIENT_SECRET=your_azure_client_secret_here
AZURE_TENANT_ID=10012acd-cadc-4f9e-9cb6-3216cd349eb9
REDIRECT_URI=http://localhost:8787/api/outlook/callback

# Gmail - ADD THESE
GMAIL_CLIENT_ID=your_gmail_client_id_here
GMAIL_CLIENT_SECRET=your_gmail_client_secret_here
GMAIL_REDIRECT_URI=http://localhost:8787/api/gmail/callback
```

## Step 5: Restart Server

```powershell
cd C:\Users\hp\Desktop\tahcom1\tahcom-kpi-portal\server
npm start
```

## Step 6: Test Connection

1. Open your app → **Agents** → **Email Expert**
2. Click **Connect Gmail**
3. Sign in with your Gmail account
4. Grant permissions
5. Should see "Connected" ✅

## Troubleshooting

### "Failed to connect"
- Make sure `.env` file exists in `server/` directory
- Check Gmail credentials are correct
- Verify server is running on port 8787

### "Redirect URI mismatch"
- In Google Cloud Console, ensure redirect URI is exactly: `http://localhost:8787/api/gmail/callback`
- No trailing slashes!

### "Error 403: access_denied"
- Add your Gmail as a test user in OAuth consent screen
- Wait a few minutes for changes to propagate

### Still having issues?
1. Check server terminal for error messages
2. Open browser console (F12) for client errors
3. Verify both servers are running (frontend on 5173, backend on 8787)

