import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import config from '../config';
import './Rooms.css';
import Rooms from './Rooms';

const SharedRooms = ({ userRole = 'tenant' }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [requestedRooms, setRequestedRooms] = useState(new Set());
  const [isRoomRequestsModalOpen, setIsRoomRequestsModalOpen] = useState(false);
  const [selectedRoomForRequests, setSelectedRoomForRequests] = useState(null);
  const [roomRequests, setRoomRequests] = useState([]);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [selectedRoomForAllocation, setSelectedRoomForAllocation] = useState(null);
  const [unallocatedTenants, setUnallocatedTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false);
  const [newRoom, setNewRoom] = useState({
    floorLabel: 'f1',
    floor: 1,
    roomNumber: '',
    type: 'single',
    capacity: 1,
    price: 4000
  });

  

  const groupByFloor = (list) => {
    const map = {};
    const arr = Array.isArray(list) ? list : [];
    for (const r of arr) {
      const f = typeof r.floor === 'number' ? r.floor : 1;
      if (!map[f]) map[f] = [];
      map[f].push(r);
    }
    return map;
  };

  const shareFromType = (t) => {
    if (t === 'single') return 'Single share';
    if (t === 'double') return '2 share';
    if (t === 'triple') return '3 share';
    return 'Dormitory';
  };
  const PRICING = { single: 4000, double: 3750, triple: 3000 };
  const CAPACITY = { single: 1, double: 2, triple: 3 };

  const parseFloorLabel = (label) => {
    const m = String(label).toLowerCase().match(/^f(\d+)$/);
    return m ? Number(m[1]) : 1;
  };
  const formatFloorLabel = (floorNum) => `f${floorNum}`;
  const generateRoomNumber = (floorNum) => {
    const floorRooms = rooms.filter(r => (r.floor || 1) === floorNum);
    const seqs = floorRooms
      .map(r => {
        const m = String(r.roomNumber || '').toLowerCase().match(new RegExp(`^f${floorNum}r(\\d+)$`));
        return m ? Number(m[1]) : null;
      })
      .filter(v => v !== null);
    const next = seqs.length ? Math.max(...seqs) + 1 : 1;
    return `f${floorNum}r${next}`;
  };
  const getBedLabels = (floorNum, roomNumber) => {
    const m = String(roomNumber).toLowerCase().match(/^f(\d+)r(\d+)$/);
    const rSeq = m ? Number(m[2]) : 1;
    const beds = CAPACITY[newRoom.type] || 1;
    const labels = [];
    for (let i = 1; i <= beds; i++) {
      labels.push(`f${floorNum},r${rSeq},b${i}`);
    }
    return labels;
  };
  const isRoomNumberExists = (rn) => rooms.some(r => String(r.roomNumber).toLowerCase() === String(rn).toLowerCase());
  const openCreateModal = () => {
    const floorNum = 1;
    setNewRoom({
      floorLabel: formatFloorLabel(floorNum),
      floor: floorNum,
      roomNumber: generateRoomNumber(floorNum),
      type: 'single',
      capacity: CAPACITY['single'],
      price: PRICING['single']
    });
    setIsCreateSubmitting(false);
    setIsCreateModalOpen(true);
  };
  const handleCreateInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'floorLabel') {
      const floorNum = parseFloorLabel(value);
      setNewRoom(prev => {
        const rn = generateRoomNumber(floorNum);
        return { ...prev, floorLabel: value, floor: floorNum, roomNumber: rn };
      });
    } else if (name === 'type') {
      const cap = CAPACITY[value];
      const price = PRICING[value];
      setNewRoom(prev => ({ ...prev, type: value, capacity: cap, price }));
    } else {
      setNewRoom(prev => ({ ...prev, [name]: value }));
    }
  };
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const { roomNumber, type, capacity, price, floor } = newRoom;
    if (!roomNumber || !type || !capacity || !price || !floor) {
      alert('Please fill in all required fields');
      return;
    }
    if (isRoomNumberExists(roomNumber)) {
      alert('Room number already exists. Please choose a different room number.');
      return;
    }
    try {
      setIsCreateSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.post(`${config.API_URL}/rooms`, {
        roomNumber,
        type,
        capacity: Number(capacity),
        price: Number(price),
        floor: Number(floor)
      }, { headers: { Authorization: `Bearer ${token}` } });
      setIsCreateModalOpen(false);
      await fetchRooms();
      alert('Room created');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create room');
    } finally {
      setIsCreateSubmitting(false);
    }
  };

  const fetchRooms = useCallback(async () => {
    try {
      const token = getToken();
      const res = await axios.get(`${config.API_URL}/rooms`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setRooms(res.data.rooms);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoomRequests = useCallback(async () => {
    if (userRole === 'tenant') {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${config.API_URL}/room-requests/my-requests`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const requestedRoomIds = new Set(res.data.requests.map(req => req.roomId._id));
        setRequestedRooms(requestedRoomIds);
      } catch (error) {
        console.error('Error fetching room requests:', error);
      }
    }
  }, [userRole]);

  useEffect(() => {
    fetchRooms();
    fetchRoomRequests();
  }, [userRole, fetchRooms, fetchRoomRequests]);

  const handleChooseRoom = (room) => {
    console.log('handleChooseRoom called with room:', room);
    console.log('Room ID:', room._id);
    console.log('User role:', userRole);
    setSelectedRoom(room);
    setIsConfirmModalOpen(true);
  };

  const getToken = () => localStorage.getItem('token');

  const confirmRoomRequest = async () => {
    if (selectedRoom) {
      try {
        const token = getToken();
        if (!token) {
          alert('Please login first');
          return;
        }
        const response = await axios.post(`${config.API_URL}/room-requests`,
          { roomId: selectedRoom._id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log('Room request response:', response);
        
        // Update local state
        setRequestedRooms(prev => new Set([...prev, selectedRoom._id]));
        
        alert('Room request submitted successfully!');
      } catch (err) {
        console.error('Room request error details:', err);
        console.error('Error response:', err.response);
        console.error('Error message:', err.message);
        alert(err.response?.data?.message || 'Failed to submit room request');
      }
    }
    setIsConfirmModalOpen(false);
    setSelectedRoom(null);
  };

  const handleViewRoomRequests = async (room) => {
    setSelectedRoomForRequests(room);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.API_URL}/room-requests/room/${room._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Room requests API response:', response.data);
      console.log('Room requests data:', response.data.requests);
      console.log('Number of requests:', response.data.requests?.length);
      // Log the structure of the first request to understand the data format
      if (response.data.requests && response.data.requests.length > 0) {
        console.log('First request structure:', JSON.stringify(response.data.requests[0], null, 2));
        console.log('First request tenantId type:', typeof response.data.requests[0].tenantId);
        console.log('First request tenantId value:', response.data.requests[0].tenantId);
      }
      setRoomRequests(response.data.requests);
      setIsRoomRequestsModalOpen(true);
    } catch (err) {
      console.error('Error fetching room requests:', err);
      alert(err.response?.data?.message || 'Failed to fetch room requests');
    }
  };

  const handleApproveRequest = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${config.API_URL}/room-requests/${requestId}/status`,
        { status: 'Approved' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh room requests and rooms
      await handleViewRoomRequests(selectedRoomForRequests);
      await fetchRooms();
      
      alert('Room request approved successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${config.API_URL}/room-requests/${requestId}/status`,
        { status: 'Rejected' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh room requests
      await handleViewRoomRequests(selectedRoomForRequests);
      
      alert('Room request rejected successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject request');
    }
  };

  const deleteRoom = async (roomId) => {
    if (!window.confirm('Delete this room?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${config.API_URL}/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchRooms();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete room');
    }
  };

  const removeTenant = async (roomId, tenantId) => {
    if (!window.confirm('Remove this occupant from the room?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${config.API_URL}/rooms/${roomId}/tenants/${tenantId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchRooms();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove occupant');
    }
  };

  const allocateTenant = async (roomId, tenantEmail) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${config.API_URL}/rooms/${roomId}/assign`, 
        { email: tenantEmail }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchRooms();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to allocate tenant');
    }
  };

  const openAllocateModal = async (room) => {
    setSelectedRoomForAllocation(room);
    setSelectedTenantId('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.API_URL}/users/unallocated`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnallocatedTenants(response.data);
      setIsAllocateModalOpen(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to fetch unallocated tenants');
    }
  };

  const handleAllocateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTenantId) {
      alert('Please select a tenant');
      return;
    }
    
    const tenant = unallocatedTenants.find(t => t._id === selectedTenantId);
    if (!tenant) return;

    try {
      await allocateTenant(selectedRoomForAllocation._id, tenant.email);
      setIsAllocateModalOpen(false);
      setSelectedRoomForAllocation(null);
      setSelectedTenantId('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to allocate tenant');
    }
  };

  const getAvailableBeds = (room) => {
    const occupiedCount = Array.isArray(room.tenants) ? room.tenants.length : (room.occupied || 0);
    return Math.max(0, (room.capacity || 0) - occupiedCount);
  };

  const isRoomRequested = (roomId) => {
    return requestedRooms.has(roomId);
  };

  const getRoomRequestStatus = (roomId) => {
    // Find the actual request for this room
    const request = roomRequests.find(req => req.roomId?._id === roomId);
    return request ? request.status : null;
  };

  const getFilteredRooms = () => {
    return rooms;
  };

  return (
    <div className="content-area">
        <>
          <div className="page-header">
            <h1>Rooms</h1>
            {userRole === 'admin' && (
              <button className="btn-primary" onClick={openCreateModal}>
                Create Room
              </button>
            )}
          </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <div className="spinner"></div>
          <p>Loading rooms...</p>
        </div>
      ) : (
        <div>
          {getFilteredRooms().length === 0 && (
            <div className="card" style={{ padding: 24 }}>
              <h2>No rooms found</h2>
              <p style={{ color: '#6b7280' }}>No rooms available at the moment.</p>
            </div>
          )}

          {Object.entries(groupByFloor(getFilteredRooms())).map(([floor, list]) => (
            <div key={floor} style={{ marginBottom: 24 }}>
              <div className="card-header">
                <h2>Floor {floor} • {list.length} rooms</h2>
              </div>
              <div className="rooms-grid">
                {list.map((room) => {
                  const occupiedCount = Array.isArray(room.tenants) ? room.tenants.length : (room.occupied || 0);
                  const shareLabel = shareFromType(room.type);
                  const availableBeds = getAvailableBeds(room);
                  const isRequested = isRoomRequested(room._id);
                  const roomRequestStatus = getRoomRequestStatus(room._id);
                  const occupantNames = Array.isArray(room.tenants) ? room.tenants.map(t => t.name).filter(Boolean) : [];

                  return (
                    <div 
                      className={`room-card card ${isRequested ? 'requested' : ''}`} 
                      key={room._id}
                      style={{
                        border: roomRequestStatus === 'Approved' ? '2px solid #10b981' : 
                                roomRequestStatus === 'Rejected' ? '2px solid #ef4444' :
                                isRequested ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                        backgroundColor: roomRequestStatus === 'Approved' ? '#f0fdf4' :
                                        roomRequestStatus === 'Rejected' ? '#fef2f2' :
                                        isRequested ? '#eff6ff' : '#ffffff'
                      }}
                    >
                      <div className="card-header">
                        <h2>Room {room.roomNumber}</h2>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {roomRequestStatus && (
                            <span className={`status ${roomRequestStatus.toLowerCase()}`}>
                              {roomRequestStatus === 'Approved' ? '✅ Approved' : 
                               roomRequestStatus === 'Rejected' ? '❌ Rejected' : 
                               '⏳ Requested'}
                            </span>
                          )}
                          <span className={`status ${room.status === 'occupied' ? 'occupied' : room.status === 'maintenance' ? 'maintenance' : 'available'}`}>
                            {room.status === 'occupied' ? 'Occupied' : room.status === 'maintenance' ? 'Maintenance' : 'Available'}
                          </span>
                        </div>
                      </div>

                      <div className="card-body">
                        <p><strong>Shares:</strong> {shareLabel}</p>
                        <p><strong>Capacity:</strong> {room.capacity}</p>
                        <p><strong>Occupied:</strong> {occupiedCount}{occupantNames.length ? ` (${occupantNames.join(', ')})` : ''}</p>
                        <p><strong>Available Beds:</strong> {availableBeds}</p>
                        <p><strong>Price:</strong> ₹{room.price}</p>

                        {Array.isArray(room.tenants) && room.tenants.length > 0 && (
                          <div className="occupants">
                            <p><strong>Occupants:</strong></p>
                            {room.tenants.map((t, idx) => (
                              <div key={t._id} className="occupant-row">
                                <div>
                                  <div className="occupant-name">{t.name}</div>
                                  <div className="occupant-email">{t.email}</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                    Bed: {`${room.roomNumber}B${idx + 1}`}
                                  </div>
                                </div>
                                {userRole === 'admin' && (
                                  <button 
                                    className="text-btn remove" 
                                    onClick={() => removeTenant(room._id, t._id)}
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="room-actions">
                          {userRole === 'tenant' && (
                            availableBeds > 0 ? (
                              !roomRequestStatus ? (
                                <button 
                                  className="btn-primary success" 
                                  onClick={() => handleChooseRoom(room)}
                                >
                                  Choose Room
                                </button>
                              ) : (
                                <button className="btn-secondary" disabled>
                                  {roomRequestStatus === 'Approved' ? '✅ Approved' : 
                                   roomRequestStatus === 'Rejected' ? '❌ Rejected' : 
                                   '⏳ Requested'}
                                </button>
                              )
                            ) : (
                              <button className="btn-secondary" disabled>
                                Fully Occupied
                              </button>
                            )
                          )}

                          {userRole === 'admin' && (
                            <>
                              {availableBeds > 0 && (
                                <button 
                                  className="btn-primary success"
                                  onClick={() => openAllocateModal(room)}
                                >
                                  Allocate
                                </button>
                              )}
                              <button 
                                className="btn-primary info"
                                onClick={() => handleViewRoomRequests(room)}
                              >
                                Room Requests
                              </button>
                              <button 
                                className="btn-primary danger"
                                onClick={() => deleteRoom(room._id)}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal for Room Selection */}
      {isConfirmModalOpen && selectedRoom && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Confirm Room Selection</h2>
              <button className="close-btn" onClick={() => setIsConfirmModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p><strong>Room Number:</strong> {selectedRoom.roomNumber}</p>
              <p><strong>Type:</strong> {shareFromType(selectedRoom.type)}</p>
              <p><strong>Capacity:</strong> {selectedRoom.capacity}</p>
              <p><strong>Available Beds:</strong> {getAvailableBeds(selectedRoom)}</p>
              <p><strong>Price:</strong> ₹{selectedRoom.price}</p>
              <p style={{ marginTop: '16px', color: '#6b7280' }}>
                Are you sure you want to request this room? This action will notify the admin.
              </p>
            </div>
            <div className="modal-actions">
              <button 
                className="btn-secondary" 
                onClick={() => setIsConfirmModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary success" 
                onClick={confirmRoomRequest}
              >
                Request Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Requests Modal for Admin */}
      {isRoomRequestsModalOpen && selectedRoomForRequests && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Room Requests - Room {selectedRoomForRequests.roomNumber}</h2>
              <button className="close-btn" onClick={() => setIsRoomRequestsModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              {console.log('Modal rendering - roomRequests:', roomRequests)}
              {console.log('Modal rendering - roomRequests.length:', roomRequests.length)}
              {roomRequests.length === 0 ? (
                <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
                  No requests for this room yet.
                </p>
              ) : (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {roomRequests.map((request) => {
                    console.log('Rendering request:', request);
                    if (!request) {
                      console.log('Request is null/undefined, skipping');
                      return null;
                    }
                    return (
                    <div key={request._id || Math.random()} style={{ 
                      padding: '12px', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px', 
                      marginBottom: '8px',
                      backgroundColor: '#f9fafb'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '600', color: '#111827' }}>{request.tenantName || request.tenantId?.name || 'Unknown Tenant'}</div>
                          <div style={{ color: '#6b7280', fontSize: '14px' }}>{request.tenantEmail || request.tenantId?.email || 'No email'}</div>
                          <div style={{ color: '#6b7280', fontSize: '12px' }}>ID: {(typeof request.tenantId === 'object' ? request.tenantId?._id : request.tenantId) || 'No ID'}</div>
                        </div>
                        <span className={`status ${(request.status || 'pending').toLowerCase()}`}>
                          {request.status || 'Unknown'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                        Requested: {request.requestedAt ? new Date(request.requestedAt).toLocaleDateString() : 'Unknown date'}
                      </div>
                      {userRole === 'admin' && request.status === 'Pending' && (
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                          <button
                            className="btn-primary success"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleApproveRequest(request._id)}
                          >
                            Approve
                          </button>
                          <button
                            className="btn-primary danger"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleRejectRequest(request._id)}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button 
                className="btn-secondary" 
                onClick={() => setIsRoomRequestsModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Allocate Tenant Modal */}
      {isAllocateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Allocate Room {selectedRoomForAllocation?.roomNumber}</h2>
              <button className="close-btn" onClick={() => setIsAllocateModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleAllocateSubmit}>
              <div className="form-group">
                <label>Select Tenant</label>
                {unallocatedTenants.length === 0 ? (
                  <p style={{ color: '#6b7280', padding: '8px 0' }}>No unallocated tenants available.</p>
                ) : (
                  <select 
                    value={selectedTenantId} 
                    onChange={(e) => setSelectedTenantId(e.target.value)}
                    required
                  >
                    <option value="">Choose a tenant...</option>
                    {unallocatedTenants.map(tenant => (
                      <option key={tenant._id} value={tenant._id}>
                        {tenant.name} ({tenant.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsAllocateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary success" disabled={unallocatedTenants.length === 0}>
                  Allocate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Create Room Modal (Admin) */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content room-modal">
            <div className="modal-header room-modal-header">
              <div className="header-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <div className="header-content">
                <h2>Create New Room</h2>
                <p>Add a new room with f-floor, room and bed labels</p>
              </div>
              <button className="close-btn" onClick={() => setIsCreateModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateSubmit} className="room-form">
              <div className="form-row">
                <div className="form-group floating-label">
                  <select
                    name="floorLabel"
                    value={newRoom.floorLabel}
                    onChange={handleCreateInputChange}
                    className="form-select"
                    required
                  >
                    {Array.from({ length: 10 }).map((_, i) => {
                      const label = `f${i + 1}`;
                      return <option key={label} value={label}>{label.toUpperCase()}</option>;
                    })}
                  </select>
                  <label className="form-label">
                    <span className="label-icon">🏢</span>
                    Floor
                  </label>
                  <span className="input-hint">Select floor (f1, f2, f3 ...)</span>
                </div>
                <div className="form-group floating-label">
                  <input
                    type="text"
                    name="roomNumber"
                    value={newRoom.roomNumber}
                    onChange={handleCreateInputChange}
                    placeholder=" "
                    className="form-input"
                    required
                    style={{ backgroundColor: newRoom.roomNumber && isRoomNumberExists(newRoom.roomNumber) ? '#ffebee' : '#ffffff' }}
                  />
                  <label className="form-label">
                    <span className="label-icon">🏠</span>
                    Room Number
                  </label>
                  <span className="input-hint">Format: f{newRoom.floor}rN (e.g., f1r1)</span>
                  {newRoom.roomNumber && isRoomNumberExists(newRoom.roomNumber) && (
                    <span style={{ color: '#d32f2f', fontSize: '12px' }}>
                      ⚠️ Room number already exists!
                    </span>
                  )}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group floating-label">
                  <select
                    name="type"
                    value={newRoom.type}
                    onChange={handleCreateInputChange}
                    className="form-select room-type-select"
                    required
                  >
                    <option value="single">Single Share (1 person)</option>
                    <option value="double">2 Share (2 people)</option>
                    <option value="triple">3 Share (3 people)</option>
                  </select>
                  <label className="form-label">
                    <span className="label-icon">📋</span>
                    Room Type
                  </label>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group floating-label">
                  <input
                    type="number"
                    name="capacity"
                    value={newRoom.capacity}
                    onChange={handleCreateInputChange}
                    min="1"
                    max="10"
                    placeholder=" "
                    className="form-input"
                    required
                    disabled
                  />
                  <label className="form-label">
                    <span className="label-icon">👥</span>
                    Capacity
                  </label>
                  <span className="input-hint">Auto-set based on share type</span>
                </div>
                <div className="form-group floating-label">
                  <input
                    type="number"
                    name="price"
                    value={newRoom.price}
                    onChange={handleCreateInputChange}
                    min="0"
                    step="50"
                    placeholder=" "
                    className="form-input"
                    required
                    disabled
                  />
                  <label className="form-label">
                    <span className="label-icon">₹</span>
                    Monthly Rent
                  </label>
                  <span className="input-hint">
                    Single ₹4000, 2-share ₹3750, 3-share ₹3000
                  </span>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>Bed labels (preview):</span>
                  <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {getBedLabels(newRoom.floor, newRoom.roomNumber).map(lbl => (
                      <span key={lbl} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '4px 8px', fontSize: 12 }}>
                        {lbl}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  <span>Cancel</span>
                </button>
                <button 
                  type="submit" 
                  className={`btn-create ${isCreateSubmitting ? 'loading' : ''}`}
                  disabled={isCreateSubmitting}
                >
                  <span className="btn-icon">{isCreateSubmitting ? '⏳' : '+'}</span>
                  <span>{isCreateSubmitting ? 'Creating...' : 'Create Room'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
    </div>
  );
};

export default SharedRooms;
