# Passkey Dashboard

A modern dashboard application with user authentication, search functionality, and search history tracking.

## Features

- 🔐 **User Authentication**: Sign up and login with JWT tokens
- 🔍 **Search Function**: Search database and web crawling
- 🌐 **Web Crawling**: Automatically crawl web when no results found
- 📝 **Search History**: View, manage, and delete search records
- 🔗 **Link Management**: Store and organize links
- ⚙️ **User Settings**: Update profile and preferences
- 💾 **MongoDB Backend**: Persistent data storage

## Tech Stack

### Frontend
- React 18
- Vite
- React Router
- Axios
- CSS3

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- Bcrypt for password hashing

## Project Structure

```
Passkey-Dashboard/
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── pages/     # Page components
│   │   ├── services/  # API services
│   │   └── ...
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── backend/            # Express.js backend server
│   ├── config/        # Database configuration
│   ├── middleware/    # Authentication middleware
│   ├── models/        # MongoDB models
│   ├── routes/        # API routes
│   ├── server.js
│   ├── package.json
│   └── .env           # Environment variables (you need to create)
│
├── SETUP.md           # Detailed setup instructions
└── README.md          # This file
```

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB account (MongoDB Atlas recommended) or local MongoDB
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Passkey-Dashboard
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   
   # Create .env file with your MongoDB URI and JWT secret
   # See backend/ENV_TEMPLATE.txt for the template
   ```

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

You need to run both servers:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Backend runs on: http://localhost:5000

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend runs on: http://localhost:5173

### Configuration

Create a `.env` file in the `backend` folder:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_random_secret_key
PORT=5000
NODE_ENV=development
```

See `SETUP.md` for detailed setup instructions.

## Usage

1. **Add Links to Database** (see `backend/HOW_TO_ADD_LINKS.md`)
   - Use MongoDB Atlas web interface, OR
   - Use MongoDB Compass, OR
   - Use the API endpoint

2. **Configure Web Crawler** (optional - see `backend/CRAWLER_GUIDE.md`)
   - Replace placeholder code in `backend/services/crawler.js`
   - Choose your crawling method (Puppeteer, Cheerio, APIs, etc.)
   - Install required packages

3. **Use the Application**
   - Open http://localhost:5173 in your browser
   - Click "Sign Up" to create a new account
   - Login with your credentials
   - Search for links using keywords
   - If no results found → Click "Search the Web" button
   - Web crawler will find and save results automatically
   - View search results and history
   - Access settings to update your profile

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login and get JWT token

### User
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile

### Search
- `GET /api/search/history` - Get search history
- `POST /api/search/history` - Add search
- `DELETE /api/search/history/:id` - Delete specific search
- `DELETE /api/search/history` - Clear all history

## Development

- Frontend uses Vite for fast development and hot module replacement
- Backend uses nodemon for auto-restart on file changes
- CORS is enabled for local development

## Security

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- Environment variables for sensitive data
- Token expiration set to 7 days

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
