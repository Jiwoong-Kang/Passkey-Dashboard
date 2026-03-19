# Passkey Dashboard — Frontend

React-based frontend for the Passkey Dashboard application. Provides the user interface for searching, crawling, and viewing passkey-related site data.

---

## Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Run the Development Server

```bash
npm run dev
```

App runs at: `http://localhost:5173`

> The backend server must also be running at `http://localhost:5001` for API calls to work.

### 3. Build for Production

```bash
npm run build
```

---

## Project Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Login.jsx / Login.css          # Login page
│   │   ├── SignUp.jsx / SignUp.css         # Sign up page
│   │   ├── Dashboard.jsx / Dashboard.css  # Main dashboard (search + history)
│   │   ├── PasskeyDashboard.jsx           # Public board — passkey-supported sites
│   │   ├── NoPasskeyDashboard.jsx         # Public board — non-passkey sites
│   │   ├── PublicDashboard.css            # Shared styles for public dashboards
│   │   └── Settings.jsx / Settings.css    # User settings page
│   ├── services/
│   │   ├── api.js            # Axios instance with base URL and auth interceptor
│   │   ├── authService.js    # Signup, login, logout, token management
│   │   ├── linkService.js    # Site search, crawl, public dashboard fetching
│   │   ├── searchService.js  # Search history CRUD
│   │   └── userService.js    # User profile read/update
│   ├── App.jsx               # Route definitions
│   ├── main.jsx              # App entry point
│   └── index.css             # Global styles
├── index.html
├── package.json
└── vite.config.js
```

---

## Pages

### Login & Sign Up
Entry point of the app. Users must create an account and log in to access any other page. JWT token is stored in `localStorage` after login.

### Dashboard (`/dashboard`)
The main page after login. Includes:
- **Search bar** — searches the shared site database by keyword
- **Search results** — color-coded by passkey support:
  - Blue (`🔑 Passkey`) — site supports Passkey
  - Red (`🔒 No Passkey`) — site does not support Passkey
- **Search the Web button** — appears when no DB results are found; triggers the Playwright crawler on the backend
- **Search history** — personal list of past searches, with delete and clear options
- **Navigation buttons** in the header to reach the two public dashboards

### Passkey Sites (`/passkey-sites`)
Public dashboard showing all sites confirmed to support Passkey, across all users. Includes a live filter bar to search by name or URL.

### No Passkey Sites (`/no-passkey-sites`)
Public dashboard showing all sites confirmed to not support Passkey. Same layout and filter capability as the Passkey Sites board.

### Settings (`/settings`)
Allows the logged-in user to update their username.

---

## Services

| File | Responsibility |
|------|---------------|
| `api.js` | Axios instance pointed at `http://localhost:5001/api`. Automatically attaches JWT token to every request. Redirects to login on 401. |
| `authService.js` | Handles signup, login, logout, and reading the current user from `localStorage`. |
| `linkService.js` | Fetches search results, triggers web crawls, and loads passkey/no-passkey site lists. |
| `searchService.js` | Gets, saves, and deletes the user's personal search history. |
| `userService.js` | Reads and updates the logged-in user's profile. |

---

## Routing

| Path | Page | Auth Required |
|------|------|---------------|
| `/` | Login | No |
| `/signup` | Sign Up | No |
| `/dashboard` | Main Dashboard | Yes |
| `/passkey-sites` | Passkey Sites Board | Yes |
| `/no-passkey-sites` | No Passkey Sites Board | Yes |
| `/settings` | Settings | Yes |

Unauthenticated users are automatically redirected to `/`.
