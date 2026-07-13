import multer from 'multer';
import { config } from 'dotenv';
import axios from 'axios';
import FormData from 'form-data';
import { v2 as cloudinary } from 'cloudinary';
import ErrorHandler from './errorHandler.js';

config();

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

const extensionMatchesMimeType = (filename = '', mimetype = '') => {
  const extension = getExtension(filename);
  if (mimetype === 'application/pdf') return extension === '.pdf';
  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return extension === '.docx';
  if (mimetype === 'video/mp4') return extension === '.mp4';
  if (mimetype === 'video/quicktime') return ['.mov', '.qt'].includes(extension);
  if (mimetype === 'video/x-msvideo' || mimetype === 'video/avi') return extension === '.avi';
  if (mimetype.startsWith('image/')) return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension);
  return false;
};

const storage = {
  async _handleFile(req, file, cb) {
    const resourceType = getCloudinaryResourceType(file.mimetype);
    const extension = resourceType === 'raw' ? getExtension(file.originalname) : '';
    const publicId = `${Date.now()}-${sanitizeBaseName(file.originalname)}${extension}`;
    const uploadParams = {
      folder: getUploadFolder(file.mimetype),
      public_id: publicId,
      timestamp: Math.round(Date.now() / 1000),
    };
    const signature = cloudinary.utils.api_sign_request(
      uploadParams,
      process.env.CLOUDINARY_API_SECRET
    );
    const formData = new FormData();

    Object.entries(uploadParams).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append('api_key', process.env.CLOUDINARY_API_KEY);
    formData.append('signature', signature);
    formData.append('file', file.stream, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    try {
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
        formData,
        {
          headers: formData.getHeaders(),
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        }
      );

      cb(null, {
        path: response.data.secure_url,
        size: response.data.bytes,
        filename: response.data.public_id,
        resource_type: response.data.resource_type,
      });
    } catch (error) {
      const message = error.response?.data?.error?.message
        || error.response?.data?.message
        || error.message
        || 'Cloudinary upload failed';
      cb(new Error(`Cloudinary upload failed: ${message}`));
    }
  },
  _removeFile(req, file, cb) {
    cloudinary.uploader.destroy(
      file.filename,
      { resource_type: file.resource_type || 'image', invalidate: true },
      cb
    );
  }
};

// File filter to accept only specific file types
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith('video/') || // Allow video files
    file.mimetype === 'application/pdf' || // Allow PDF files
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || // Allow DOCX files
    file.mimetype.startsWith('image/') // Allow image files
  ) {
    if (!extensionMatchesMimeType(file.originalname, file.mimetype)) {
      cb(new ErrorHandler('File extension does not match the uploaded file type.', 400), false);
      return;
    }
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

export const deleteCloudinaryAsset = async (publicId, resourceType = 'image') => {
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

export const getCloudinaryDownloadUrl = (publicId, resourceType = 'raw', attachment = true) => {
  if (!publicId) return "";
  return cloudinary.utils.private_download_url(publicId, undefined, {
    resource_type: resourceType,
    type: 'upload',
    attachment,
    expires_at: Math.round(Date.now() / 1000) + 300,
  });
};

export { getCloudinaryResourceType };

export default upload;
