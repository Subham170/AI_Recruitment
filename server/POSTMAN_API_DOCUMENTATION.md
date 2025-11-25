# AI Recruitment API - Postman Collection

**Base URL:** `http://localhost:5000` (or your server URL)

---

## 🔐 Authentication Routes

### 1. Login

- **Method:** `POST`
- **URL:** `/api/users/login` or `/api/auth/login`
- **Auth:** None
- **Request Body (JSON):**

```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

- **Response (200):**

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

---

## 👥 User Management Routes

### 2. Get Current User Profile

- **Method:** `GET`
- **URL:** `/api/users/me`
- **Auth:** Required (Bearer Token)
- **Headers:**

```
Authorization: Bearer <token>
```

- **Response (200):**

```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "Admin User",
  "email": "admin@example.com",
  "role": "admin"
}
```

### 3. Get All Users

- **Method:** `GET`
- **URL:** `/api/users`
- **Auth:** Required (Admin/Manager only)
- **Headers:**

```
Authorization: Bearer <token>
```

- **Query Parameters (Optional):**
  - `role`: Filter by role (admin, recruiter, manager)
  - `search`: Search by name or email
  - `page`: Page number (default: 1)
  - `pageSize`: Items per page (default: 7)
- **Example:** `/api/users?role=recruiter&search=john&page=1&pageSize=10`
- **Response (200):**

```json
{
  "count": 10,
  "totalCount": 25,
  "totalPages": 3,
  "currentPage": 1,
  "pageSize": 10,
  "users": [...]
}
```

### 4. Get User by ID

- **Method:** `GET`
- **URL:** `/api/users/:id`
- **Auth:** Required (Admin/Manager only)
- **Headers:**

```
Authorization: Bearer <token>
```

- **Response (200):**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "recruiter"
}
```

### 5. Create User

- **Method:** `POST`
- **URL:** `/api/users`
- **Auth:**
  - First admin: None (public)
  - Subsequent admins: Required (Admin only)
- **Request Body (JSON):**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "recruiter"
}
```

- **Valid Roles:** `admin`, `recruiter`, `manager`
- **Response (201):**

```json
{
  "message": "User created successfully",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "recruiter"
  }
}
```

### 6. Update User

- **Method:** `PUT`
- **URL:** `/api/users/:id`
- **Auth:** Required
- **Headers:**

```
Authorization: Bearer <token>
```

- **Request Body (JSON) - All fields optional:**

```json
{
  "name": "John Updated",
  "email": "john.updated@example.com",
  "role": "manager",
  "password": "newpassword123"
}
```

- **Response (200):**

```json
{
  "message": "User updated successfully",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Updated",
    "email": "john.updated@example.com",
    "role": "manager"
  }
}
```

### 7. Delete User

- **Method:** `DELETE`
- **URL:** `/api/users/:id`
- **Auth:** Required (Admin only)
- **Headers:**

```
Authorization: Bearer <token>
```

- **Response (200):**

```json
{
  "message": "User deleted successfully"
}
```

---

## 👤 Candidate Routes

### 8. Create Candidate

- **Method:** `POST`
- **URL:** `/api/candidates`
- **Auth:** None
- **Request Body (JSON):**

```json
{
  "name": "Alice Developer",
  "email": "alice@example.com",
  "phone_no": "+1-555-0123",
  "image": "https://example.com/image.jpg",
  "skills": ["React", "Node.js", "MongoDB", "Python"],
  "experience": 5,
  "resume_url": "https://example.com/resume.pdf",
  "role": ["Full-stack"],
  "bio": "Experienced Full-stack developer with 5 years of expertise.",
  "is_active": true,
  "social_links": {
    "linkedin": "https://linkedin.com/in/alice",
    "github": "https://github.com/alice",
    "portfolio": "https://alice.dev"
  }
}
```

- **Required Fields:** `name`, `email`
- **Valid Roles:** `SDET`, `QA`, `DevOps`, `Frontend`, `Backend`, `Full-stack`
- **Response (201):**

```json
{
  "message": "Candidate created successfully",
  "candidate": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Alice Developer",
    "email": "alice@example.com",
    ...
  }
}
```

### 9. Get All Candidates

- **Method:** `GET`
- **URL:** `/api/candidates`
- **Auth:** None
- **Response (200):**

```json
{
  "count": 10,
  "candidates": [...]
}
```

### 10. Get Candidate by ID or Email

- **Method:** `GET`
- **URL:** `/api/candidates/:identifier`
- **Auth:** None
- **Example URLs:**
  - `/api/candidates/507f1f77bcf86cd799439011` (ObjectId)
  - `/api/candidates/alice@example.com` (Email)
- **Response (200):**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Alice Developer",
  "email": "alice@example.com",
  ...
}
```

### 11. Get Candidates by Role

