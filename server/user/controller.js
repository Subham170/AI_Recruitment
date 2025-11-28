import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "./model.js";

// Create a new user (Admin only - can create managers and recruiters)
// Exception: If no admin exists, allow creating the first admin without authentication
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate input
    if (!name || !email || !password || !role) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields" });
    }

    // Validate role
    const validRoles = ["admin", "recruiter", "manager"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        message: "Invalid role. Must be admin, recruiter, or manager",
      });
    }

    // Check if this is the first admin creation (no admin exists)
    const adminExists = await User.findOne({ role: "admin" });
    const isFirstAdmin = !adminExists && role === "admin";

    // If trying to create admin and admin already exists, require authentication
    if (role === "admin" && adminExists) {
      // This will be handled by the route middleware (authenticate, authorize("admin"))
      // But we check here too for safety
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
          message: "Only existing admins can create new admin users",
        });
      }
    }

    // If not first admin, require authentication (handled by route middleware)
    // For first admin, we allow creation without auth

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    // Return user without password
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    res.status(201).json({
      message: "User created successfully",
      user: userResponse,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all users (Admin and Manager only)
export const getUsers = async (req, res) => {
  try {
    const { role: filterRole, search, page = 1, pageSize = 7 } = req.query;

    let query = {};
    
    // Role filter
    if (filterRole) {
      query.role = filterRole;
    }

    // Search filter (name or email)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limit = parseInt(pageSize);
    const skip = (pageNum - 1) * limit;

    // Get total count for pagination
    const totalCount = await User.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Get users with pagination
    const users = await User.find(query)
      .select("-password")
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 }); // Sort by name ascending

    res.status(200).json({
      count: users.length,
      totalCount,
      totalPages,
      currentPage: pageNum,
      pageSize: limit,
      users,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user (Admin can update anyone, Manager can update recruiters)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password } = req.body;
    const currentUser = req.user;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check permissions
    // Admin can update anyone
    // Manager can only update recruiters
    if (currentUser.role === "manager" && user.role !== "recruiter") {
      return res
        .status(403)
        .json({ message: "Managers can only update recruiters" });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) {
      // Only admin can change roles
      if (currentUser.role !== "admin") {
        return res
          .status(403)
          .json({ message: "Only admin can change user roles" });
      }
      user.role = role;
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    res.status(200).json({
      message: "User updated successfully",
      user: userResponse,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete user (Admin only)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Prevent admin from deleting themselves
    if (currentUser.id === id) {
      return res
        .status(400)
        .json({ message: "Cannot delete your own account" });
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get current user profile
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== AUTHENTICATION CONTROLLERS ====================

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide email and password",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || "your-secret-key",
      {
        expiresIn: process.env.JWT_EXPIRE || "7d",
      }
    );

    // Return user data and token
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//get all recruiters
export const getRecruiters = async (req, res) => {
  try {
    const recruiters = await User.find({ role: "recruiter" }).select("-password");
    res.status(200).json({
      message: "Recruiters fetched successfully",
      recruiters,
    });
    } catch (error) {
    res.status(500).json({ message: error.message });
    }
  }
