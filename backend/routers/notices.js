const express = require('express');
const router = express.Router();
const Notice = require('../models/Notice');
const authMiddleware = require('../middleware/auth');

// Create and publish notice (Admin only)
router.post('/create', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin only.' 
      });
    }

    const { title, content, priority, targetAudience, targetRooms } = req.body;
    
    // Validate input
    if (!title || !content || !priority || !targetAudience) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide title, content, priority, and target audience' 
      });
    }

    // Validate priority
    const validPriorities = ['Normal', 'Important', 'Urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid priority. Must be Normal, Important, or Urgent' 
      });
    }

    // Validate target audience
    const validAudiences = ['All Tenants', 'Selected Rooms'];
    if (!validAudiences.includes(targetAudience)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid target audience' 
      });
    }

    // Get admin details
    const User = require('../models/User');
    const admin = await User.findById(req.userId);
    if (!admin) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admin user not found' 
      });
    }

    // Process target rooms if provided
    let processedTargetRooms = [];
    if (targetAudience === 'Selected Rooms' && targetRooms) {
      processedTargetRooms = Array.isArray(targetRooms) ? targetRooms : targetRooms.split(',').map(room => room.trim());
    }

    // Create notice
    const notice = new Notice({
      title: title.trim(),
      content: content.trim(),
      priority,
      targetAudience,
      targetRooms: processedTargetRooms,
      createdBy: req.userId,
      createdByName: admin.name,
      status: 'Published'
    });

    await notice.save();

    // Populate the notice for response
    const populatedNotice = await Notice.findById(notice._id)
      .select('-__v')
      .lean();

    // Emit real-time notification to tenants
    if (req.io) {
      req.io.emit('new-notice', {
        noticeId: notice._id,
        title: notice.title,
        content: notice.content,
        priority: notice.priority,
        targetAudience: notice.targetAudience,
        targetRooms: notice.targetRooms,
        createdByName: admin.name,
        timestamp: new Date()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Notice published successfully',
      notice: populatedNotice
    });

  } catch (error) {
    console.error('Error creating notice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while creating notice' 
    });
  }
});

// Get active notices for tenants
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query for active notices
    let query = { 
      isDeleted: false, 
      status: { $in: ['Published', 'Updated'] }
    };

    // If target audience is selected rooms, filter by tenant's room
    if (req.user.roomNumber) {
      query.$or = [
        { targetAudience: 'All Tenants' },
        { 
          targetAudience: 'Selected Rooms',
          targetRooms: req.user.roomNumber 
        }
      ];
    } else {
      query.targetAudience = 'All Tenants';
    }

    const notices = await Notice.find(query)
      .select('-__v')
      .sort({ priority: 1, createdAt: -1 }) // Urgent first, then by date
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Notice.countDocuments(query);

    res.json({
      success: true,
      notices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching active notices:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching notices' 
    });
  }
});

// Get all notices (Admin only)
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
    
    const { priority, status, targetAudience } = req.query;
    
    // Build query
    let query = { isDeleted: false };
    if (priority) query.priority = priority;
    if (status) query.status = status;
    if (targetAudience) query.targetAudience = targetAudience;

    const notices = await Notice.find(query)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Notice.countDocuments(query);

    res.json({
      success: true,
      notices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching all notices:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching notices' 
    });
  }
});

// Update notice (Admin only)
router.put('/update/:id', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin only.' 
      });
    }

    const { title, content, priority, targetAudience, targetRooms } = req.body;
    
    const notice = await Notice.findById(req.params.id);
    
    if (!notice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Notice not found' 
      });
    }

    if (notice.isDeleted) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot update deleted notice' 
      });
    }

    // Update fields if provided
    if (title !== undefined) notice.title = title.trim();
    if (content !== undefined) notice.content = content.trim();
    if (priority !== undefined) {
      const validPriorities = ['Normal', 'Important', 'Urgent'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid priority' 
        });
      }
      notice.priority = priority;
    }
    if (targetAudience !== undefined) {
      const validAudiences = ['All Tenants', 'Selected Rooms'];
      if (!validAudiences.includes(targetAudience)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid target audience' 
        });
      }
      notice.targetAudience = targetAudience;
    }
    if (targetRooms !== undefined) {
      notice.targetRooms = Array.isArray(targetRooms) ? targetRooms : targetRooms.split(',').map(room => room.trim());
    }

    notice.status = 'Updated';
    notice.updatedBy = req.userId;
    notice.updatedAt = new Date();

    await notice.save();

    // Populate the updated notice for response
    const updatedNotice = await Notice.findById(notice._id)
      .select('-__v')
      .lean();

    // Emit real-time notification about notice update
    if (req.io) {
      req.io.emit('notice-updated', {
        noticeId: notice._id,
        title: notice.title,
        content: notice.content,
        priority: notice.priority,
        updatedAt: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Notice updated successfully',
      notice: updatedNotice
    });

  } catch (error) {
    console.error('Error updating notice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while updating notice' 
    });
  }
});

// Delete notice (Admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin only.' 
      });
    }

    const notice = await Notice.findById(req.params.id);
    
    if (!notice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Notice not found' 
      });
    }

    if (notice.isDeleted) {
      return res.status(400).json({ 
        success: false, 
        message: 'Notice already deleted' 
      });
    }

    // Soft delete the notice
    notice.isDeleted = true;
    notice.status = 'Deleted';
    notice.deletedBy = req.userId;
    notice.deletedAt = new Date();

    await notice.save();

    // Emit real-time notification about notice deletion
    if (req.io) {
      req.io.emit('notice-deleted', {
        noticeId: notice._id,
        title: notice.title,
        deletedAt: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Notice deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting notice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while deleting notice' 
    });
  }
});

// Get notice statistics (Admin only)
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin only.' 
      });
    }

    const stats = await Notice.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalNotices: { $sum: 1 },
          publishedCount: { 
            $sum: { $cond: [{ $eq: ['$status', 'Published'] }, 1, 0] }
          },
          updatedCount: { 
            $sum: { $cond: [{ $eq: ['$status', 'Updated'] }, 1, 0] }
          },
          deletedCount: { 
            $sum: { $cond: [{ $eq: ['$status', 'Deleted'] }, 1, 0] }
          }
        }
      }
    ]);

    const priorityStats = await Notice.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    const audienceStats = await Notice.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$targetAudience',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        totalNotices: 0,
        publishedCount: 0,
        updatedCount: 0,
        deletedCount: 0
      },
      priorityStats,
      audienceStats
    });

  } catch (error) {
    console.error('Error fetching notice stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching statistics' 
    });
  }
});

module.exports = router;