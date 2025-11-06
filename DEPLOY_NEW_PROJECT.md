# 🚀 Deploy New Project: "tahcom portal"

## Steps to Deploy Fresh Project

### Step 1: Delete Old Project in Vercel (You Do This)

1. Go to: https://vercel.com/muneers-projects-276a49f7/tahcom-kpi-portal
2. Click **Settings** (top right)
3. Scroll down to **"Delete Project"**
4. Type the project name to confirm
5. Click **"Delete"**

### Step 2: Create GitHub Repository (If Not Exists)

1. Go to: https://github.com/new
2. Repository name: `tahcom-portal` (or `tahcom-kpi-portal`)
3. **Don't** check "Initialize with README"
4. Click **"Create repository"**

### Step 3: Push Code to GitHub

Run these commands:

```powershell
cd C:\Users\hp\Desktop\tahcom1
git remote remove origin  # Remove old remote if exists
git remote add origin https://github.com/mnoor14231/tahcom-portal.git
git push -u origin master
```

### Step 4: Create New Vercel Project

1. Go to: https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select your GitHub repository (`tahcom-portal`)
4. **Project Name**: `tahcom-portal` (or `tahcom-portal` as you prefer)
5. **Framework Preset**: Vite
6. **Root Directory**: `./tahcom-kpi-portal` (if repo is in parent folder)
   OR leave blank if repo root is the project
7. Click **"Deploy"**

### Step 5: Set Environment Variables

After deployment, go to:
- Project Settings → Environment Variables
- Add: `VITE_API_BASE_URL` = `https://tahcom-dpk99s20u-muneers-projects-276a49f7.vercel.app/api/partners`
- Apply to: Production, Preview, Development
- Click **"Save"**
- **Redeploy** after setting env vars

### Step 6: Verify Deployment

1. Wait for build to complete
2. Open the new project URL
3. Test: `https://tahcom-portal.vercel.app/our-partners`
4. Clear browser cache and test

---

## Alternative: Deploy via CLI with New Name

If you want me to deploy via CLI with a new project name:

```bash
cd tahcom-kpi-portal
npx vercel --name tahcom-portal
```

This will create a new project automatically.

