# Passkey Dashboard — Backend

Express.js backend server for the Passkey Dashboard application. Handles authentication, web crawling, link storage, and search history.

---

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `backend/` folder:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_random_secret_key
PORT=5001
NODE_ENV=development
```

- **MONGODB_URI**: Your MongoDB Atlas connection string  
  Format: `mongodb+srv://username:password@cluster.mongodb.net/dbname`
- **JWT_SECRET**: Any random secure string. Generate one with:  
  ```bash
  openssl rand -base64 32
  ```
- **PORT**: Defaults to `5001`. The frontend is configured to call this port.

### 3. Run the Server

Development mode (auto-restarts on file changes):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Server runs at: `http://localhost:5001`

---

## Project Structure

```
backend/
├── config/
│   └── db.js              # MongoDB connection
├── middleware/
│   └── auth.js            # JWT verification middleware
├── models/
│   ├── User.js            # User account model
│   ├── Link.js            # Discovered site model (passkey type + crawl metadata)
│   └── SearchHistory.js   # Per-user search history model
├── routes/
│   ├── auth.js            # Signup / Login
│   ├── user.js            # User profile
│   ├── links.js           # Site search, crawling, public dashboards
│   └── search.js          # Search history
├── services/
│   ├── crawler.js         # Main Playwright-based Passkey detection orchestrator
│   └── crawler/           # Modular crawler helpers (detectors, frames, popups, auth flow)
├── .env                   # Environment variables (you must create this)
├── package.json
└── server.js              # App entry point
```

---

## API Endpoints

All endpoints marked **(auth)** require a `Bearer` token in the `Authorization` header.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create a new account |
| POST | `/api/auth/login` | Login and receive a JWT token |

**Signup / Login body:**
```json
{ "username": "yourname", "password": "yourpassword" }
```

**Login response:**
```json
{ "token": "<jwt>", "user": { "id": "...", "username": "..." } }
```

---

### User Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/profile` | Get current user's profile **(auth)** |
| PUT | `/api/user/profile` | Update username **(auth)** |

---

### Links (Sites)

Sites are stored globally and shared across all users. Each site keeps both a legacy `hasPasskey` boolean and richer crawl metadata:

- `native` — passkey signal detected on the same site / same-brand domain
- `third-party` — passkey signal detected on an external IdP or auth domain
- `none` — no passkey support detected

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/links/search?query=` | Search all sites by keyword **(auth)** |
| GET | `/api/links/passkey` | Get all native-passkey sites **(auth)** |
| GET | `/api/links/third-party` | Get all third-party-passkey sites **(auth)** |
| GET | `/api/links/no-passkey` | Get all non-passkey sites **(auth)** |
| POST | `/api/links/crawl` | Crawl a website and save result **(auth)** |
| GET | `/api/links` | Get all sites (paginated) **(auth)** |
| GET | `/api/links/:id` | Get a single site by ID **(auth)** |
| POST | `/api/links` | Manually add a site **(auth)** |
| PUT | `/api/links/:id` | Update a site **(auth)** |
| DELETE | `/api/links/:id` | Delete a site **(auth)** |

**Crawl body:**
```json
{ "query": "github" }
```

The crawl endpoint visits the target site using Playwright, detects Passkey/WebAuthn support across the main page and login flow, then saves the result with:

- `hasPasskey`
- `passkeyType`
- `crawlStatus`
- `detectionSource`
- `signalSourceUrl`
- `finalUrl`

---

### Search History

Each user's history is stored separately and only accessible by that user.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search/history` | Get current user's search history **(auth)** |
| POST | `/api/search/history` | Save a search query **(auth)** |
| DELETE | `/api/search/history/:id` | Delete one history entry **(auth)** |
| DELETE | `/api/search/history` | Clear all history **(auth)** |

---

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check if the server is running |

---

## How the Crawler Works

The crawler (`services/crawler.js`) uses **Playwright** (Chromium) to:

1. Visit the target site's main page
2. Ignore broken HTTPS certificates when needed so crawling can continue on misconfigured sites
3. Look for Passkey/WebAuthn JavaScript APIs, keywords, `autocomplete="webauthn"`, and UI elements
4. Navigate to the login page if needed
5. Inspect login-related iframes as well as the main document
6. Watch for popup / new-tab auth windows
7. Advance through multi-step auth flows using email entry and "Continue / Next / Sign in with ..." actions
8. Intercept runtime `navigator.credentials.get/create` calls
9. Monitor network requests for FIDO2/WebAuthn endpoints

If passkey support is detected, the crawler classifies it as:

- `native` when the signal came from the same site / same-brand domain
- `third-party` when the signal came from an external login or IdP domain

If no signal is detected, the site is stored as `none`.

All results are stored in the shared `Link` collection.

### Detection Source

Each positive result also records a coarse `detectionSource` value:

- `static` — detected from page text, DOM, inline scripts, or passkey UI
- `runtime` — detected from an actual `navigator.credentials` call
- `popup` — detected inside a popup or new tab
- `network` — detected only from WebAuthn/FIDO2 network activity

### Crawl Status

Each crawl also stores a `crawlStatus`:

- `success` — page loaded and crawl completed normally
- `unreachable` — host could not be reached or resolved
- `blocked` — reserved for anti-bot / access-denied scenarios
- `partial` — reserved for flows that started but could not be completed
- `error` — unexpected crawler failure

---

## Authentication Flow

After login, the client receives a JWT token valid for **7 days**. Include it in every request:

```
Authorization: Bearer <your-token>
```

The `auth` middleware decodes the token and attaches `req.userId` to the request, which is used to scope search history to the current user.

---

## Data Models

### Link
```js
{
  title: String,
  url: String,
  description: String,
  category: String,        // "Native Passkey", "Third-Party Passkey", or "No-Passkey"
  hasPasskey: Boolean,     // legacy flag: true = passkey detected, false = none detected
  passkeyType: String,     // "native" | "third-party" | "none"
  crawlStatus: String,     // "success" | "unreachable" | "blocked" | "partial" | "error"
  detectionSource: String, // "static" | "runtime" | "network" | "popup"
  signalSourceUrl: String, // URL where the passkey signal was observed
  finalUrl: String,        // final page URL reached during crawling
  lastCrawledAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### SearchHistory
```js
{
  userId: ObjectId,        // references User — scoped per user
  query: String,
  timestamp: Date
}
```

### User
```js
{
  username: String,
  password: String,        // bcrypt hashed
  createdAt: Date
}
```
