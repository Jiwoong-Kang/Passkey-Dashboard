# Passkey Dashboard

A web application that helps you discover which websites support **Passkey (WebAuthn)** authentication natively, through a third-party identity provider, or not at all.

> For technical details, see the individual docs:
> - [Frontend README](./frontend/README.md) — React app structure, pages, and services
> - [Backend README](./backend/README.md) — API endpoints, crawler, and data models

---

## What is this?

Passkey Dashboard lets you search for any website and automatically check whether it supports passwordless login via Passkey. Results are shared across all users, building a growing community-powered list of native passkey sites, third-party passkey sites, and sites with no detected passkey support.

---

## How to Use

### 1. Create an Account
Open the app in your browser and click **Sign Up** to create a personal account. Each account has its own search history.

### 2. Search for a Website
On the main dashboard, type the name or URL of a website you're curious about (e.g. `google`, `github`, `naver.com`) and click **Search**.

- If the site has already been discovered by anyone before, it will show up instantly from the database.
- Results are color-coded:
  - **Blue** — the site exposes **native passkey** support
  - **Amber** — the site exposes **third-party passkey** support
  - **Red** — no passkey support was detected

### 3. Search the Web (Crawling)
If no results are found in the database, a **"Search the Web"** button will appear. Clicking it will automatically visit the website, analyze it for Passkey/WebAuthn support, and save the result to the shared database for everyone.

### 4. View Public Dashboards
At the top of the dashboard, you'll find three shared boards that anyone can view:

- **🔑 Native Passkey** — passkey detected on the same site or same-brand auth domain
- **🔗 3rd Party Passkey** — passkey detected on an external IdP or auth domain
- **🔒 No Passkey** — no passkey support detected

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
- Detection is stored with a `passkeyType` classification: `native`, `third-party`, or `none`.
