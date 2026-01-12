# How to Add Links to MongoDB

## Link Schema Structure

Each link in the database should have the following structure:

```javascript
{
  title: "Link Title",              // Required - The name/title of the link
  url: "https://example.com",       // Required - The actual URL
  description: "Description here",  // Optional - What this link is about
  category: "Category Name",        // Optional - Category for organization
  tags: ["tag1", "tag2"],          // Optional - Array of tags for searching
  createdAt: Date,                  // Auto-generated
  updatedAt: Date                   // Auto-generated
}
```

## Method 1: Using MongoDB Atlas Web Interface

1. **Go to MongoDB Atlas**
   - Login to your MongoDB Atlas account
   - Navigate to your cluster

2. **Access Collections**
   - Click "Browse Collections"
   - Select your database (e.g., "test" or your database name)
   - Find or create the `links` collection

3. **Insert Document**
   - Click "INSERT DOCUMENT"
   - Enter your link data in JSON format:

```json
{
  "title": "React Documentation",
  "url": "https://react.dev",
  "description": "Official React documentation with guides and API reference",
  "category": "Documentation",
  "tags": ["react", "javascript", "frontend", "documentation"]
}
```

4. **Click "Insert"**

## Method 2: Using MongoDB Compass (Desktop App)

1. **Download MongoDB Compass** (if not installed)
   - Download from: https://www.mongodb.com/products/compass

2. **Connect to Your Database**
   - Use your connection string from `.env` file

3. **Navigate to Collection**
   - Select your database
   - Find or create `links` collection

4. **Add Document**
   - Click "ADD DATA" → "Insert Document"
   - Enter link data in JSON format
   - Click "Insert"

## Method 3: Using MongoDB Shell (mongosh)

1. **Connect to MongoDB**
   ```bash
   mongosh "your_mongodb_connection_string"
   ```

2. **Switch to Your Database**
   ```bash
   use your_database_name
   ```

3. **Insert Link**
   ```bash
   db.links.insertOne({
     title: "React Documentation",
     url: "https://react.dev",
     description: "Official React documentation",
     category: "Documentation",
     tags: ["react", "javascript", "frontend"]
   })
   ```

4. **Insert Multiple Links**
   ```bash
   db.links.insertMany([
     {
       title: "MDN Web Docs",
       url: "https://developer.mozilla.org",
       description: "Web development documentation",
       category: "Documentation",
       tags: ["javascript", "html", "css", "web"]
     },
     {
       title: "GitHub",
       url: "https://github.com",
       description: "Code hosting platform",
       category: "Tools",
       tags: ["git", "github", "version-control"]
     }
   ])
   ```

## Method 4: Using the API (After Backend is Running)

You can also add links using the API endpoint:

```bash
# Get your JWT token first by logging in
# Then use it in the Authorization header

curl -X POST http://localhost:5000/api/links \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "React Documentation",
    "url": "https://react.dev",
    "description": "Official React documentation",
    "category": "Documentation",
    "tags": ["react", "javascript", "frontend"]
  }'
```

## Example Links to Get Started

Here are some example links you can add:

```json
[
  {
    "title": "React Documentation",
    "url": "https://react.dev",
    "description": "Official React documentation with guides and API reference",
    "category": "Documentation",
    "tags": ["react", "javascript", "frontend", "web"]
  },
  {
    "title": "Node.js Documentation",
    "url": "https://nodejs.org/docs",
    "description": "Official Node.js documentation",
    "category": "Documentation",
    "tags": ["nodejs", "javascript", "backend"]
  },
  {
    "title": "MongoDB Documentation",
    "url": "https://docs.mongodb.com",
    "description": "Official MongoDB documentation",
    "category": "Documentation",
    "tags": ["mongodb", "database", "nosql"]
  },
  {
    "title": "GitHub",
    "url": "https://github.com",
    "description": "Code hosting and version control platform",
    "category": "Tools",
    "tags": ["git", "github", "version-control", "collaboration"]
  },
  {
    "title": "Stack Overflow",
    "url": "https://stackoverflow.com",
    "description": "Q&A platform for programmers",
    "category": "Community",
    "tags": ["help", "community", "programming", "qa"]
  }
]
```

## Tips for Better Searching

1. **Use descriptive titles** - Make them searchable
2. **Add good descriptions** - Include keywords
3. **Use relevant tags** - Multiple tags help with discovery
4. **Categorize properly** - Use consistent category names
5. **Keep URLs valid** - Make sure links work

## Verifying Your Links

After adding links, you can verify them by:

1. **Using the Dashboard**
   - Login to the application
   - Search for keywords
   - Results should appear

2. **Using MongoDB Interface**
   - Check the `links` collection
   - Verify documents were created

3. **Using API**
   ```bash
   curl http://localhost:5000/api/links/search?query=react \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

## Troubleshooting

**Links not appearing in search?**
- Make sure the backend server is running
- Check that links are in the correct database
- Verify the connection string in `.env`
- Try restarting the backend server

**Can't connect to MongoDB?**
- Check your IP is whitelisted in MongoDB Atlas
- Verify connection string is correct
- Make sure database user has proper permissions
