# Passkey Dashboard

A web application that helps you discover which websites support **Passkey (WebAuthn)** authentication — and which ones don't.

---

## What is this?

Passkey Dashboard lets you search for any website and automatically check whether it supports passwordless login via Passkey. Results are shared across all users, building a growing community-powered list of passkey-supported and non-passkey sites.

---

## How to Use

### 1. Create an Account
Open the app in your browser and click **Sign Up** to create a personal account. Each account has its own search history.

### 2. Search for a Website
On the main dashboard, type the name or URL of a website you're curious about (e.g. `google`, `github`, `naver.com`) and click **Search**.

- If the site has already been discovered by anyone before, it will show up instantly from the database.
- Results are color-coded:
  - **Blue** — the site supports Passkey
  - **Red** — the site does not support Passkey

### 3. Search the Web (Crawling)
If no results are found in the database, a **"Search the Web"** button will appear. Clicking it will automatically visit the website, analyze it for Passkey/WebAuthn support, and save the result to the shared database for everyone.

### 4. View Public Dashboards
At the top of the dashboard, you'll find two shared boards that anyone can view:

- **🔑 Passkey Sites** — all websites confirmed to support Passkey
- **🔒 No Passkey Sites** — all websites confirmed to not support Passkey

These dashboards are updated every time any user runs a web search. You can also filter sites by name or URL directly on each board.

### 5. Your Search History
Every search you run is saved to your personal history on the main dashboard. You can delete individual entries or clear everything at once.

### 6. Settings
Click the **Settings** button in the header to update your username or account details.

---

## Key Points

- Searches are saved **per user** — your history is only visible to you.
- Crawled site results are **shared across all users** — once someone finds a site, everyone benefits.
- The app automatically detects Passkey support by visiting the site's login flow, so no manual input is needed.
