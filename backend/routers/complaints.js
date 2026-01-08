const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Complaint = require('../models/Complaint');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'complaint-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Helper: check admin / warden role (here: admin or owner treated as warden)
const requireAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'owner')) {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

// ================== STUDENT / TENANT ROUTES ==================

// Optional image upload: only run multer if request is multipart/form-data
const optionalImageUpload = (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.toLowerCase().startsWith('multipart/form-data')) {
    upload.single('image')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File size too large. Maximum size is 5MB.' });
          }
          return res.status(400).json({ message: err.message || 'File upload error' });
        }
        return res.status(400).json({ message: err.message || 'File upload error' });
      }
      return next();
    });
  } else {
    return next();
  }
};

// Create complaint (tenant)
router.post('/', auth, optionalImageUpload, async (req, res) => {
  try {
    const { title, description, category, priority, roomNumber } = req.body;

    if (!title || !description || !category) {
      // Delete uploaded file if validation fails
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkErr) {
          console.error('Error deleting uploaded file:', unlinkErr);
        }
      }
      return res.status(400).json({ message: 'Title, description and category are required' });
    }

    const complaintData = {
      title,
      description,
      category,
      priority: priority || 'medium',
      roomNumber: roomNumber || '',
      submittedBy: req.userId
    };

    // Handle image upload
    if (req.file) {
      // Use full URL for the image (adjust base URL as needed)
      const baseUrl = req.protocol + '://' + req.get('host');
      const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;
      complaintData.attachments = [{
        filename: req.file.originalname,
        url: imageUrl,
        uploadedAt: new Date()
      }];
    }

    const complaint = new Complaint(complaintData);

    await complaint.save();

    res.status(201).json({ message: 'Complaint created', complaint });
  } catch (error) {
    // Delete uploaded file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        console.error('Error deleting uploaded file:', unlinkErr);
      }
    }
    console.error('Error creating complaint:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Get complaints for logged in student
router.get('/', auth, async (req, res) => {
  try {
    // Tenants / students: see only their own complaints
    const filter = { submittedBy: req.userId };

    const complaints = await Complaint.find(filter)
      .populate('submittedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ complaints });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete own complaint
router.delete('/:id', auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Student can delete only own complaint; admin can delete any (handled below)
    if (String(complaint.submittedBy) !== String(req.userId) &&
        (!req.user || (req.user.role !== 'admin' && req.user.role !== 'owner'))) {
      return res.status(403).json({ message: 'Not authorized to delete this complaint' });
    }

    await complaint.deleteOne();
    res.json({ message: 'Complaint deleted' });
  } catch (error) {
    console.error('Error deleting complaint:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ================== ADMIN / WARDEN ROUTES ==================

// Get all complaints for admin
router.get('/admin', auth, requireAdmin, async (req, res) => {
  try {
    const complaints = await Complaint.find({})
      .populate('submittedBy', 'name email')
      .sort({ createdAt: -1 });

    // adapt shape slightly for frontend convenience
    const mapped = complaints.map(c => ({
      ...c.toObject(),
      studentName: c.submittedBy?.name || 'Unknown',
      studentEmail: c.submittedBy?.email || '',
      roomNumber: c.roomNumber || '—'
    }));

    console.log(`[Complaints Admin] Found ${mapped.length} complaints`);
    res.json({ complaints: mapped });
  } catch (error) {
    console.error('Error fetching admin complaints:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Update complaint status / admin response
router.patch('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { status, response } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    if (status) {
      complaint.status = status;
      // If using resolution.status mapping, adjust here; we keep it simple
      if ((status === 'resolved' || status === 'closed') && !complaint.resolution?.resolvedAt) {
        complaint.resolution = complaint.resolution || {};
        complaint.resolution.resolvedAt = new Date();
        complaint.resolution.resolvedBy = req.userId;
      }
    }

    if (typeof response === 'string') {
      complaint.resolution = complaint.resolution || {};
      complaint.resolution.description = response;
      if (!complaint.resolution.resolvedBy) {
        complaint.resolution.resolvedBy = req.userId;
      }
      if (!complaint.resolution.resolvedAt) {
        complaint.resolution.resolvedAt = new Date();
      }
    }

    await complaint.save();

    res.json({ message: 'Complaint updated', complaint });
  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

