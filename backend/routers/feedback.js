const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const authMiddleware = require('../middleware/auth');

// Submit feedback (Tenant only)
router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const { category, rating, message } = req.body;
    
    // Validate input
    if (!category || !rating || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide category, rating, and message' 
      });
    }

    // Validate category
    const validCategories = ['Service', 'Cleanliness', 'Food', 'Management', 'Other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid category' 
      });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rating must be between 1 and 5' 
      });
    }

    // Get user details
    const User = require('../models/User');
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Create feedback
    const feedback = new Feedback({
      tenantId: req.userId,
      tenantName: user.name,
      category,
      rating,
      message,
      status: 'Submitted'
    });

    await feedback.save();

    // Populate the feedback for response
    const populatedFeedback = await Feedback.findById(feedback._id)
      .select('-__v')
      .lean();

    // Emit real-time notification to admins
    if (req.io) {
      req.io.emit('new-feedback', {
        feedbackId: feedback._id,
        tenantName: user.name,
        category,
        rating,
        message,
        timestamp: new Date()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback: populatedFeedback
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while submitting feedback' 
    });
  }
});

// Get tenant's own feedback
router.get('/my-feedback', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const feedback = await Feedback.find({ 
      tenantId: req.userId, 
      isDeleted: false 
    })
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Feedback.countDocuments({ 
      tenantId: req.userId, 
      isDeleted: false 
    });

    res.json({
      success: true,
      feedback,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching tenant feedback:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching feedback' 
    });
  }
});

// Get all feedback (Admin only)
router.get('/all', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin only.' 
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const { category, rating, status } = req.query;
    
    // Build query
    let query = { isDeleted: false };
    if (category) query.category = category;
    if (rating) query.rating = parseInt(rating);
    if (status) query.status = status;

    const feedback = await Feedback.find(query)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Feedback.countDocuments(query);

    res.json({
      success: true,
      feedback,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching all feedback:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching feedback' 
    });
  }
});

// Reply to feedback (Admin only)
router.put('/reply/:id', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin only.' 
      });
    }

    const { adminReply } = req.body;
    
    if (!adminReply || adminReply.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a reply message' 
      });
    }

    const feedback = await Feedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({ 
        success: false, 
        message: 'Feedback not found' 
      });
    }

    if (feedback.isDeleted) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot reply to deleted feedback' 
      });
    }

    // Update feedback with admin reply
    feedback.adminReply = adminReply.trim();
    feedback.status = 'Replied';
    feedback.repliedBy = req.userId;
    feedback.repliedAt = new Date();

    await feedback.save();

    // Populate the updated feedback for response
    const updatedFeedback = await Feedback.findById(feedback._id)
      .select('-__v')
      .lean();

    // Emit real-time notification to the tenant
    if (req.io) {
      req.io.emit('feedback-replied', {
        feedbackId: feedback._id,
        tenantId: feedback.tenantId,
        adminReply: adminReply.trim(),
        repliedAt: new Date(),
        repliedBy: req.userId
      });
    }

    res.json({
      success: true,
      message: 'Reply added successfully',
      feedback: updatedFeedback
    });

  } catch (error) {
    console.error('Error replying to feedback:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while adding reply' 
    });
  }
});

// Delete feedback (Admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin only.' 
      });
    }

    const feedback = await Feedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({ 
        success: false, 
        message: 'Feedback not found' 
      });
    }

    if (feedback.isDeleted) {
      return res.status(400).json({ 
        success: false, 
        message: 'Feedback already deleted' 
      });
    }

    // Soft delete the feedback
    feedback.isDeleted = true;
    feedback.deletedBy = req.userId;
    feedback.deletedAt = new Date();

    await feedback.save();

    res.json({
      success: true,
      message: 'Feedback deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while deleting feedback' 
    });
  }
});

// Get feedback statistics (Admin only)
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin only.' 
      });
    }

    const stats = await Feedback.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalFeedback: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          submittedCount: { 
            $sum: { $cond: [{ $eq: ['$status', 'Submitted'] }, 1, 0] }
          },
          repliedCount: { 
            $sum: { $cond: [{ $eq: ['$status', 'Replied'] }, 1, 0] }
          },
          reviewedCount: { 
            $sum: { $cond: [{ $eq: ['$status', 'Reviewed'] }, 1, 0] }
          }
        }
      }
    ]);

    const categoryStats = await Feedback.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          averageRating: { $avg: '$rating' }
        }
      }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        totalFeedback: 0,
        averageRating: 0,
        submittedCount: 0,
        repliedCount: 0,
        reviewedCount: 0
      },
      categoryStats
    });

  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching statistics' 
    });
  }
});

module.exports = router;