# AI Recruitment Matching System - Flow Proposal

## 📋 Current State Analysis

### Existing Components:

1. **Candidate Model** (`server/candidates/model.js`)

   - Fields: name, email, skills, experience, bio, role, etc.
   - ❌ Missing: `vector` field for embeddings

2. **Job Posting Model** (`server/job_posting/model.js`)

   - Fields: id, title, description, company, role, skills, exp_req, ctc
   - ❌ Missing: `vector` field for embeddings

3. **Vector DB Service** (`server/vector_db.js`)

   - Has `getEmbedding()` function
   - Has `searchCandidates()` function (searches candidates using job description)
   - Currently standalone script, not integrated

4. **Controllers**
   - `createCandidate()` - creates candidate but doesn't generate embeddings
   - `createJobPosting()` - creates job but doesn't generate embeddings

---

## 🎯 Proposed Flow

### Phase 1: Schema Updates & Embedding Integration

#### 1.1 Update Candidate Schema

```javascript
// Add to candidateSchema:
vector: {
  type: [Number], // Array of 384 numbers (embedding vector)
  default: null,
  select: false, // Don't return in default queries (large data)
}
```

#### 1.2 Update Job Posting Schema

```javascript
// Add to jobPostingSchema:
vector: {
  type: [Number], // Array of 384 numbers (embedding vector)
  default: null,
  select: false,
}
```

#### 1.3 Create Embedding Service Module

**New File: `server/services/embeddingService.js`**

- Export `getEmbedding(text)` - reusable embedding function
- Export `generateCandidateEmbedding(candidate)` - generates text from candidate data
- Export `generateJobEmbedding(jobPosting)` - generates text from job data

#### 1.4 Update Candidate Creation Flow

**Modify: `server/candidates/controller.js`**

```
createCandidate() flow:
1. Validate input
2. Create candidate document
3. Generate embedding text: `${name}. ${bio}. Skills: ${skills.join(", ")}`
4. Generate embedding vector using embeddingService
5. Update candidate with vector field
6. Return candidate (without vector in response)
```

#### 1.5 Update Job Posting Creation Flow

**Modify: `server/job_posting/controller.js`**

```
createJobPosting() flow:
1. Validate input
2. Create job posting document
3. Generate embedding text: `${title}. ${description}. Skills: ${skills.join(", ")}. Experience: ${exp_req} years`
4. Generate embedding vector using embeddingService
5. Update job posting with vector field
6. Trigger matching process (see Phase 2)
7. Return job posting (without vector in response)
```

---

### Phase 2: Matching System & Mapping Database

#### 2.1 Create Matching Service

**New File: `server/services/matchingService.js`**

**Functions:**

1. `findMatchingCandidates(jobPostingId)`

   - Takes job posting ID
   - Gets job posting with vector
   - Performs vector search on candidates collection
   - Applies filters (experience, role, etc.)
   - Returns array of matching candidate IDs with scores

2. `findMatchingJobs(candidateId)`

   - Takes candidate ID
   - Gets candidate with vector
   - Performs vector search on job_postings collection
   - Applies filters (exp_req, role, etc.)
   - Returns array of matching job IDs with scores

3. `updateJobMatches(jobPostingId)`

   - Finds matching candidates for a job
   - Updates/creates mapping in MatchMapping collection
   - Also updates reverse mapping (candidate -> jobs)

4. `updateCandidateMatches(candidateId)`
   - Finds matching jobs for a candidate
   - Updates/creates mapping in MatchMapping collection
   - Also updates reverse mapping (job -> candidates)

#### 2.2 Create Match Mapping Model

**New File: `server/matching/model.js`**

```javascript
const matchMappingSchema = new mongoose.Schema(
  {
    // Job to Candidates mapping
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPosting",
      index: true,
    },
    candidateIds: [
      {
        candidateId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Candidate",
        },
        matchScore: Number, // Similarity score (0-1)
        matchedAt: Date,
      },
    ],

    // Candidate to Jobs mapping
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      index: true,
    },
    jobIds: [
      {
        jobId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "JobPosting",
        },
        matchScore: Number,
        matchedAt: Date,
      },
    ],

    lastUpdated: Date,
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
matchMappingSchema.index({ jobId: 1 });
matchMappingSchema.index({ candidateId: 1 });
```

**Alternative Approach (More Normalized):**

```javascript
// Option 1: Separate collections
// Collection: job_matches
{
  jobId: ObjectId,
  matches: [{
    candidateId: ObjectId,
    score: Number,
    matchedAt: Date
  }],
  lastUpdated: Date
}

// Collection: candidate_matches
{
  candidateId: ObjectId,
  matches: [{
    jobId: ObjectId,
    score: Number,
    matchedAt: Date
  }],
  lastUpdated: Date
}
```

**Recommended: Separate Collections** (better for scalability and query performance)

---

### Phase 3: API Endpoints

#### 3.1 Matching Routes

**New File: `server/matching/route.js`**

```javascript
// GET /api/matching/job/:jobId/candidates
// Returns: Array of candidate IDs that match the job

// GET /api/matching/candidate/:candidateId/jobs
// Returns: Array of job IDs that match the candidate

// POST /api/matching/job/:jobId/refresh
// Manually trigger re-matching for a job

// POST /api/matching/candidate/:candidateId/refresh
// Manually trigger re-matching for a candidate
```

#### 3.2 Matching Controller

**New File: `server/matching/controller.js`**

**Functions:**

1. `getJobMatches(req, res)` - GET job matches
2. `getCandidateMatches(req, res)` - GET candidate matches
3. `refreshJobMatches(req, res)` - Recalculate job matches
4. `refreshCandidateMatches(req, res)` - Recalculate candidate matches

