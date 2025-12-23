const multer = require('multer');
const path = require('path');
const { getUniqueFilename, paths } = require('../utils/storage');

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, paths.videos);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = getUniqueFilename(file.originalname);
    cb(null, uniqueFilename);
  }
});

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, paths.avatars);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = getUniqueFilename(file.originalname);
    cb(null, uniqueFilename);
  }
});

const videoFilter = (req, file, cb) => {
  const allowedFormats = ['video/mp4', 'video/avi', 'video/quicktime'];
  const fileExt = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.mp4', '.avi', '.mov'];
  if (allowedFormats.includes(file.mimetype) || allowedExts.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error('Only .mp4, .avi, and .mov formats are allowed'), false);
  }
};

const imageFilter = (req, file, cb) => {
  const allowedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  const fileExt = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif'];
  if (allowedFormats.includes(file.mimetype) || allowedExts.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error('Only .jpg, .jpeg, .png, and .gif formats are allowed'), false);
  }
};

const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024 // 10GB max
  }
});

const upload = multer({
  storage: avatarStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max for images
  }
});

// YouTube thumbnail upload (2MB max, JPG/PNG only)
const thumbnailStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, paths.thumbnails || 'public/uploads/thumbnails');
  },
  filename: (req, file, cb) => {
    const uniqueFilename = getUniqueFilename(file.originalname);
    cb(null, uniqueFilename);
  }
});

const thumbnailFilter = (req, file, cb) => {
  const allowedFormats = ['image/jpeg', 'image/jpg', 'image/png'];
  const fileExt = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png'];
  if (allowedFormats.includes(file.mimetype) || allowedExts.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error('Only .jpg, .jpeg, and .png formats are allowed for thumbnails'), false);
  }
};

const uploadThumbnail = multer({
  storage: thumbnailStorage,
  fileFilter: thumbnailFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB max for YouTube thumbnails
  }
});

module.exports = {
  uploadVideo,
  upload,
  uploadThumbnail
};