- **Method:** `GET`
- **URL:** `/api/candidates/role/:role`
- **Auth:** None
- **Valid Roles:** `SDET`, `QA`, `DevOps`, `Frontend`, `Backend`, `Full-stack`
- **Example:** `/api/candidates/role/Full-stack`
- **Response (200):**

```json
{
  "count": 5,
  "role": "Full-stack",
  "candidates": [...]
}
```

### 12. Seed Candidates (Create Multiple Dummy Candidates)

- **Method:** `POST`
- **URL:** `/api/candidates/seed`
- **Auth:** None
- **Request Body (JSON):**

```json
{
  "count": 10
}
```

- **Response (201):**

```json
{
  "message": "10 candidates created successfully",
  "created": 10,
  "errors": []
}
```

---

## 💼 Job Posting Routes

### 13. Create Job Posting

- **Method:** `POST`
- **URL:** `/api/job-postings`
- **Auth:** None
- **Request Body (JSON):**

```json
{
  "id": "JOB-1001",
  "title": "Senior Frontend Developer",
  "description": "We are looking for an experienced Frontend Developer to join our team...",
  "company": "TechNova Labs",
  "role": ["Frontend"],
  "ctc": "15-25 LPA",
  "exp_req": 5,
  "skills": ["React", "TypeScript", "Next.js", "Tailwind CSS"]
}
```

- **Required Fields:** `id`, `title`, `description`, `company`
- **Valid Roles:** `SDET`, `QA`, `DevOps`, `Frontend`, `Backend`, `Full-stack`
- **Response (201):**

```json
{
  "message": "Job posting created successfully",
  "jobPosting": {
    "_id": "507f1f77bcf86cd799439011",
    "id": "JOB-1001",
    "title": "Senior Frontend Developer",
    ...
  }
}
```

### 14. Get All Job Postings

- **Method:** `GET`
- **URL:** `/api/job-postings`
- **Auth:** None
- **Response (200):**

```json
{
  "count": 10,
  "jobPostings": [...]
}
```

### 15. Get Job Posting by ID

- **Method:** `GET`
- **URL:** `/api/job-postings/:id`
- **Auth:** None
- **Note:** `:id` must be a valid MongoDB ObjectId (24 hex characters)
- **Response (200):**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "id": "JOB-1001",
  "title": "Senior Frontend Developer",
  ...
}
```

---

## 🔗 Matching Routes

### 16. Get Matching Candidates for a Job

- **Method:** `GET`
- **URL:** `/api/matching/job/:jobId/candidates`
- **Auth:** None
- **Note:** `:jobId` must be a valid MongoDB ObjectId
- **Example:** `/api/matching/job/507f1f77bcf86cd799439011/candidates`
- **Response (200):**

```json
{
  "jobId": "507f1f77bcf86cd799439011",
  "matches": [
    {
      "candidateId": {
        "_id": "507f191e810c19729de860ea",
        "name": "Alice Developer",
        "email": "alice@example.com",
        "skills": ["React", "Node.js"],
        "experience": 5,
        "bio": "...",
        "role": ["Full-stack"]
      },
      "matchScore": 0.87,
      "matchedAt": "2025-11-25T12:00:00.000Z"
    },
    {
      "candidateId": {
        "_id": "507f191e810c19729de860eb",
        "name": "Bob Developer",
        ...
      },
      "matchScore": 0.82,
      "matchedAt": "2025-11-25T12:00:00.000Z"
    }
  ],
  "totalMatches": 2,
  "lastUpdated": "2025-11-25T12:00:00.000Z"
}
```

### 17. Get Matching Jobs for a Candidate

- **Method:** `GET`
- **URL:** `/api/matching/candidate/:candidateId/jobs`
- **Auth:** None
- **Note:** `:candidateId` must be a valid MongoDB ObjectId
- **Example:** `/api/matching/candidate/507f191e810c19729de860ea/jobs`
- **Response (200):**

```json
{
  "candidateId": "507f191e810c19729de860ea",
  "matches": [
    {
      "jobId": {
        "_id": "507f1f77bcf86cd799439011",
        "title": "Senior Frontend Developer",
        "description": "...",
        "company": "TechNova Labs",
        "role": ["Frontend"],
        "skills": ["React", "TypeScript"],
        "exp_req": 5,
        "ctc": "15-25 LPA"
      },
      "matchScore": 0.87,
      "matchedAt": "2025-11-25T12:00:00.000Z"
    },
    {
      "jobId": {
        "_id": "507f1f77bcf86cd799439012",
        ...
      },
      "matchScore": 0.75,
      "matchedAt": "2025-11-25T12:00:00.000Z"
    }
  ],
  "totalMatches": 2,
  "lastUpdated": "2025-11-25T12:00:00.000Z"
}
```

### 18. Refresh Job Matches (Recalculate)

- **Method:** `POST`
- **URL:** `/api/matching/job/:jobId/refresh`
- **Auth:** None
- **Request Body (JSON) - Optional filters:**

```json
{
  "filters": {
    "experience": 3,
    "role": ["Frontend", "Full-stack"],
    "is_active": true
  }
}
```

- **Response (200):**

```json
{
  "message": "Job matches refreshed successfully",
  "jobId": "507f1f77bcf86cd799439011",
  "totalMatches": 5,
  "lastUpdated": "2025-11-25T12:00:00.000Z"
}
```

### 19. Refresh Candidate Matches (Recalculate)

- **Method:** `POST`
- **URL:** `/api/matching/candidate/:candidateId/refresh`
- **Auth:** None
- **Request Body (JSON) - Optional filters:**

```json
{
  "filters": {
    "exp_req": 3,
    "role": ["Frontend", "Full-stack"]
  }
}
```

- **Response (200):**

```json
{
  "message": "Candidate matches refreshed successfully",
  "candidateId": "507f191e810c19729de860ea",
  "totalMatches": 8,
  "lastUpdated": "2025-11-25T12:00:00.000Z"
}
```

---

## 📝 Postman Collection Setup

### Environment Variables

Create a Postman environment with:

- `base_url`: `http://localhost:5000`
- `token`: (Will be set after login)