---

### Phase 4: Integration Points

#### 4.1 Auto-Matching Triggers

**When a new job is created:**

```
createJobPosting() →
  Generate embedding →
  Save job →
  Call matchingService.updateJobMatches(jobId) →
  Store results in job_matches collection
```

**When a new candidate is created:**

```
createCandidate() →
  Generate embedding →
  Save candidate →
  Call matchingService.updateCandidateMatches(candidateId) →
  Store results in candidate_matches collection
```

**When a job is updated:**

```
updateJobPosting() →
  Regenerate embedding if description/skills changed →
  Call matchingService.updateJobMatches(jobId)
```

**When a candidate is updated:**

```
updateCandidate() →
  Regenerate embedding if bio/skills changed →
  Call matchingService.updateCandidateMatches(candidateId)
```

---

## 📁 Proposed File Structure

```
server/
├── services/
│   ├── embeddingService.js      [NEW] - Embedding generation
│   └── matchingService.js        [NEW] - Matching logic
├── matching/
│   ├── model.js                  [NEW] - Match mapping models
│   ├── controller.js            [NEW] - Match API handlers
│   └── route.js                 [NEW] - Match routes
├── candidates/
│   ├── model.js                  [UPDATE] - Add vector field
│   └── controller.js            [UPDATE] - Add embedding generation
├── job_posting/
│   ├── model.js                  [UPDATE] - Add vector field
│   └── controller.js            [UPDATE] - Add embedding + matching
└── vector_db.js                  [REFACTOR] - Move to services or remove
```

---

## 🔄 Complete Flow Diagram

### Creating a Candidate:

```
POST /api/candidates
  ↓
Validate input
  ↓
Create candidate document (MongoDB)
  ↓
Generate embedding text: "Name. Bio. Skills: ..."
  ↓
Call embeddingService.getEmbedding(text)
  ↓
Update candidate with vector field
  ↓
Call matchingService.updateCandidateMatches(candidateId)
  ↓
  ├─→ Find matching jobs using vector search
  ├─→ Store in candidate_matches collection
  └─→ Update job_matches collection (reverse mapping)
  ↓
Return candidate (without vector)
```

### Creating a Job Posting:

```
POST /api/job-postings
  ↓
Validate input
  ↓
Create job posting document (MongoDB)
  ↓
Generate embedding text: "Title. Description. Skills: ..."
  ↓
Call embeddingService.getEmbedding(text)
  ↓
Update job posting with vector field
  ↓
Call matchingService.updateJobMatches(jobPostingId)
  ↓
  ├─→ Find matching candidates using vector search
  ├─→ Store in job_matches collection
  └─→ Update candidate_matches collection (reverse mapping)
  ↓
Return job posting (without vector)
```

### Getting Matches:

```
GET /api/matching/job/:jobId/candidates
  ↓
Query job_matches collection
  ↓
Return array of candidate IDs with scores
```

```
GET /api/matching/candidate/:candidateId/jobs
  ↓
Query candidate_matches collection
  ↓
Return array of job IDs with scores
```

---

## 🎨 API Response Examples

### GET /api/matching/job/:jobId/candidates

```json
{
  "jobId": "507f1f77bcf86cd799439011",
  "matches": [
    {
      "candidateId": "507f191e810c19729de860ea",
      "matchScore": 0.87,
      "matchedAt": "2025-11-25T12:00:00Z"
    },
    {
      "candidateId": "507f191e810c19729de860eb",
      "matchScore": 0.82,
      "matchedAt": "2025-11-25T12:00:00Z"
    }
  ],
  "totalMatches": 2,
  "lastUpdated": "2025-11-25T12:00:00Z"
}
```

### GET /api/matching/candidate/:candidateId/jobs

```json
{
  "candidateId": "507f191e810c19729de860ea",
  "matches": [
    {
      "jobId": "507f1f77bcf86cd799439011",
      "matchScore": 0.87,
      "matchedAt": "2025-11-25T12:00:00Z"
    },
    {
      "jobId": "507f1f77bcf86cd799439012",
      "matchScore": 0.75,
      "matchedAt": "2025-11-25T12:00:00Z"
    }
  ],
  "totalMatches": 2,
  "lastUpdated": "2025-11-25T12:00:00Z"
}
```

---

## ⚡ Optimization Considerations

1. **Async Processing**: Consider using a job queue (Bull/BullMQ) for matching to avoid blocking API responses
2. **Caching**: Cache match results with TTL to reduce database queries
3. **Batch Updates**: When multiple candidates/jobs are created, batch the matching process
4. **Incremental Updates**: Only re-match when relevant fields change
5. **Vector Index**: Ensure MongoDB Atlas vector search index is properly configured

---

## 🚀 Implementation Order

1. ✅ Create embedding service module
2. ✅ Update schemas (add vector fields)
3. ✅ Integrate embedding generation in create flows
4. ✅ Create matching models (job_matches, candidate_matches)
5. ✅ Create matching service
6. ✅ Create matching API endpoints
7. ✅ Integrate auto-matching in create/update flows
8. ✅ Test end-to-end flow
9. ✅ Add error handling and logging

---

## ❓ Questions to Consider

1. **Matching Threshold**: Should we filter matches by minimum score (e.g., > 0.5)?
2. **Match Limit**: Maximum number of matches to store per job/candidate?
3. **Update Frequency**: Should matches be recalculated periodically or only on changes?
4. **Vector Search Index**: Do we need separate indexes for candidates and jobs, or can we use one?
5. **Response Format**: Should API return full objects or just IDs (with option to expand)?

---

**Ready for your approval!** 🎉
