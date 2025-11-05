import express from 'express';
import {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
  getMyApplications,
  getApplicationsByJob
} from '../controllers/application.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create application (Candidate only)
router.post('/', authorize('candidate'), createApplication);

// Get my applications (Candidate)
router.get('/my-applications', authorize('candidate'), getMyApplications);

// Get applications by job (Recruiter/Admin)
router.get('/job/:jobId', authorize('recruiter', 'admin'), getApplicationsByJob);

// Get all applications (Admin only)
router.get('/', authorize('admin'), getApplications);

// Get application by ID
router.get('/:id', getApplicationById);

// Update application
router.put('/:id', updateApplication);

// Delete application
router.delete('/:id', deleteApplication);

export default router;

