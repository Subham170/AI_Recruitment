import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../user/model.js";

// Load environment variables
dotenv.config();

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/ai-recruitment"
    );
    console.log("✅ Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("❌ Admin user already exists!");
      console.log(`   Email: ${existingAdmin.email}`);
      process.exit(0);
    }

    // Default admin credentials (change these!)
    const adminData = {
      name: "Subham_Admin",
      email: "subham_admin@gmail.com",
      password: "Admin@123", // Change this password!
      role: "admin",
    };

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminData.password, salt);

    // Create admin user
    const admin = await User.create({
      name: adminData.name,
      email: adminData.email,
      password: hashedPassword,
      role: adminData.role,
    });

    console.log("✅ Admin user created successfully!");
    console.log(`   Name: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${adminData.password}`);
    console.log(
      "\n⚠️  IMPORTANT: Change the default password after first login!"
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding admin:", error.message);
    process.exit(1);
  }
};

seedAdmin();
