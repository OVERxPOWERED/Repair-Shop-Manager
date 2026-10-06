# Render Keep-Awake & Cold-Start Runbook

> Architecture, root cause analysis, and setup instructions to eliminate Render free tier cold-start delays.

---

## 1. Why Data Loading & Startup Were Slow

### The 4 Root Causes Identified
1. **Render Free Tier Spin-Down (15-Minute Inactivity Window)**:
   - Render automatically suspends (spins down) free web services after **15 minutes** of no HTTP traffic.
   - When a user opens the app after 15 minutes of inactivity, Render must provision a container, pull the image, boot Gunicorn/Django, and connect to PostgreSQL.
   - This cold start takes between **50 to 90 seconds**.

2. **The Previous GitHub Actions Keep-Awake Workflow Failed on Cold Starts (Exit Code 28)**:
   - In `.github/workflows/keep-awake.yml`, the curl command was configured with:
     ```bash
     STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 "${API_URL}/health/")
     ```
   - When Render was asleep, the wake-up took >60s. Curl reached the 60-second limit and exited with **exit code 28 (`CURLE_OPERATION_TIMEDOUT`)**.
   - Under `bash -e`, the non-zero exit code terminated the GitHub Action workflow as a failure (`X`) before Render could finish waking up.

3. **GitHub Actions Scheduled Crons Have High Jitter / Queue Delays**:
   - GitHub Actions explicitly states that scheduled workflows (`cron: ...`) on public and free repositories run on a best-effort basis. During peak hours, runs are frequently delayed by **20 to 50 minutes** or skipped entirely.
   - Because Render sleeps after only 15 minutes, any delay over 15 minutes resulted in Render going to sleep anyway.

4. **Frontend Splash Screen Masked Cold-Start Status**:
   - When opening the browser app, `SessionBoot.tsx` showed a static "Setting things up..." splash screen while awaiting `/auth/me/`.
   - The `<ServerWakeBanner />` was placed inside `SessionBoot`, meaning while the app was stuck waiting 60s for Render to wake up, the wake banner was never visible.
   - The user only saw a static spinner with no indication that the cloud server was spinning up.

---

## 2. Solutions Implemented

### A. Resilient GitHub Actions Workflow (`.github/workflows/keep-awake.yml`)
- **Increased Timeout**: Extended from 60s to **120s** to give cold containers sufficient time to boot.
- **Retry Logic & Error Trapping**: Curl timeouts and connection errors no longer crash `bash -e`; the script retries up to 2 times with a 10s backoff and cleanly logs progress.
- **Operating Hours**: Scheduled `*/10 2-17 * * *` (7:30 AM to 11:30 PM IST), consuming ~496 hours/month (well within Render's 750 free monthly hours).

### B. Transparent Frontend UX
- **Live Splash Feedback**: `SessionBoot.tsx` connects to `useServerWakeStore`. When the server takes >4s, the splash screen displays:
  - An animated spinner.
  - "Waking up the server… this can take up to a minute".
  - A reassuring explanation that Render free tier is spinning up from idle mode.
  - 100% translated across English, Hindi, and Hinglish.
- **Global Sticky Banner**: `<ServerWakeBanner />` slides in on any subsequent slow query (>4s) across all app pages.

---

## 3. Recommended External Uptime Ping (Zero-Cold-Start Setup)

Because GitHub Actions crons are subject to GitHub scheduling delays, the industry standard practice for Render free tier is to configure a dedicated free ping monitor.

### Option 1: UptimeRobot (Recommended — 24/7 Warmth, 2-Minute Setup)
UptimeRobot pings from external edge nodes on strict 5-minute schedules with zero delay.

1. Create a free account at [https://uptimerobot.com](https://uptimerobot.com).
2. Click **+ Add New Monitor**.
3. Fill in the following fields:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `FixPro Backend Health`
   - **URL (or IP)**: `https://fixpro-api.onrender.com/api/v1/health/`
   - **Monitoring Interval**: `5 minutes` (or `10 minutes`)
   - **Monitor Timeout**: `60 seconds` (or default)
4. Click **Create Monitor**.

> **Note on Render Free Hours**:
> Render gives **750 free hours/month**.
> A 31-day month has 744 hours ($31 \times 24 = 744$).
> A single free web service kept alive 24/7 consumes 744 hours, staying just within the 750 free hours threshold!

---

### Option 2: cron-job.org (Scheduled Shop Hours Only — Preserves Free Hours)
If you run multiple services on your Render account and want to conserve hours so it only stays awake during shop operating hours (e.g., 7:30 AM to 11:30 PM IST):

1. Create a free account at [https://cron-job.org](https://cron-job.org).
2. Click **Create Cronjob**.
3. Configure:
   - **Title**: `FixPro Keep Awake`
   - **URL**: `https://fixpro-api.onrender.com/api/v1/health/`
   - **Schedule**: Every 10 minutes.
   - **Hours**: Select UTC hours `02:00` through `18:00` (corresponds to 7:30 AM to 11:30 PM IST).
   - **Days**: Monday through Sunday.
4. Click **Save**.

This consumes only ~496 hours/month, leaving 254 free hours on your Render account.
