import express from 'express';
import { getUsers, getUserById, updateUser, deleteUser } from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all users (Admin only)
router.get('/', authorize('admin'), getUsers);

// Get user by ID
router.get('/:id', getUserById);

// Update user
router.put('/:id', updateUser);

// Delete user (Admin only)
router.delete('/:id', authorize('admin'), deleteUser);

export default router;

