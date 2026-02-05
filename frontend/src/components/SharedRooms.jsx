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
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  

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
      {showCreateRoom ? (
        <Rooms onBack={() => setShowCreateRoom(false)} />
      ) : (
        <>
          <div className="page-header">
            <h1>Rooms</h1>
            {userRole === 'admin' && (
              <button className="btn-primary" onClick={() => setShowCreateRoom(true)}>
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
                            {room.tenants.map(t => (
                              <div key={t._id} className="occupant-row">
                                <div>
                                  <div className="occupant-name">{t.name}</div>
                                  <div className="occupant-email">{t.email}</div>
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
        </>
      )}
    </div>
  );
};

export default SharedRooms;
