import express from 'express';
import {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
  getJobsByRecruiter
} from '../controllers/job.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public route - Get all jobs (for candidates)
router.get('/', getJobs);

// Get job by ID
router.get('/:id', getJobById);

// Protected routes
router.use(authenticate);

// Create job (Recruiter/Admin only)
router.post('/', authorize('recruiter', 'admin'), createJob);

// Get jobs by recruiter
router.get('/recruiter/my-jobs', authorize('recruiter', 'admin'), getJobsByRecruiter);

// Update job (Recruiter/Admin only)
router.put('/:id', authorize('recruiter', 'admin'), updateJob);

// Delete job (Recruiter/Admin only)
router.delete('/:id', authorize('recruiter', 'admin'), deleteJob);

export default router;

