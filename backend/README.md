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
│   ├── Link.js            # Discovered site model (hasPasskey field)
│   └── SearchHistory.js   # Per-user search history model
├── routes/
│   ├── auth.js            # Signup / Login
│   ├── user.js            # User profile
│   ├── links.js           # Site search, crawling, public dashboards
│   └── search.js          # Search history
├── services/
│   └── crawler.js         # Playwright-based Passkey detection crawler
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

Sites are stored globally and shared across all users. Each site has a `hasPasskey` boolean field indicating whether it supports Passkey authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/links/search?query=` | Search all sites by keyword **(auth)** |
| GET | `/api/links/passkey` | Get all passkey-supported sites **(auth)** |
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

The crawl endpoint visits the target site using Playwright, detects Passkey/WebAuthn support across the main page and login flow, then saves the result with `hasPasskey: true` or `hasPasskey: false`.

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
2. Look for Passkey/WebAuthn JavaScript APIs, keywords, and UI elements
3. Navigate to the login page if needed
4. Enter a test email to trigger the authentication flow
5. Monitor network requests for FIDO2/WebAuthn endpoints

If Passkey support is detected → saved with `hasPasskey: true`  
If not detected → saved with `hasPasskey: false`

Both results are stored in the shared `Link` collection.

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
  category: String,        // "Passkey-Enabled" or "No-Passkey"
  hasPasskey: Boolean,     // true = supports Passkey, false = does not
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
