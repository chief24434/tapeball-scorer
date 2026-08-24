# 🏏 Tapeball Scorer & 3-Team Tournament System

A production-ready **Tapeball Cricket Scorer & Tournament Management System** built with React 18, featuring a **Repo-Hosted Frontend** (Vercel/GitHub Pages) and a **VPS SQLite Storage API**.

---

## 🏗️ Architecture Overview

* 🌐 **Frontend**: Hosted on GitHub / Vercel / Netlify (Free 24/7 HTTPS access on any mobile device).
* 🖥️ **Backend & Database**: Runs on your VPS (`vps_backend.py` + `tapeball.db` SQLite database).
* 🔄 **Real-Time Multi-Device Sync**: Any player opening the app on their phone sees live score updates and tournament standings synchronized via the VPS API.

---

## 🚀 Step 1: Deploy Frontend to GitHub / Vercel

1. **Create a Git Repository & Push Code**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Tapeball Scorer & Tournament App"
   git remote add origin https://github.com/YOUR_USERNAME/tapeball-scorer.git
   git push -u origin main
   ```

2. **Deploy for Free on Vercel or GitHub Pages**:
   * **Vercel**: Import your `tapeball-scorer` GitHub repo on [Vercel](https://vercel.com). It will deploy instantly and give you a free link like `https://tapeball-scorer.vercel.app`.
   * **GitHub Pages**: Go to Repo Settings -> Pages -> Source: `main` branch -> Save.

---

## 🖥️ Step 2: Run Backend on Your VPS

1. Upload `vps_backend.py` to your VPS server.
2. Run the server:
   ```bash
   python3 vps_backend.py
   ```
3. *(Optional)* Run in background using `nohup` or `screen`:
   ```bash
   nohup python3 vps_backend.py > vps.log 2>&1 &
   ```
   *The server runs on port **5000** with full CORS enabled for your frontend.*

---

## ⚙️ Step 3: Connect Frontend to VPS Storage

1. Open your hosted app link (e.g. `https://tapeball-scorer.vercel.app`) on your phone or PC.
2. Click **`⚙️ Configure VPS Backend`** in the top right header.
3. Enter your VPS server URL (e.g. `http://YOUR_VPS_IP:5000`) and click **Save & Sync**.
4. The status badge will change to **`🟢 VPS Sync Active`**.

All tournaments, player stats, and live matches will now be permanently saved to your VPS SQLite database and synced live across all players' phones!
