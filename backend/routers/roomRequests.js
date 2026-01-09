const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const RoomRequest = require('../models/RoomRequest');
const Room = require('../models/Room');
const User = require('../models/User');

// Create a room request (tenant only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    console.log('POST /api/room-requests - Request body:', req.body);
    console.log('POST /api/room-requests - User:', req.user);
    console.log('POST /api/room-requests - UserId:', req.userId);
    
    if (req.user.role !== 'tenant') {
      return res.status(403).json({ message: 'Only tenants can create room requests' });
    }

    const { roomId } = req.body;
    if (!roomId) {
      return res.status(400).json({ message: 'Room ID is required' });
    }

    // Check if room exists and has available space
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.tenants.length >= room.capacity) {
      return res.status(400).json({ message: 'Room is at full capacity' });
    }

    // Check if tenant is already allocated to this room
    const alreadyAllocated = room.tenants.find(t => String(t) === String(req.userId));
    if (alreadyAllocated) {
      return res.status(400).json({ message: 'You are already allocated to this room' });
    }

    // Check if tenant already has any request for this room
    const existingRequest = await RoomRequest.findOne({
      roomId,
      tenantId: req.userId
    });

    if (existingRequest) {
      return res.status(409).json({ message: 'You already have a request for this room' });
    }

    // Get tenant details
    const tenant = await User.findById(req.userId);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const roomRequest = new RoomRequest({
      roomId,
      tenantId: req.userId,
      tenantName: tenant.name,
      tenantEmail: tenant.email,
      status: 'Pending',
      requestedAt: new Date()
    });

    await roomRequest.save();

    // Populate room details for response
    const populatedRequest = await RoomRequest.findById(roomRequest._id)
      .populate('roomId', 'roomNumber type capacity floor')
      .populate('tenantId', 'name email');

    res.status(201).json({ 
      message: 'Room request created successfully',
      request: populatedRequest 
    });

  } catch (error) {
    console.error('Error creating room request:', error);
    console.error('Error stack:', error.stack);

    // Handle duplicate key errors from unique index on roomId + tenantId
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'You already have a request for this room',
        error: 'DUPLICATE_ROOM_REQUEST'
      });
    }

    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all room requests (admin only)
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view all room requests' });
    }

    const { roomId, status } = req.query;
    
    let filter = {};
    if (roomId) filter.roomId = roomId;
    if (status) filter.status = status;

    const requests = await RoomRequest.find(filter)
      .populate('roomId', 'roomNumber type capacity floor')
      .populate('tenantId', 'name email')
      .populate('reviewedBy', 'name email')
      .sort({ requestedAt: -1 });

    res.json({ requests });

  } catch (error) {
    console.error('Error fetching room requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get room requests for a specific room (admin only)
router.get('/room/:roomId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view room requests' });
    }

    const { roomId } = req.params;
    const { status } = req.query;

    let filter = { roomId };
    if (status) filter.status = status;

    const requests = await RoomRequest.find(filter)
      .populate('roomId', 'roomNumber type capacity floor')
      .populate('tenantId', 'name email')
      .populate('reviewedBy', 'name email')
      .sort({ requestedAt: -1 });

    res.json({ requests });

  } catch (error) {
    console.error('Error fetching room requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get room requests for current tenant (tenant only)
router.get('/my-requests', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'tenant') {
      return res.status(403).json({ message: 'Only tenants can view their requests' });
    }

    const requests = await RoomRequest.find({ tenantId: req.userId })
      .populate('roomId', 'roomNumber type capacity floor')
      .sort({ requestedAt: -1 });

    res.json({ requests });

  } catch (error) {
    console.error('Error fetching tenant requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve or reject a room request (admin only)
router.patch('/:requestId/status', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can approve/reject requests' });
    }

    const { requestId } = req.params;
    const { status } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be Approved or Rejected' });
    }

    const request = await RoomRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Room request not found' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ message: 'Request is not pending' });
    }

    // If approving, allocate tenant to room
    if (status === 'Approved') {
      const room = await Room.findById(request.roomId);
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      if (room.tenants.length >= room.capacity) {
        return res.status(400).json({ message: 'Room is at full capacity' });
      }

      // Check if tenant is already allocated
      const alreadyAllocated = room.tenants.find(t => String(t) === String(request.tenantId));
      if (alreadyAllocated) {
        return res.status(400).json({ message: 'Tenant is already allocated to this room' });
      }

      // Find and remove tenant from any existing rooms
      const existingRooms = await Room.find({ tenants: request.tenantId });
      console.log(`Found ${existingRooms.length} existing rooms for tenant ${request.tenantId}`);
      
      for (const existingRoom of existingRooms) {
        console.log(`Removing tenant ${request.tenantId} from room ${existingRoom.roomNumber} (${existingRoom._id})`);
        existingRoom.tenants = existingRoom.tenants.filter(t => String(t) !== String(request.tenantId));
        existingRoom.occupied = existingRoom.tenants.length;
        existingRoom.status = existingRoom.occupied >= existingRoom.capacity ? 'occupied' : 'available';
        await existingRoom.save();
        console.log(`Updated room ${existingRoom.roomNumber}: ${existingRoom.occupied}/${existingRoom.capacity} tenants`);
      }

      // Clear user's current room if they were removed from all rooms
      if (existingRooms.length > 0) {
        const tenant = await User.findById(request.tenantId);
        if (tenant && tenant.currentRoom) {
          // Check if user is still in any room
          const stillInRoom = await Room.findOne({ tenants: request.tenantId });
          if (!stillInRoom) {
            tenant.currentRoom = null;
            await tenant.save();
            console.log(`Cleared current room for user ${tenant.name} - removed from all rooms`);
          }
        }
      }

      // Allocate tenant to new room
      room.tenants.push(request.tenantId);
      room.occupied = room.tenants.length;
      room.status = room.occupied >= room.capacity ? 'occupied' : 'available';
      await room.save();
      console.log(`Allocated tenant ${request.tenantId} to room ${room.roomNumber}: ${room.occupied}/${room.capacity} tenants`);

      // Update user's current room
      const tenant = await User.findById(request.tenantId);
      if (tenant) {
        tenant.currentRoom = room._id;
        await tenant.save();
        console.log(`Updated user ${tenant.name} current room to ${room.roomNumber}`);
      }
    }

    // Update request status
    request.status = status;
    request.reviewedAt = new Date();
    request.reviewedBy = req.userId;
    await request.save();

    // Update user status and send notification
    try {
      const tenant = await User.findById(request.tenantId);
      if (tenant) {
        if (status === 'Approved') {
          // Update user status to reflect room assignment
          console.log(`Room request approved: Updating status for tenant ${tenant.name}`);
          // The room assignment is already handled above in the approval logic
        } else if (status === 'Rejected') {
          // Update user status for rejection
          console.log(`Room request rejected: Updating status for tenant ${tenant.name}`);
          // Optionally, you could clear the user's current room if needed
          // But typically rejection doesn't affect current room assignment
        }
      }
    } catch (userError) {
      console.error('Error updating user status:', userError);
      // Don't fail the entire request if user update fails
    }

    // Populate for response
    const updatedRequest = await RoomRequest.findById(requestId)
      .populate('roomId', 'roomNumber type capacity floor')
      .populate('tenantId', 'name email')
      .populate('reviewedBy', 'name email');

    let message = `Room request ${status.toLowerCase()} successfully`;
    if (status === 'Approved') {
      message = `Tenant moved to room ${updatedRequest.roomId.roomNumber} successfully`;
    }

    res.json({ 
      message: message,
      request: updatedRequest 
    });

  } catch (error) {
    console.error('Error updating room request status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a room request (admin or tenant who created it)
router.delete('/:requestId', authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await RoomRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Room request not found' });
    }

    // Check if user can delete this request
    if (req.user.role !== 'admin' && String(request.tenantId) !== String(req.userId)) {
      return res.status(403).json({ message: 'You can only delete your own requests' });
    }

    // Only allow deletion of pending requests
    if (request.status !== 'Pending') {
      return res.status(400).json({ message: 'Can only delete pending requests' });
    }

    await RoomRequest.findByIdAndDelete(requestId);

    res.json({ message: 'Room request deleted successfully' });

  } catch (error) {
    console.error('Error deleting room request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
