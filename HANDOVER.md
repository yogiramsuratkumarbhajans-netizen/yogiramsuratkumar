# Namabank Project Handover Documentation

**Date:** January 18, 2026
**Project:** Namavruksha - Divine Name Bank

---

## 1. Credentials & Configuration

### A. Appwrite (Backend)
- **Project Name:** Namabank
- **Project ID:** `6953d1b2000e392719c6`
- **Database ID:** `6953dc6900395adffa8c`
- **Endpoint:** `https://nyc.cloud.appwrite.io/v1`

### B. Email Service (Brevo/Sendinblue)
- **Sender Email:** `yogiramsuratkumarbhajans@gmail.com`
- **API Key:** `[STORED IN .env FILE - DO NOT COMMIT]` (Configured in `src/services/emailService.js`)

### C. Admin Panels
- **Super Admin Login:** `/admin/login`
- **Moderator Login:** `/moderator/login`
- **Default Admin Password:** `namabank2024` (Hardcoded for specific usernames like 'admin', 'admin1')

---

## 2. Issue Resolution Summary

| Issue ID | Description | Status | Fix Details |
|----------|-------------|--------|-------------|
| 01 | Subdomain Updates & Links | Fixed | Added links to English/Tamil subdomains in Landing Page footer. Fixed IST timezone handling and Tamil header transliteration. |
| 02 & 06 | Invest Nama Dates & Devotees | Fixed | `namaService.js` now respects user selected `startDate`. Added `batch_id` to group entries - devotee count stored only on first entry per batch. |
| 03 | Registration Email | Fixed | Implemented proper email notification using Brevo API in `emailService.js`. |
| 04 | Bulk Upload Failures | Fixed | Enhanced error reporting in Admin/Moderator dashboards using `window.alert` for detailed feedback. |
| 05 | Default Feedback Failures | Fixed | Added robust error handling in `DashboardPage.jsx` to catch missing Appwrite collection errors. |
| 07 | Nama Audio Counting | Fixed | Added debounce logic in `AudioPlayerPage.jsx` to prevent rapid/duplicate count increments. |
| 08 | Landing Page Links | Fixed | Added Divyavani English & Tamil links to Landing Page. |

---

## 3. Subdomain Deployment (Issue 01)

The project consists of three parts:
1. **Main App:** `namabank-main` (React + Appwrite)
2. **Tamil Subdomain:** `yrsk-tamil` (React + Firestore)
3. **English Subdomain:** `yrsk-english` (React + Firestore)

### How to Build & Deploy (RAR Generation)
To generate the production build files (RAR content):

1. **Main App:**
   ```bash
   cd namabank-main/namabank-main
   npm i
   npm run build
   # The 'dist' folder contains the files to be zipped/RARed
   ```

2. **Tamil Subdomain:**
   ```bash
   cd namabank-main/namabank-main/yrsk-tamil
   npm i
   npm run build
   # Zip/RAR the 'dist' folder
   ```

3. **English Subdomain:**
   ```bash
   cd namabank-main/namabank-main/yrsk-english
   npm i
   npm run build
   # Zip/RAR the 'dist' folder
   ```

---

## 4. Mobile App Plan (Issue 10)

**Target:** Simple Android Mobile App
**Timeline:** February 2026
**Requirements:**
- Wrapper app for the existing web platform (WebView/PWA) OR a native interface for Nama Investment.
- Key features: Login, Invest Nama, Audio Player.
- **Action Item:** Consult with Mr. Balaji for detailed requirements in Feb.

---

## 5. Important Notes

- **Feedback Collection:** If "Suggest Sankalpa" fails, ensure the `feedback` collection exists in your Appwrite Database with ID: `feedback`.
- **Email Quota:** Brevo free tier allows 300 emails/day. If usage exceeds this, registration emails may fail.

🙏 **Yogi Ramsuratkumar Jaya Guru Raya!**
