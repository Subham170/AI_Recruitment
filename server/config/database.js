import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://Subham_DB:iliboned@subhamdb.ubqol0o.mongodb.net/AI-Recruitment?retryWrites=true&w=majority&appName=SubhamDB', {
      // These options are no longer needed in newer versions of Mongoose
      // but kept for compatibility
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;

