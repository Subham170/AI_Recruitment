# AI Recruitment Server

Backend API server for the AI Recruitment platform.

## Features

- User authentication (JWT)
- Role-based access control (Candidate, Recruiter, Admin)
- Job management
- Application tracking
- RESTful API

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration:
   - MongoDB connection string
   - JWT secret key
   - Port number

4. Start the server:
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/profile` - Get user profile

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)

### Jobs
- `GET /api/jobs` - Get all jobs (Public)
- `GET /api/jobs/:id` - Get job by ID
- `POST /api/jobs` - Create job (Recruiter/Admin)
- `PUT /api/jobs/:id` - Update job (Recruiter/Admin)
- `DELETE /api/jobs/:id` - Delete job (Recruiter/Admin)
- `GET /api/jobs/recruiter/my-jobs` - Get jobs by recruiter

### Applications
- `GET /api/applications` - Get all applications (Admin)
- `GET /api/applications/:id` - Get application by ID
- `POST /api/applications` - Create application (Candidate)
- `PUT /api/applications/:id` - Update application
- `DELETE /api/applications/:id` - Delete application
- `GET /api/applications/my-applications` - Get my applications (Candidate)
- `GET /api/applications/job/:jobId` - Get applications by job (Recruiter/Admin)

## Project Structure

```
server/
├── config/
│   └── database.js          # Database connection
├── controllers/
│   ├── auth.controller.js   # Authentication logic
│   ├── user.controller.js    # User management
│   ├── job.controller.js     # Job management
│   └── application.controller.js # Application management
├── middleware/
│   └── auth.middleware.js   # Authentication & authorization middleware
├── models/
│   ├── User.model.js        # User schema
│   ├── Job.model.js         # Job schema
│   └── Application.model.js # Application schema
├── routes/
│   ├── auth.routes.js       # Auth routes
│   ├── user.routes.js       # User routes
│   ├── job.routes.js        # Job routes
│   └── application.routes.js # Application routes
├── server.js                # Main server file
├── package.json
└── README.md
```

## Environment Variables

- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRE` - JWT expiration time
- `CORS_ORIGIN` - Allowed CORS origin

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## License

ISC

