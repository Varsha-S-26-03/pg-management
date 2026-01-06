import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Rooms.css';

const Rooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({
    roomNumber: '',
    type: 'single',
    capacity: '',
    price: '',
    floor: ''
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
  const normalizeType = (val) => {
    const s = String(val || '').toLowerCase().trim();
    if (['single', '1', 'single share'].includes(s)) return 'single';
    if (['double', '2', 'two', '2 share', 'double share'].includes(s)) return 'double';
    if (['triple', '3', 'three', '3 share', 'triple share'].includes(s)) return 'triple';
    if (['dormitory', 'dorm', '4', 'four', 'many', 'multiple'].includes(s)) return 'dormitory';
    return null;
  };
  const allocateTenant = async (room) => {
    const email = window.prompt('Enter tenant email to allocate');
    if (!email) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/rooms/${room._id}/assign`, { email }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchRooms();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to allocate');
    }
  };
  const removeTenant = async (roomId, tenantId) => {
    if (!window.confirm('Remove this occupant from the room?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/rooms/${roomId}/tenants/${tenantId}`, {
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
      await axios.delete(`http://localhost:5000/api/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchRooms();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete room');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewRoom(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openCreateModal = () => {
    setNewRoom({
      roomNumber: '',
      type: 'single',
      capacity: '',
      price: '',
      floor: ''
    });
    setIsModalOpen(true);
  };

  const handleCreateRoomSubmit = async (e) => {
    e.preventDefault();
    const { roomNumber, type, capacity, price, floor } = newRoom;
    
    if (!roomNumber || !type || !capacity || !price) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/rooms', {
        roomNumber,
        type, // Type is already normalized by the select input
        capacity: Number(capacity),
        price: Number(price),
        floor: Number(floor || 1)
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setIsModalOpen(false);
      await fetchRooms();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create room');
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/rooms', {
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
                                </div>
                                <button className="text-btn remove" onClick={() => removeTenant(room._id, t._id)}>Remove</button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="room-actions">
                          {vacantCount > 0 && (
                            <button className="btn-primary success" onClick={() => allocateTenant(room)}>Allocate</button>
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
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add New Room</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateRoomSubmit}>
              <div className="form-group">
                <label>Room Number</label>
                <input
                  type="text"
                  name="roomNumber"
                  value={newRoom.roomNumber}
                  onChange={handleInputChange}
                  placeholder="e.g., 101"
                  required
                />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select name="type" value={newRoom.type} onChange={handleInputChange}>
                  <option value="single">Single (1)</option>
                  <option value="double">Double (2)</option>
                  <option value="triple">Triple (3)</option>
                  <option value="dormitory">Dormitory (4+)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Capacity</label>
                <input
                  type="number"
                  name="capacity"
                  value={newRoom.capacity}
                  onChange={handleInputChange}
                  min="1"
                  required
                />
              </div>
              <div className="form-group">
                <label>Price (₹)</label>
                <input
                  type="number"
                  name="price"
                  value={newRoom.price}
                  onChange={handleInputChange}
                  min="0"
                  required
                />
              </div>
              <div className="form-group">
                <label>Floor</label>
                <input
                  type="number"
                  name="floor"
                  value={newRoom.floor}
                  onChange={handleInputChange}
                  placeholder="e.g., 1"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Room</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rooms;
