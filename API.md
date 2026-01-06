# PG Management System API Documentation

Base URL: `http://localhost:5000`

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Endpoints

### 1. Health Check

**GET** `/`

Check if the API is running and database is connected.

**Response:**
```json
{
  "message": "PG Management System API is running",
  "dbConnected": true,
  "dbName": "pgmanagement",
  "dbHost": "cluster.mongodb.net"
}
```

---

### 2. User Signup

**POST** `/api/auth/signup`

Create a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "tenant"
}
```

**Fields:**
- `name` (required): User's full name
- `email` (required): User's email address (must be unique)
- `password` (required): Password (minimum 6 characters)
- `role` (optional): User role - `"admin"`, `"tenant"`, or `"owner"` (default: `"tenant"`)

**Success Response (201):**
```json
{
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "tenant"
  }
}
```

**Error Responses:**
- `400` - Validation error or user already exists
- `500` - Server error

**Example:**
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "tenant"
  }'
```

---

### 3. User Login

**POST** `/api/auth/login`

Authenticate user and get JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Fields:**
- `email` (required): User's email address
- `password` (required): User's password

**Success Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "tenant"
  }
}
```

**Error Responses:**
- `400` - Invalid credentials
- `500` - Server error

**Example:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

---

### 4. Get User Profile

**GET** `/api/auth/profile`

Get the authenticated user's profile (protected route).

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "tenant",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- `401` - No token or invalid token
- `500` - Server error

**Example:**
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## User Roles

- **admin**: System administrator with full access
- **tenant**: Regular user looking for accommodation
- **owner**: Property owner/manager

---

## Error Response Format

All error responses follow this format:

```json
{
  "message": "Error description"
}
```

**Common Status Codes:**
- `400` - Bad Request (validation errors, missing fields)
- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable (database not connected)

---

## Notes

- All email addresses are automatically converted to lowercase
- Passwords are hashed using bcrypt before storage
- JWT tokens expire after 7 days
- The API uses MongoDB Atlas for data storage
- Database name: `pgmanagement`
- Collection name: `users`

---

## Testing the API

You can test the API using:
- **cURL** (command line)
- **Postman** (GUI tool)
- **Thunder Client** (VS Code extension)
- **Frontend application** (React app)

---

## Environment Variables Required

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pgmanagement
JWT_SECRET=your-secret-key-here
PORT=5000
```





