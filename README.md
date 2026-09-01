# 🏏 Tapeball Scorer — Per-Match Ground Scorecard

A production-ready **Tapeball Cricket Scorer** built with React 18, featuring a **Vercel-Hosted Frontend** and a **VPS SQLite Storage API**.

---

## 🌐 Live Production App

* **Live Web App**: [https://tapeball-scorer.vercel.app/](https://tapeball-scorer.vercel.app/)
* **Backend Database API**: Running on your Contabo VPS (`http://169.58.44.255:5000`)
* **Real-Time Live Match Code Sync**: Enter any 4-digit match code to follow ball-by-ball updates in real time on any phone!

---

## ⚡ Ground Scoring Features

1. **⚡ One-Tap Wide (`WD`)**: Adds +1 wide extra without extra popups.
2. **🎯 Streamlined Wickets (`OUT`)**:
   - Bowled / Caught / LBW / Stumped: Instant 1-tap wicket (0 runs completed).
   - Run Out ONLY: Asks who was run out and runs completed (0, 1, 2, 3).
3. **⇄ Manual Striker Swap**: Swap striker and non-striker anytime with 1 tap.
4. **📜 Previous Overs History Log**: View ball-by-ball logs of past completed overs.
5. **🏃 Retired Batsman Support & Recall**: Mark batsmen retired and bring them back out to bat later.
6. **➕ Dynamic One-by-One Player Names**: Type player names on the fly as they step up to bat or bowl.
7. **↺ Undo Button**: Step back any ball or over boundary cleanly.

---

## 📱 Building an Android APK

Use any of these free app builders with your live URL `https://tapeball-scorer.vercel.app/`:

* **Median.co**: [https://median.co](https://median.co) (Custom app icon, splash screen, fullscreen)
* **AppsGeyser**: [https://appsgeyser.com](https://appsgeyser.com)
* **PWABuilder**: [https://www.pwabuilder.com](https://www.pwabuilder.com)
* **Google Bubblewrap CLI**: `npx @bubblewrap/cli init --manifest=https://tapeball-scorer.vercel.app/manifest.json`
