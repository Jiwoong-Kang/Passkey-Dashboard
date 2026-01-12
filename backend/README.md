# Dashboard Backend

Backend server for the Dashboard application using Express.js and MongoDB.

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `backend` folder with the following content:

```env
# MongoDB Connection String
MONGODB_URI=your_mongodb_connection_string_here

# JWT Secret Key (use a random string)
JWT_SECRET=your_jwt_secret_key_here

# Server Port
PORT=5000

# Node Environment
NODE_ENV=development
```

**Important:** Replace the placeholder values with your actual configuration:

- `MONGODB_URI`: Your MongoDB connection string
  - For MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/database-name`
  - For local MongoDB: `mongodb://localhost:27017/dashboard`
- `JWT_SECRET`: A random secure string (e.g., generate one using `openssl rand -base64 32`)

### 3. Get MongoDB Connection String

#### Option A: MongoDB Atlas (Cloud - Recommended)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account and cluster
3. Click "Connect" on your cluster
4. Choose "Connect your application"
5. Copy the connection string
6. Replace `<password>` with your database user password

#### Option B: Local MongoDB

1. Install MongoDB on your computer
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/dashboard`

### 4. Run the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Create new account
  - Body: `{ username, password }`
  
- `POST /api/auth/login` - Login
  - Body: `{ username, password }`
  - Returns: `{ token, user }`

### User Profile

- `GET /api/user/profile` - Get user profile (requires auth)
  
- `PUT /api/user/profile` - Update profile (requires auth)
  - Body: `{ username?, theme? }`

### Links

- `GET /api/links/search?query=keyword` - Search links (requires auth)
  
- `GET /api/links` - Get all links with pagination (requires auth)
  - Query params: `page`, `limit`
  
- `GET /api/links/:id` - Get single link (requires auth)
  
- `POST /api/links` - Add new link (requires auth)
  - Body: `{ title, url, description?, category?, tags? }`
  
- `PUT /api/links/:id` - Update link (requires auth)
  - Body: `{ title?, url?, description?, category?, tags? }`
  
- `DELETE /api/links/:id` - Delete link (requires auth)

### Search History

- `GET /api/search/history` - Get search history (requires auth)
  
- `POST /api/search/history` - Add search (requires auth)
  - Body: `{ query }`
  
- `DELETE /api/search/history/:id` - Delete specific history (requires auth)
  
- `DELETE /api/search/history` - Clear all history (requires auth)

### Health Check

- `GET /api/health` - Server health check

## Project Structure

```
backend/
├── config/
│   └── db.js              # Database configuration
├── middleware/
│   └── auth.js            # JWT authentication middleware
├── models/
│   ├── User.js            # User model
│   ├── SearchHistory.js   # Search history model
│   └── Link.js            # Link model
├── routes/
│   ├── auth.js            # Authentication routes
│   ├── user.js            # User profile routes
│   ├── search.js          # Search history routes
│   └── links.js           # Links routes (search & CRUD)
├── .env                   # Environment variables (create this)
├── .gitignore
├── package.json
├── server.js              # Main server file
└── README.md
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. After login, include the token in the Authorization header:

```
Authorization: Bearer <your-token>
```

## Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- Token expiration (7 days)
- CORS enabled for frontend communication
- Environment variables for sensitive data

## Development

Make sure both backend and frontend are running:

1. Backend: `http://localhost:5000` (this server)
2. Frontend: `http://localhost:5173` (React app)

The frontend will make API calls to the backend server.