### Authorization Setup

For routes requiring authentication:

1. Go to **Authorization** tab
2. Select **Type:** `Bearer Token`
3. Enter token value: `{{token}}`

### Common Headers

For all requests:

```
Content-Type: application/json
```

---

## 🎯 Quick Test Flow

1. **Login** → Get token
2. **Create Candidate** → Get candidate ID
3. **Create Job Posting** → Get job ID
4. **Get Job Matches** → See matching candidates
5. **Get Candidate Matches** → See matching jobs

---

## ⚠️ Important Notes

- **ObjectId Format:** MongoDB ObjectIds are 24-character hexadecimal strings
- **Vector Embeddings:** Automatically generated on candidate/job creation
- **Matching:** Automatically triggered on creation (runs asynchronously)
- **Token Expiry:** Default is 7 days (configurable via `JWT_EXPIRE`)
- **Error Responses:** All errors return `{ "message": "error message" }` with appropriate status codes

---

## 📊 Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid credentials)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## 📞 Bolna Call Scheduling

### 20. Schedule Automated Call

- **Method:** `POST`
- **URL:** `/api/bolna/schedule-call`
- **Auth:** None
- **Environment Variables Required:**
  - `BOLNA_API_KEY` – API token for Bolna (used in `Authorization: Bearer ...`)
  - `BOLNA_AGENT_ID` – Agent identifier (`f0d5de11-6f78-4d41-ad3e-d3e7a4d72cbf`)
  - `BOLNA_FROM_PHONE` – Verified caller ID (`+918031274477`)
  - `BOLNA_API_URL` _(optional)_ – Defaults to `https://api.bolna.ai/call`
- **Request Body (JSON):**

```json
{
  "candidateId": "507f191e810c19729de860ea",
  "jobId": "507f1f77bcf86cd799439011",
  "recipient_phone_number": "+916200104692",
  "scheduled_at": "2025-11-25T20:25:30.311610+05:30",
  "user_data": {
    "bio": "Hi, I’m Subham Dey...",
    "role": "Full-stack developer",
    "experience": "1+ years ..."
  }
}
```

- **Response (200):**

```json
{
  "message": "Call scheduled successfully",
  "bolnaResponse": {
    "...": "Bolna API response"
  }
}
```

- **Notes:**
  - `candidateId`, `jobId`, `recipient_phone_number`, and `scheduled_at` are required in the request.
  - The server stores `{ candidateId, jobId, execution_id }` returned by Bolna for tracking.
  - `agent_id` and `from_phone_number` are injected by the server using environment variables.
  - Any additional fields sent from the frontend are forwarded to the Bolna API.

### 21. Sync Bolna Execution (Fetch Transcript & Scheduled Time)

- **Method:** `POST`
- **URL:** `/api/bolna/sync-execution`
- **Auth:** None
- **Env Requirements:** `BOLNA_API_KEY`, `OPENAI_API_KEY` (for GPT-4 extraction)
- **Request Body (JSON):**

```json
{
  "executionId": "4c06b4d1-4096-4561-919a-4f94539c8d4a"
}
```

- **Behavior:**

  - Fetches execution details from `https://api.bolna.ai/executions/:execution_id`.
  - Uses GPT-4 (`OPENAI_MODEL`, default `gpt-4o-mini`) to extract any follow-up time mentioned in the transcript.
  - Updates `BolnaCall.userScheduledAt` and latest status in MongoDB.

- **Response (200):**

```json
{
  "message": "Bolna call synced successfully",
  "execution": { "...": "Full payload from Bolna" },
  "storedRecord": {
    "id": "6744c3...",
    "status": "completed",
    "userScheduledAt": "2025-11-26T10:30:00.000Z"
  }
}
```
