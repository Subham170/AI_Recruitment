import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} fileBuffer - File buffer to upload
 * @param {string} fileName - Original file name
 * @param {string} folder - Folder path in Cloudinary (optional)
 * @returns {Promise<string>} - Public URL of uploaded file
 */
export const uploadToCloudinary = async (fileBuffer, fileName, folder = "resumes") => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw new Error("Cloudinary credentials are not configured");
    }

    return new Promise((resolve, reject) => {
      // Determine MIME type based on file extension
      const fileExtension = fileName.toLowerCase().split('.').pop();
      let mimeType = 'application/pdf';
      if (fileExtension === 'doc' || fileExtension === 'docx') {
        mimeType = fileExtension === 'docx' 
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/msword';
      }

      // Convert buffer to base64 data URI
      const base64String = fileBuffer.toString("base64");
      const dataUri = `data:${mimeType};base64,${base64String}`;

      // Sanitize filename for public_id (without folder prefix - Cloudinary will add it via folder option)
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_").replace(/\.[^/.]+$/, "");
      const publicId = `${Date.now()}-${sanitizedName}`;

      cloudinary.uploader.upload(
        dataUri,
        {
          resource_type: "auto", // Let Cloudinary detect the file type automatically
          folder: folder,
          public_id: publicId,
          overwrite: false,
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            reject(new Error(`Failed to upload file to Cloudinary: ${error.message}`));
          } else {
            resolve(result.secure_url); // Return secure HTTPS URL
          }
        }
      );
    });
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw new Error(`Failed to upload file to Cloudinary: ${error.message}`);
  }
};


