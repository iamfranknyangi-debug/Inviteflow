# 🎉 InviteFlow — Quick Start Guide

## ✅ Step 1: Install Docker Desktop (One Time Only)

Docker is the only thing you need to install. It runs everything for you.

| Your Computer | Download Link |
|--------------|---------------|
| **Windows**  | https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe |
| **Mac (Intel)**   | https://desktop.docker.com/mac/main/amd64/Docker.dmg |
| **Mac (Apple M1/M2/M3)** | https://desktop.docker.com/mac/main/arm64/Docker.dmg |
| **Ubuntu Linux** | `sudo apt install docker.io docker-compose` |

After installing, **open Docker Desktop** and wait until you see the whale icon 🐋 in your taskbar/menu bar turn green.

---

## ✅ Step 2: Extract the ZIP

Unzip the file `inviteflow-complete-system.zip` to any folder on your laptop, for example:
- Windows: `C:\Users\YourName\inviteflow\`
- Mac: `/Users/YourName/inviteflow/`

---

## ✅ Step 3: Launch InviteFlow

### Windows
Double-click the file:
```
START-WINDOWS.bat
```

### Mac / Linux
Open Terminal, go to the folder, and run:
```bash
bash START-MAC-LINUX.sh
```

Or in Terminal:
```bash
cd /path/to/inviteflow
docker-compose up --build
```

**First launch takes 3–5 minutes** (downloading and building). After that it starts in under 30 seconds.

---

## ✅ Step 4: Open the App

Once running, open your browser and go to:

## 👉 http://localhost:3000

| Field    | Value      |
|----------|------------|
| Username | `admin`    |
| Password | `admin123` |

---

## 🛑 To Stop the App

### Windows: Double-click `STOP-WINDOWS.bat`
### Mac/Linux: Run `bash STOP.sh` or press `Ctrl+C` in Terminal

Your data (guests, events, etc.) is **saved automatically** and will be there next time you start.

---

## 🔄 To Start Again (After First Time)

Just run the start script again. No need to rebuild — it starts in ~15 seconds.

Or from Terminal:
```bash
docker-compose up
```

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|---------|
| "Docker not found" | Install Docker Desktop from the link above |
| "Docker not running" | Open Docker Desktop app and wait for green icon |
| Page won't load at localhost:3000 | Wait 2 more minutes — first build is slow |
| "Port already in use" | Another app is using port 3000 or 5000. Close it or restart PC |
| Login doesn't work | Make sure you're at http://localhost:3000 (not https) |
| Forgot password | Run: `docker-compose exec db psql -U inviteflow_user -d inviteflow -c "UPDATE users SET password='\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniMGaJ7A9UE9K6GBVbxOJfVQi' WHERE username='admin';"` — resets to `admin123` |

---

## 📱 SMS Setup (Optional — for real invitations)

By default the system runs in **demo mode** — everything works but SMS messages are not actually sent.

To send real SMS messages to guests:
1. Sign up free at [africastalking.com](https://africastalking.com)
2. Open `docker-compose.yml` in Notepad
3. Change these lines:
   ```
   AT_API_KEY:     your_actual_key_here
   AT_USERNAME:    your_username_here
   AT_ENVIRONMENT: production
   ```
4. Restart: `docker-compose restart backend`

---

## 🌐 Access from Other Devices on Your Network

If you want to access InviteFlow from your phone or another laptop on the same WiFi:

1. Find your computer's local IP:
   - Windows: open CMD → type `ipconfig` → look for IPv4 Address (e.g. `192.168.1.5`)
   - Mac: System Settings → Network → look for IP Address

2. On your phone, open browser and go to:
   `http://192.168.1.5:3000` (use your actual IP)

---

*Powered by Node.js · React · PostgreSQL · Docker*
