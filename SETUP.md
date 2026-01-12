# Dashboard Application Setup Guide

Complete setup guide for the Dashboard application with MongoDB backend.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MongoDB account (MongoDB Atlas) or local MongoDB installation

## Project Structure

```
Passkey-Dashboard/
├── frontend/            # React frontend application
│   ├── src/
│   │   ├── pages/
│   │   ├── services/
│   │   └── ...
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── backend/             # Express.js + MongoDB backend
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── .env            # Environment variables (you need to create this)
│   ├── server.js
│   └── package.json
│
├── SETUP.md
└── README.md
```

## Installation Steps

### Step 1: Setup Backend

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create .env file
touch .env
```

### Step 2: Configure MongoDB

**Option A: MongoDB Atlas (Cloud - Recommended)**

1. Visit https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a new cluster (free tier available)
4. Click "Connect" on your cluster
5. Add your IP address to the whitelist (or allow from anywhere: 0.0.0.0/0)
6. Create a database user with username and password
7. Choose "Connect your application"
8. Copy the connection string

**Option B: Local MongoDB**

1. Install MongoDB Community Edition
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/dashboard`

### Step 3: Create .env File

Create a `.env` file in the `backend` folder:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dashboard
JWT_SECRET=your_random_secret_key_here_make_it_long_and_secure
PORT=5000
NODE_ENV=development
```

**Important:**
- Replace the MongoDB URI with your actual connection string
- Generate a secure JWT_SECRET (you can use: `openssl rand -base64 32`)
- Never commit the `.env` file to git (it's already in .gitignore)

### Step 4: Setup Frontend

```bash
# Navigate to frontend folder
cd ../frontend

# Install dependencies
npm install
```

## Running the Application

You need to run both backend and frontend servers.

### Terminal 1: Start Backend

```bash
cd backend
npm run dev
```

Backend will run on: http://localhost:5000

### Terminal 2: Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will run on: http://localhost:5173

## Verify Installation

1. Backend health check:
   - Visit: http://localhost:5000/api/health
   - Should return: `{"status":"OK","message":"Server is running"}`

2. Frontend:
   - Visit: http://localhost:5173
   - You should see the login page

## Using the Application

1. **Sign Up**: Create a new account
2. **Login**: Login with your credentials
3. **Search**: Use the search bar and your history will be saved
4. **Settings**: Update your profile and preferences

## Troubleshooting

### Backend Issues

**Error: "MongoDB Connection Error"**
- Check your MongoDB URI in `.env` file
- Verify your IP address is whitelisted in MongoDB Atlas
- Check your database user credentials

**Error: "JWT Secret not defined"**
- Make sure `JWT_SECRET` is set in your `.env` file

**Port already in use**
- Change the PORT in `.env` file

### Frontend Issues

**Error: "Network Error" or "Failed to fetch"**
- Make sure backend server is running on port 5000
- Check the API_BASE_URL in `src/services/api.js`

**CORS errors**
- Backend has CORS enabled, but if issues persist, check your backend URL

### Database Issues

**Cannot connect to MongoDB**
- For Atlas: Check your cluster is running and connection string is correct
- For local: Ensure MongoDB service is running (`mongod`)

**Authentication failed**
- Verify database user credentials in connection string
- Make sure user has read/write permissions

## Database Collections

The application will automatically create these collections:

- `users`: User accounts and profiles
- `searchhistories`: Search history records

## Security Notes

- Never share your `.env` file
- Use strong passwords for MongoDB users
- Keep your JWT_SECRET secure and random
- In production, use HTTPS
- Regularly update dependencies

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in backend `.env`
2. Use production-grade MongoDB cluster
3. Set up proper CORS origins
4. Use environment variables on your hosting platform
5. Enable HTTPS
6. Set secure JWT_SECRET

## Additional Commands

### Backend

```bash
# Start with nodemon (auto-reload)
npm run dev

# Start normally
npm start
```

### Frontend

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Need Help?

If you encounter issues:

1. Check that all dependencies are installed
2. Verify environment variables are set correctly
3. Make sure both servers are running
4. Check browser console for frontend errors
5. Check terminal logs for backend errors
