const multer = require('multer');
const path = require('path')

// Define storage options (where the file will be saved and how it will be named)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Store the images in the 'uploads' directory (ensure this folder exists)
        cb(null, path.join(__dirname, '../public/uploads'));
    },
    filename: (req, file, cb) => {
        // Create a unique filename by appending the current timestamp to the original filename
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// File filter to accept only image files
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images are allowed.'));
    }
};

// Set file size limit (optional, e.g., 5MB)
const limits = {
    fileSize: 5 * 1024 * 1024 // 5MB limit
};

// Initialize multer with storage, file filter, and limits
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: limits
});


module.exports= upload
