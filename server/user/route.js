import express from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import {
  // User CRUD
  createUser,
  deleteUser,
  getCurrentUser,
  getUserById,
  getUsers,
  // Authentication
  login,
  updateUser,
} from "./controller.js";

const router = express.Router();

// ==================== AUTHENTICATION ROUTES ====================
// Login route (public)
router.post("/login", login);

// ==================== USER CRUD ROUTES ====================
// Get current user profile (authenticated users)
router.get("/me", authenticate, getCurrentUser);

// Get all users (Admin and Manager only)
router.get("/", authenticate, authorize("admin", "manager"), getUsers);

// Get user by ID (Admin and Manager only)
router.get("/:id", authenticate, authorize("admin", "manager"), getUserById);

// Create a new user (Admin only - can create managers and recruiters)
// Exception: If no admin exists, allow creating the first admin without authentication
const createUserRoute = async (req, res, next) => {
  try {
    const User = (await import("./model.js")).default;
    const adminExists = await User.findOne({ role: "admin" });

    // If admin exists, require authentication
    if (adminExists) {
      return authenticate(req, res, () => {
        authorize("admin")(req, res, () => createUser(req, res));
      });
    }

    // If no admin exists and creating admin, allow without auth
    if (req.body.role === "admin") {
      return createUser(req, res);
    }

    // If no admin exists but trying to create non-admin, require auth (will fail, but consistent)
    return authenticate(req, res, () => {
      authorize("admin")(req, res, () => createUser(req, res));
    });
  } catch (error) {
    next(error);
  }
};

router.post("/", createUserRoute);

// Update user (Admin can update anyone, Manager can update recruiters)
// Note: Authorization logic is handled in the controller
router.put("/:id", authenticate, updateUser);

// Delete user (Admin only)
router.delete("/:id", authenticate, authorize("admin"), deleteUser);

export default router;
