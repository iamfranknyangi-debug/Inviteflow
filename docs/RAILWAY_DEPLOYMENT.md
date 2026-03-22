# 🚂 Deploy InviteFlow on Railway — Step by Step Guide

**Total time: about 10–15 minutes**
**Cost: FREE**
**Result: Your app live at a URL like https://inviteflow-production.up.railway.app**

---

## BEFORE YOU START — Create a GitHub Account

Railway deploys from GitHub. If you don't have one:
1. Go to **https://github.com**
2. Click **Sign up** — it's free
3. Verify your email

---

## PHASE 1 — Upload Your Code to GitHub (5 minutes)

### Step 1: Create a New Repository on GitHub
1. Go to **https://github.com/new**
2. Fill in:
   - **Repository name:** `inviteflow`
   - **Visibility:** Private ✅ (keep your code private)
3. Click **"Create repository"**

### Step 2: Upload your files
1. On the new repo page, click **"uploading an existing file"**
2. **Drag and drop** the entire `inviteflow` folder contents into the upload area
   - Upload ALL files including: `backend/`, `frontend/`, `database/`, `docker-compose.yml`, etc.
3. Scroll down, click **"Commit changes"**
4. Wait for upload to finish (may take 1–2 minutes)

---

## PHASE 2 — Set Up Railway (5 minutes)

### Step 3: Create Railway Account
1. Go to **https://railway.app**
2. Click **"Login"**
3. Choose **"Login with GitHub"** — this links your GitHub automatically
4. Authorize Railway when asked

### Step 4: Create a New Project
1. Click **"New Project"**
2. Click **"Deploy from GitHub repo"**
3. Select your **`inviteflow`** repository
4. Click **"Deploy Now"**

Railway will start building — but we need to add the database first!

---

## PHASE 3 — Add Database & Redis (3 minutes)

### Step 5: Add PostgreSQL Database
1. In your Railway project, click **"+ New"**
2. Click **"Database"**
3. Click **"Add PostgreSQL"**
4. Wait ~30 seconds — database is ready! ✅

### Step 6: Add Redis
1. Click **"+ New"** again
2. Click **"Database"**
3. Click **"Add Redis"**
4. Wait ~20 seconds — Redis is ready! ✅

---

## PHASE 4 — Configure Environment Variables (3 minutes)

### Step 7: Set Backend Variables
1. Click on your **backend service** (the one from your GitHub repo)
2. Click the **"Variables"** tab
3. Click **"RAW Editor"** and paste ALL of these:

```
NODE_ENV=production
PORT=5000
JWT_SECRET=inviteflow_super_secret_jwt_key_railway_2025_change_me
QR_SECRET=inviteflow_super_secret_qr_key_railway_2025_change_me
AT_API_KEY=
AT_USERNAME=sandbox
AT_ENVIRONMENT=sandbox
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
```

4. For the database variables, Railway adds these **automatically** when you add PostgreSQL:
   - `DATABASE_URL` — already set ✅

   But you also need to add these manually (copy from your PostgreSQL service Variables tab):
   ```
   DB_HOST=${{Postgres.PGHOST}}
   DB_PORT=${{Postgres.PGPORT}}
   DB_NAME=${{Postgres.PGDATABASE}}
   DB_USER=${{Postgres.PGUSER}}
   DB_PASSWORD=${{Postgres.PGPASSWORD}}
   REDIS_URL=${{Redis.REDIS_URL}}
   ```

5. Click **"Save"**

### Step 8: Get Your Backend URL
1. Click on your backend service
2. Click **"Settings"** tab
3. Under **"Networking"** → click **"Generate Domain"**
4. You'll get a URL like: `https://inviteflow-api-production.up.railway.app`
5. **Copy this URL** — you need it for Step 9

### Step 9: Set the Frontend URL Variable
1. Click on your **backend service** → Variables
2. Add these two more variables:
   ```
   APP_URL=https://YOUR-BACKEND-URL.up.railway.app
   FRONTEND_URL=https://YOUR-FRONTEND-URL.up.railway.app
   QR_BASE_URL=https://YOUR-FRONTEND-URL.up.railway.app/verify
   ```
   (replace with your actual Railway URLs)

---

## PHASE 5 — Set Up the Database Schema (2 minutes)

### Step 10: Run the Database Schema
1. Click on your **PostgreSQL** service
2. Click the **"Query"** tab (or "Connect")
3. Copy the entire contents of `database/schema.sql`
4. Paste it into the query box
5. Click **"Run"** or **"Execute"**

This creates all the tables and the default admin account.

---

## PHASE 6 — Deploy Frontend (2 minutes)

### Step 11: Add Frontend as Separate Service
1. Click **"+ New"** → **"GitHub Repo"**
2. Select `inviteflow` again
3. This time, set the **Root Directory** to `/frontend`
4. Add this environment variable:
   ```
   REACT_APP_API_URL=https://YOUR-BACKEND-URL.up.railway.app/api
   ```
   (use the backend URL from Step 8)
5. Click **"Deploy"**

### Step 12: Generate Frontend Domain
1. Click your frontend service → Settings → Networking
2. Click **"Generate Domain"**
3. You get your app URL: `https://inviteflow-production.up.railway.app`

---

## 🎉 YOU'RE LIVE!

Open your frontend URL in any browser:

```
https://YOUR-FRONTEND-URL.up.railway.app
```

| Username | `admin`    |
|----------|------------|
| Password | `admin123` |

**Share this URL with anyone — they can access it from any device, anywhere!**

---

## ❓ Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails | Check the "Logs" tab in Railway for the error |
| Can't connect to database | Make sure DB_ variables are set correctly |
| Frontend shows blank page | Check that REACT_APP_API_URL points to your backend |
| Login fails | Make sure schema.sql was run successfully |
| App is slow first load | Normal — free tier "sleeps" after 10 min of inactivity |

---

## 💰 Railway Free Tier Limits

| Resource | Free Limit |
|----------|-----------|
| Hours | 500 hours/month |
| RAM | 512 MB per service |
| Storage | 1 GB |
| Bandwidth | 100 GB |

This is **more than enough** for running InviteFlow for a single organization.

---

## 🔒 Change Your Password!

After logging in for the first time, go to your profile and change the password from `admin123` to something secure!
