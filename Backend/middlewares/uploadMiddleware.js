import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import ErrorHandler from './errorHandler.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const getCloudinaryResourceType = (mimetype = '') => {
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('image/')) return 'image';
  return 'raw';
};

const getUploadFolder = (mimetype = '') => {
  if (mimetype.startsWith('video/')) return 'chessmasters/videos';
  if (mimetype.startsWith('image/')) return 'chessmasters/images';
  return 'chessmasters/articles';
};

const sanitizeBaseName = (filename = 'upload') => {
  const withoutExtension = filename.replace(/\.[^/.]+$/, '');
  return withoutExtension
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'upload';
};

const getExtension = (filename = '') => {
  const match = filename.toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : '';
};

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const timestamp = Date.now();
    const resourceType = getCloudinaryResourceType(file.mimetype);
    const extension = resourceType === 'raw' ? getExtension(file.originalname) : '';

    return {
      folder: getUploadFolder(file.mimetype),
      resource_type: resourceType,
      public_id: `${timestamp}-${sanitizeBaseName(file.originalname)}${extension}`,
      use_filename: false,
      unique_filename: false,
    };
  },
});

// File filter to accept only specific file types
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith('video/') || // Allow video files
    file.mimetype === 'application/pdf' || // Allow PDF files
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || // Allow DOCX files
    file.mimetype.startsWith('image/') // Allow image files
  ) {
    cb(null, true);
  } else {
    cb(new ErrorHandler('Only images, PDF, DOCX, and video files are allowed!', 400), false);
  }
};

// Custom file size limits
const limits = {
  fileSize: 100 * 1024 * 1024, // 100MB max file size
};

// Create multer upload instance
const upload = multer({ 
  storage, 
  fileFilter,
  limits
});

// Middleware to handle Multer errors
export const handleUploadErrors = (req, res, next) => {
  return (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ErrorHandler('File too large. Maximum size is 100MB', 400));
      }
      return next(new ErrorHandler(`Upload error: ${err.message}`, 400));
    }
    
    if (err) {
      return next(err); // Pass on to the main error handler
    }
    
    next();
  };
};

export const deleteCloudinaryAsset = async (publicId, resourceType = 'raw') => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
  } catch (error) {
    console.error('Error deleting Cloudinary asset:', error);
  }
};

export { getCloudinaryResourceType };

export default upload;
