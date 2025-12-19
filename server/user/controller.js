import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "./model.js";

// Create a new user
// - Admin can create admins, managers, and recruiters
// - Manager can only create recruiters
// - Exception: If no admin exists, allow creating the first admin without authentication
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, assignedManager } = req.body;

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

    // Permission checks for non-initial admins
    const currentUser = req.user || null;

    // If this is NOT the first admin, enforce role-based access:
    // - admin: can create any valid role
    // - manager: can only create recruiters
    if (!isFirstAdmin) {
      if (!currentUser) {
        return res
          .status(403)
          .json({ message: "Access denied. Insufficient permissions." });
      }

      if (currentUser.role === "manager") {
        if (role !== "recruiter") {
          return res.status(403).json({
            message: "Managers can only create recruiter users",
          });
        }
      } else if (currentUser.role !== "admin") {
        return res
          .status(403)
          .json({ message: "Access denied. Insufficient permissions." });
      }
    }

    // Handle assignment logic based on role and creator
    let assignedAdmin = null;
    let finalAssignedManager = null;

    if (role === "manager" && currentUser && currentUser.role === "admin") {
      // Admin creating a manager - assign admin to manager
      assignedAdmin = currentUser.id;
    } else if (role === "recruiter") {
      if (currentUser && currentUser.role === "manager") {
        // Manager creating a recruiter - assign manager to recruiter
        finalAssignedManager = currentUser.id;
      } else if (currentUser && currentUser.role === "admin") {
        // Admin creating a recruiter - require assignedManager to be provided
        if (!assignedManager) {
          return res.status(400).json({
            message: "Please select a manager when creating a recruiter",
          });
        }
        // Validate that the assignedManager exists and is actually a manager
        const manager = await User.findById(assignedManager);
        if (!manager) {
          return res.status(400).json({
            message: "Selected manager does not exist",
          });
        }
        if (manager.role !== "manager") {
          return res.status(400).json({
            message: "Selected user is not a manager",
          });
        }
        finalAssignedManager = assignedManager;
      }
    }

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

    // Create user with assignments
    const userData = {
      name,
      email,
      password: hashedPassword,
      role,
    };

    if (assignedAdmin) {
      userData.assignedAdmin = assignedAdmin;
    }

    if (finalAssignedManager) {
      userData.assignedManager = finalAssignedManager;
    }

    const user = await User.create(userData);

    // Return user without password
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      assignedAdmin: user.assignedAdmin,
      assignedManager: user.assignedManager,
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
    const currentUser = req.user;

    let query = {};

    // Role filter
    if (filterRole) {
      query.role = filterRole;
    }

    // Filter based on user role and assignments
    if (currentUser) {
      if (currentUser.role === "admin") {
        // Admin: Show only their assigned managers and those managers' recruiters
        if (filterRole === "manager") {
          // Show only managers assigned to this admin
          query.assignedAdmin = currentUser.id;
        } else if (filterRole === "recruiter") {
          // Show only recruiters assigned to managers that belong to this admin
          const assignedManagers = await User.find({
            role: "manager",
            assignedAdmin: currentUser.id,
          }).select("_id");
          const managerIds = assignedManagers.map((m) => m._id);
          query.assignedManager = { $in: managerIds };
        }
        // If no filterRole, admin can see all (for backward compatibility in user management)
        // But for reports, filterRole will be provided
      } else if (currentUser.role === "manager") {
        // Manager: Show only recruiters assigned to them
        if (filterRole === "recruiter") {
          query.assignedManager = currentUser.id;
        }
        // Managers can only see recruiters, so if filterRole is not recruiter, return empty
        if (filterRole && filterRole !== "recruiter") {
          query.role = "nonexistent"; // This will return no results
        }
      }
    }

    // Search filter (name or email) - combine with AND to existing filters
    if (search) {
      const searchConditions = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };
      // Combine search with existing query using $and
      const existingQuery = { ...query };
      query = {
        $and: [existingQuery, searchConditions],
      };
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
    const { name, email, role, password, assignedManager } = req.body;
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
    
    const roleChanged = role && role !== user.role;
    
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

    // Handle assignment updates
    if (roleChanged || assignedManager !== undefined) {
      if (role === "manager" && currentUser.role === "admin") {
        // When admin changes user to manager, assign admin to manager
        user.assignedAdmin = currentUser.id;
        user.assignedManager = null; // Clear manager assignment
      } else if (role === "recruiter" || user.role === "recruiter") {
        // Handle assignedManager for recruiters (current or new role)
        if (assignedManager !== undefined) {
          // Normalize the value - handle null, empty string, or "undefined" string
          const normalizedManagerId = 
            assignedManager === null || 
            assignedManager === "" || 
            assignedManager === "undefined" ||
            assignedManager === "null"
              ? null
              : String(assignedManager).trim();
          
          if (normalizedManagerId === null || normalizedManagerId === "") {
            // Clear assignment
            user.assignedManager = null;
          } else {
            // Validate that the assignedManager exists and is actually a manager
            try {
              // Check if it's a valid ObjectId format before querying
              if (!/^[0-9a-fA-F]{24}$/.test(normalizedManagerId)) {
                return res.status(400).json({
                  message: "Invalid manager ID format",
                });
              }
              
              const manager = await User.findById(normalizedManagerId);
              if (!manager) {
                return res.status(400).json({
                  message: "Selected manager does not exist",
                });
              }
              if (manager.role !== "manager") {
                return res.status(400).json({
                  message: "Selected user is not a manager",
                });
              }
              // If admin is updating, ensure the manager belongs to this admin
              if (currentUser.role === "admin") {
                if (
                  !manager.assignedAdmin ||
                  manager.assignedAdmin.toString() !== currentUser.id
                ) {
                  return res.status(403).json({
                    message: "Selected manager is not assigned to you",
                  });
                }
              }
              user.assignedManager = normalizedManagerId;
            } catch (error) {
              if (error.name === "CastError" || error.message?.includes("Cast to ObjectId")) {
                return res.status(400).json({
                  message: "Invalid manager ID format",
                });
              }
              throw error;
            }
          }
        }
        user.assignedAdmin = null; // Clear admin assignment for recruiters
      } else if (role === "admin" || (role && role !== "recruiter" && role !== "manager")) {
        // Clear assignments for other roles
        user.assignedAdmin = null;
        user.assignedManager = null;
      }
    }

    await user.save();

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      assignedAdmin: user.assignedAdmin,
      assignedManager: user.assignedManager,
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
    const recruiters = await User.find({ role: "recruiter" }).select(
      "-password"
    );
    res.status(200).json({
      message: "Recruiters fetched successfully",
      recruiters,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//get all managers
export const getManagers = async (req, res) => {
  try {
    const managers = await User.find({ role: "manager" }).select("-password");
    res.status(200).json({
      message: "Managers fetched successfully",
      managers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
