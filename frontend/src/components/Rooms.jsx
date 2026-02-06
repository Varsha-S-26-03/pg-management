import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import './Rooms.css';

const Rooms = ({ onBack }) => {
  const [rooms, setRooms] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [unallocatedTenants, setUnallocatedTenants] = useState([]);
  const [selectedRoomForAllocation, setSelectedRoomForAllocation] = useState(null);
  const [selectedTenantId, setSelectedTenantId] = useState('');

  // Room pricing constants
  const ROOM_PRICING = {
    single: 10500,
    double: 8500,
    triple: 6500,
    dormitory: 5500
  };

  // Room capacity mapping
  const ROOM_CAPACITY = {
    single: 1,
    double: 2,
    triple: 3,
    dormitory: null // Will be set manually for dormitory
  };

  const [newRoom, setNewRoom] = useState({
    roomNumber: '',
    type: 'single',
    capacity: '',
    price: '',
    floor: '',
    amenities: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPriceOverride, setIsPriceOverride] = useState(false);

  // Generate room number based on floor and existing rooms
  const generateRoomNumber = (floor) => {
    if (!floor || floor < 0) return '';
    
    const floorRooms = rooms.filter(room => room.floor === floor);
    const existingNumbers = floorRooms.map(room => {
      const match = room.roomNumber.match(new RegExp(`^${floor}(\\d+)$`));
      return match ? parseInt(match[1]) : 0;
    });
    
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = maxNumber + 1;
    
    // Format as floor + two-digit sequence (e.g., 101, 102, 201, 202)
    return `${floor}${nextNumber.toString().padStart(2, '0')}`;
  };

  // Check if room number already exists
  const isRoomNumberExists = (roomNumber) => {
    return rooms.some(room => room.roomNumber === roomNumber);
  };

  // Handle room type change - auto set capacity and price
  const handleRoomTypeChange = (type) => {
    const capacity = ROOM_CAPACITY[type];
    const price = ROOM_PRICING[type];
    
    setNewRoom(prev => ({
      ...prev,
      type,
      capacity: capacity !== null ? capacity : prev.capacity,
      price: !isPriceOverride ? price : prev.price
    }));
  };

  // Handle floor change - auto generate room number
  const handleFloorChange = (floor) => {
    const floorNum = parseInt(floor) || 0;
    const generatedRoomNumber = generateRoomNumber(floorNum);
    
    setNewRoom(prev => ({
      ...prev,
      floor: floorNum,
      roomNumber: generatedRoomNumber
    }));
  };

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
    
    // Find tenant email from ID (backend expects email currently based on previous code, 
    // but let's check if we can send ID or if we need to send email. 
    // The previous code used: axios.post(..., { email })
    // So we need to find the email of the selected tenant.
    const tenant = unallocatedTenants.find(t => t._id === selectedTenantId);
    if (!tenant) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${config.API_URL}/rooms/${selectedRoomForAllocation._id}/assign`, 
        { email: tenant.email }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setIsAllocateModalOpen(false);
      await fetchRooms();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to allocate');
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'type') {
      handleRoomTypeChange(value);
    } else if (name === 'floor') {
      handleFloorChange(value);
    } else if (name === 'price') {
      // When user manually changes price, enable override mode
      setIsPriceOverride(true);
      setNewRoom(prev => ({
        ...prev,
        [name]: value
      }));
    } else if (name === 'roomNumber') {
      // Check if room number exists when user types
      if (isRoomNumberExists(value)) {
        // You could show a warning here if needed
        console.warn('Room number already exists:', value);
      }
      setNewRoom(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setNewRoom(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };



  const openCreateModal = () => {
    const defaultType = 'single';
    const defaultFloor = 1;
    const generatedRoomNumber = generateRoomNumber(defaultFloor);
    
    setNewRoom({
      roomNumber: generatedRoomNumber,
      type: defaultType,
      capacity: ROOM_CAPACITY[defaultType],
      price: ROOM_PRICING[defaultType],
      floor: defaultFloor,
      amenities: '',
      description: ''
    });
    setIsPriceOverride(false);
    setIsModalOpen(true);
  };

  const resetPriceOverride = () => {
    setIsPriceOverride(false);
    setNewRoom(prev => ({
      ...prev,
      price: ROOM_PRICING[prev.type]
    }));
  };

  const handleCreateRoomSubmit = async (e) => {
    e.preventDefault();
    const { roomNumber, type, capacity, price, floor } = newRoom;
    
    if (!roomNumber || !type || !capacity || !price) {
      alert('Please fill in all required fields');
      return;
    }

    // Check if room number already exists
    if (isRoomNumberExists(roomNumber)) {
      alert('Room number already exists. Please choose a different room number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      console.log('🚀 Creating room with data:', {
        roomNumber,
        type,
        capacity: Number(capacity),
        price: Number(price),
        floor: Number(floor || 1)
      });
      
      const response = await axios.post(`${config.API_URL}/rooms`, {
        roomNumber,
        type, // Type is already normalized by the select input
        capacity: Number(capacity),
        price: Number(price),
        floor: Number(floor || 1)
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      console.log('✅ Room created successfully:', response.data);
      setIsModalOpen(false);
      await fetchRooms();
    } catch (err) {
      console.error('❌ Room creation failed:', err);
      console.error('❌ Error response:', err.response?.data);
      console.error('❌ Error status:', err.response?.status);
      alert(err.response?.data?.message || 'Failed to create room');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.API_URL}/payments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayments(response.data.payments || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const getTenantRentStatus = (tenantId) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const paid = payments.some(p => {
      const tId = p.tenant?._id || p.tenant;
      if (tId !== tenantId) return false;
      
      const pDate = new Date(p.date);
      return pDate.getMonth() === currentMonth && 
             pDate.getFullYear() === currentYear && 
             (p.status === 'paid' || p.status === 'verified') &&
             p.paymentType === 'rent';
    });
    return paid ? 'Paid' : 'Pending';
  };

  const getTenantDepositStatus = (tenantId) => {
    const paid = payments.some(p => {
      const tId = p.tenant?._id || p.tenant;
      return tId === tenantId && 
             (p.status === 'paid' || p.status === 'verified') &&
             p.paymentType === 'deposit';
    });
    return paid ? 'Paid' : 'Pending';
  };

  useEffect(() => {
    fetchRooms();
    fetchPayments();
  }, []);

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.API_URL}/rooms`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setRooms(response.data.rooms);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-area">
      <div className="page-header">
        {onBack && (
          <button className="btn-secondary" onClick={onBack} style={{ marginRight: '16px' }}>
            ← Back to Rooms
          </button>
        )}
        <h1>Room Management</h1>
        <button className="btn-primary" onClick={openCreateModal}>Create Room</button>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <div className="spinner"></div>
          <p>Loading rooms...</p>
        </div>
      ) : (
        <div>
          {rooms && rooms.length === 0 && (
            <div className="card" style={{ padding: 24 }}>
              <h2>No rooms found</h2>
              <p style={{ color: '#6b7280' }}>Add rooms to view occupancy and status.</p>
            </div>
          )}
          {Object.entries(groupByFloor(rooms)).map(([floor, list]) => (
            <div key={floor} style={{ marginBottom: 24 }}>
              <div className="card-header">
                <h2>Floor {floor} • {list.length} rooms</h2>
              </div>
              <div className="rooms-grid">
                {list.map((room) => {
                  const occupiedCount = Array.isArray(room.tenants) ? room.tenants.length : (room.occupied || 0);
                  const vacantCount = Math.max(0, (room.capacity || 0) - occupiedCount);
                  const shareLabel = shareFromType(room.type);
                  const occupantNames = Array.isArray(room.tenants) ? room.tenants.map(t => t.name).filter(Boolean) : [];
                  return (
                    <div className="room-card card" key={room._id}>
                      <div className="card-header">
                        <h2>Room {room.roomNumber}</h2>
                        <span className={`status ${room.status === 'occupied' ? 'occupied' : 'available'}`}>
                          {room.status === 'occupied' ? 'Occupied' : room.status === 'maintenance' ? 'Maintenance' : 'Available'}
                        </span>
                      </div>
                      <div className="card-body">
                        <p><strong>Shares:</strong> {shareLabel}</p>
                        <p><strong>Capacity:</strong> {room.capacity}</p>
                        <p><strong>Occupied:</strong> {occupiedCount}{occupantNames.length ? ` (${occupantNames.join(', ')})` : ''}</p>
                        <p><strong>Vacant:</strong> {vacantCount}</p>
                        <p><strong>Price:</strong> ₹{room.price}</p>
                        {Array.isArray(room.tenants) && room.tenants.length > 0 && (
                          <div className="occupants">
                            <p><strong>Occupants:</strong></p>
                            {room.tenants.map(t => (
                              <div key={t._id} className="occupant-row">
                                <div>
                                  <div className="occupant-name">{t.name}</div>
                                  <div className="occupant-email">{t.email}</div>
                                  <div style={{ fontSize: '12px', marginTop: '4px', display: 'flex', gap: '8px' }}>
                                    <span style={{ color: getTenantRentStatus(t._id) === 'Paid' ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
                                        Rent: {getTenantRentStatus(t._id)}
                                    </span>
                                    <span style={{ color: getTenantDepositStatus(t._id) === 'Paid' ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
                                        Deposit: {getTenantDepositStatus(t._id)}
                                    </span>
                                  </div>
                                </div>
                                <button className="text-btn remove" onClick={() => removeTenant(room._id, t._id)}>Remove</button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="room-actions">
                          {vacantCount > 0 && (
                            <button className="btn-primary success" onClick={() => openAllocateModal(room)}>Allocate</button>
                          )}
                          <button className="btn-primary danger" onClick={() => deleteRoom(room._id)}>Delete</button>
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

      {isModalOpen && (
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
                <p>Add a new room to your property management system</p>
              </div>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateRoomSubmit} className="room-form">
              <div className="form-row">
                <div className="form-group floating-label">
                  <input
                    type="number"
                    name="floor"
                    value={newRoom.floor}
                    onChange={handleInputChange}
                    min="0"
                    max="20"
                    placeholder=" "
                    className="form-input"
                  />
                  <label className="form-label">
                    <span className="label-icon">🏢</span>
                    Floor
                  </label>
                  <span className="input-hint">Building floor number</span>
                </div>
                <div className="form-group floating-label">
                  <input
                    type="text"
                    name="roomNumber"
                    value={newRoom.roomNumber}
                    onChange={handleInputChange}
                    placeholder=" "
                    className="form-input"
                    required
                    style={{ backgroundColor: newRoom.roomNumber && isRoomNumberExists(newRoom.roomNumber) ? '#ffebee' : '#ffffff' }}
                  />
                  <label className="form-label">
                    <span className="label-icon">🏠</span>
                    Room Number
                  </label>
                  <span className="input-hint">Auto-generated based on floor (format: Floor+Sequence)</span>
                  {newRoom.roomNumber && isRoomNumberExists(newRoom.roomNumber) && (
                    <span className="error-hint" style={{ color: '#d32f2f', fontSize: '12px' }}>
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
                    onChange={handleInputChange}
                    className="form-select"
                    required
                  >
                    <option value="single">🏠 Single Room (1 Person)</option>
                    <option value="double">👥 Double Room (2 People)</option>
                    <option value="triple">👨‍👩‍👧 Triple Room (3 People)</option>
                    <option value="dormitory">🏢 Dormitory (4+ People)</option>
                  </select>
                  <label className="form-label">
                    <span className="label-icon">📋</span>
                    Room Type
                  </label>
                  <span className="input-hint">Maximum occupancy type</span>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group floating-label">
                  <input
                    type="number"
                    name="capacity"
                    value={newRoom.capacity}
                    onChange={handleInputChange}
                    min="1"
                    max="10"
                    placeholder=" "
                    className="form-input"
                    required
                    disabled={newRoom.type !== 'dormitory' && ROOM_CAPACITY[newRoom.type] !== null}
                  />
                  <label className="form-label">
                    <span className="label-icon">👥</span>
                    Capacity
                  </label>
                  <span className="input-hint">
                    {newRoom.type !== 'dormitory' && ROOM_CAPACITY[newRoom.type] !== null 
                      ? `Auto-set for ${newRoom.type} room` 
                      : 'Maximum number of occupants'}
                  </span>
                </div>
                <div className="form-group floating-label">
                  <input
                    type="number"
                    name="price"
                    value={newRoom.price}
                    onChange={handleInputChange}
                    min="0"
                    step="100"
                    placeholder=" "
                    className="form-input"
                    required
                    style={{ backgroundColor: isPriceOverride ? '#fff3e0' : '#ffffff' }}
                  />
                  <label className="form-label">
                    <span className="label-icon">₹</span>
                    Monthly Rent
                  </label>
                  <span className="input-hint">
                    {isPriceOverride 
                      ? 'Custom price (override mode)' 
                      : `Auto-set: ₹${ROOM_PRICING[newRoom.type].toLocaleString()}`}
                  </span>
                  {isPriceOverride && (
                    <button 
                      type="button"
                      className="reset-price-btn"
                      onClick={resetPriceOverride}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: '#1976d2', 
                        cursor: 'pointer', 
                        fontSize: '12px',
                        textDecoration: 'underline',
                        marginTop: '2px'
                      }}
                    >
                      Reset to default price
                    </button>
                  )}
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                >
                  <span>Cancel</span>
                </button>
                <button 
                  type="submit" 
                  className={`btn-create ${isSubmitting ? 'loading' : ''}`}
                  disabled={!newRoom.roomNumber || !newRoom.type || !newRoom.capacity || !newRoom.price || isSubmitting}
                >
                  <span className="btn-icon">{isSubmitting ? '⏳' : '+'}</span>
                  <span>{isSubmitting ? 'Creating...' : 'Create Room'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
                    <option value="">-- Select a tenant --</option>
                    {unallocatedTenants.map(tenant => (
                      <option key={tenant._id} value={tenant._id}>
                        {tenant.name} ({tenant.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsAllocateModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={unallocatedTenants.length === 0}>Allocate</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rooms;
