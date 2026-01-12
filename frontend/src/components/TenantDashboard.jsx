import { useState, useEffect, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import TenantComplaints from './TenantComplaints';
import TenantProfile from './TenantProfile';
import SharedRooms from './SharedRooms';
import './Dashboard.css';
import './AdminDashboard.css';

const TenantDashboard = ({ user: initialUser, onLogout }) => {
  const user = initialUser || null;
  const [activeTab, setActiveTab] = useState('overview');
  const initialState = {
    messMenu: [],
    messMenuStatus: 'inactive',
    complaints: [],
    payments: [],
    rooms: [],
    moveOut: null,
    roomRequests: []
  };
  const reducer = (s, a) => {
    switch (a.type) {
      case 'SET_MENU': return { ...s, messMenu: a.payload || [] };
      case 'SET_MENU_STATUS': return { ...s, messMenuStatus: a.payload || 'inactive' };
      case 'SET_COMPLAINTS': return { ...s, complaints: a.payload || [] };
      case 'SET_PAYMENTS': return { ...s, payments: a.payload || [] };
      case 'SET_ROOMS': return { ...s, rooms: a.payload || [] };
      case 'SET_MOVEOUT': return { ...s, moveOut: a.payload || null };
      case 'SET_ROOM_REQUESTS': return { ...s, roomRequests: a.payload || [] };
      default: return s;
    }
  };
  const [state, dispatch] = useReducer(reducer, initialState);
  const [moveOutDate, setMoveOutDate] = useState('');
  const [moveOutReason, setMoveOutReason] = useState('');
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');

  const navigate = useNavigate();

  /* ================= FETCH DATA ================= */

  const getToken = () => localStorage.getItem('token');

  const fetchMessMenu = async () => {
    try {
      const res = await axios.get(`${config.API_URL}/mess/menu/active`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      dispatch({ type: 'SET_MENU', payload: res.data.menu || [] });
      dispatch({ type: 'SET_MENU_STATUS', payload: res.data.status });
    } catch (err) { console.error('Failed to load mess menu', err); }
  };

  const fetchComplaints = async () => {
    try {
      const res = await axios.get(`${config.API_URL}/complaints`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      dispatch({ type: 'SET_COMPLAINTS', payload: res.data.complaints });
    } catch (err) { console.error('Failed to load complaints', err); }
  };
  

  const fetchPayments = async () => {
    try {
      const res = await axios.get(`${config.API_URL}/payments`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      dispatch({ type: 'SET_PAYMENTS', payload: res.data.payments });
    } catch (err) { console.error('Failed to load payments', err); }
  };

  const fetchRooms = async () => {
    try {
      const res = await axios.get(`${config.API_URL}/rooms`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      dispatch({ type: 'SET_ROOMS', payload: res.data.rooms });
    } catch (err) { console.error('Failed to load rooms', err); }
  };

  const fetchMoveOutStatus = async () => {
    try {
      const res = await axios.get(`${config.API_URL}/moveouts/me`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      dispatch({ type: 'SET_MOVEOUT', payload: res.data.notice });
    } catch (err) { console.error('Failed to load move-out status', err); }
  };

  const fetchRoomRequests = async () => {
    try {
      const res = await axios.get(`${config.API_URL}/room-requests/my-requests`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      dispatch({ type: 'SET_ROOM_REQUESTS', payload: res.data.requests });
    } catch (err) { console.error('Failed to load room requests', err); }
  };

  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true);
      setNotificationsError('');
      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };
      let list = [];

      try {
        const res = await axios.get(`${config.API_URL}/payments`, { headers });
        const payments = res.data.payments || [];
        const tenantName = user?.name || '';
        payments.forEach(p => {
          if (!p.tenant || p.tenant.name !== tenantName) return;
          const paid = p.status === 'paid';
          list.push({
            id: `payment-${p._id}`,
            type: paid ? 'system' : 'alert',
            message: paid
              ? `Rent paid: ₹${p.amount} on ${new Date(p.date).toLocaleDateString('en-IN')}`
              : `Rent pending: ₹${p.amount}`,
            timestamp: new Date(p.date || Date.now())
          });
        });
      } catch (err) {
        console.error('Failed to load payments for notifications', err);
      }

      try {
        const res = await axios.get(`${config.API_URL}/complaints`, { headers });
        const complaints = res.data.complaints || [];
        complaints.forEach(c => {
          const base = `Complaint (${c.category || 'general'}): ${c.title}`;
          const ts = new Date(c.updatedAt || c.createdAt || Date.now());
          if (c.status === 'pending' || c.status === 'in-progress') {
            list.push({
              id: `complaint-${c._id}`,
              type: 'alert',
              message: `${base} is ${c.status}`,
              timestamp: ts
            });
          } else if (c.status === 'resolved' || c.status === 'closed') {
            list.push({
              id: `complaint-${c._id}`,
              type: 'system',
              message: `${base} has been ${c.status}`,
              timestamp: ts
            });
          } else if (c.status === 'rejected') {
            list.push({
              id: `complaint-${c._id}`,
              type: 'alert',
              message: `${base} was rejected`,
              timestamp: ts
            });
          }
        });
      } catch (err) {
        console.error('Failed to load complaints for notifications', err);
      }

      try {
        const res = await axios.get(`${config.API_URL}/room-requests/my-requests`, { headers });
        const requests = res.data.requests || [];
        requests.forEach(r => {
          const roomNumber = r.roomId?.roomNumber || 'Room';
          if (r.status === 'Pending') {
            list.push({
              id: `roomreq-${r._id}`,
              type: 'approval',
              message: `Room request pending for ${roomNumber}`,
              timestamp: new Date(r.requestedAt || Date.now())
            });
          } else if (r.status === 'Approved') {
            list.push({
              id: `roomreq-${r._id}`,
              type: 'system',
              message: `Room request approved for ${roomNumber}`,
              timestamp: new Date(r.reviewedAt || r.requestedAt || Date.now())
            });
          } else if (r.status === 'Rejected') {
            list.push({
              id: `roomreq-${r._id}`,
              type: 'alert',
              message: `Room request rejected for ${roomNumber}`,
              timestamp: new Date(r.reviewedAt || r.requestedAt || Date.now())
            });
          }
        });
      } catch (err) {
        console.error('Failed to load room requests for notifications', err);
      }

      try {
        const res = await axios.get(`${config.API_URL}/mess/menu/active`, { headers });
        const menu = res.data.menu || [];
        menu.forEach(m => {
          const day = m.day || new Date(m.date).toLocaleDateString('en-IN', { weekday: 'long' });
          list.push({
            id: `mess-${m._id}`,
            type: 'system',
            message: `Today's menu available for ${day}`,
            timestamp: new Date(m.updatedAt || m.date || Date.now())
          });
        });
      } catch (err) {
        console.error('Failed to load mess menu for notifications', err);
      }

      list.sort((a, b) => b.timestamp - a.timestamp);
      setNotifications(list);
    } catch (error) {
      console.error('Failed to build notifications', error);
      setNotificationsError('Failed to load notifications');
    } finally {
      setNotificationsLoading(false);
    }
  };

  /* ================= ACTIONS ================= */
  const handleLogout = () => {
    localStorage.removeItem('token');
    onLogout();
    navigate('/login');
  };


  const handleSubmitMoveOut = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${config.API_URL}/moveouts`,
        { moveOutDate, reason: moveOutReason },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setMoveOutDate('');
      setMoveOutReason('');
      fetchMoveOutStatus();
      alert('Move-out request submitted');
    } catch {
      alert('Error submitting move-out request');
    }
  };

  const handleCancelRoomRequest = async (requestId) => {
    try {
      await axios.delete(`${config.API_URL}/room-requests/${requestId}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      alert('Room request cancelled successfully');
      fetchRoomRequests();
    } catch (err) {
      console.error('Failed to cancel room request:', err);
      alert('Failed to cancel room request');
    }
  };

  /* ================= HELPERS ================= */
  const findTenantRoom = () => {
    if (!user || state.rooms.length === 0) return null;
    const uid = user.id || user._id;
    return state.rooms.find(r => Array.isArray(r.tenants) && r.tenants.some(t => (t._id || t.id) === uid)) || null;
  };

  const computeOverview = () => {
    const totalBeds = state.rooms.reduce((sum, r) => sum + (r.capacity || 0), 0);
    const occupiedBeds = state.rooms.reduce((sum, r) => sum + (r.occupied || 0), 0);
    const vacantBeds = totalBeds - occupiedBeds;
    const availableRooms = state.rooms.filter(r => (r.status === 'available') || ((r.capacity || 0) > (r.occupied || 0))).length;
    const occupiedRooms = state.rooms.filter(r => (r.occupied || 0) > 0 || r.status === 'occupied').length;
    return { totalBeds, vacantBeds, availableRooms, occupiedRooms };
  };

  const currentMonthPaid = () => {
    if (!user) return false;
    const now = new Date();
    return state.payments.some(p => {
      const pd = new Date(p.date);
      const sameMonth = pd.getMonth() === now.getMonth() && pd.getFullYear() === now.getFullYear();
      const tn = p.tenant && (p.tenant.name || '');
      return sameMonth && p.status === 'paid' && tn === (user.name || '');
    });
  };

  const depositStatus = (room) => {
    const amount = room?.price || 0;
    const paid = state.payments.some(p => p.status === 'paid' && p.amount >= amount && p.tenant && p.tenant.name === (user?.name || ''));
    return { amount, status: paid ? 'paid' : 'pending' };
  };

  const paymentHistoryForTenant = () => {
    if (!user) return [];
    return state.payments.filter(p => p.tenant && p.tenant.name === (user.name || '')).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const formatMonth = (d) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  };

  const nextDueDate = () => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), 5);
    if (now > d) {
      return new Date(now.getFullYear(), now.getMonth() + 1, 5);
    }
    return d;
  };

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchRooms();
      fetchPayments();
    } else if (activeTab === 'rooms') {
      fetchRooms();
      fetchRoomRequests();
    } else if (activeTab === 'payments') {
      fetchPayments();
      fetchRooms();
    } else if (activeTab === 'mess') {
      fetchMessMenu();
    } else if (activeTab === 'complaints') {
      fetchComplaints();
    } else if (activeTab === 'moveout') {
      fetchMoveOutStatus();
    } else if (activeTab === 'notifications') {
      fetchNotifications();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'mess') return;
    let timer = setInterval(() => {
      fetchMessMenu();
    }, 30000);
    fetchMessMenu();
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeTab]);

  /* ================= RENDER ================= */
  return (
    <div className="admin-dashboard">
      <aside className={`sidebar ${sidebarMinimized ? 'minimized' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 24, height: 24 }}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            PG Manager
          </div>
          <button className="icon-btn" onClick={() => setSidebarMinimized(v => !v)} aria-label="Toggle sidebar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18"></path>
              <path d="M3 6h18"></path>
              <path d="M3 18h18"></path>
            </svg>
          </button>
        </div>
        <div className="sidebar-nav">
          {['overview', 'mess', 'rooms', 'complaints', 'payments', 'moveout', 'notifications', 'profile'].map(tab => (
            <button
              key={tab}
              className={activeTab === tab ? 'active' : ''}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'overview' && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M3 12h18"></path><path d="M12 3v18"></path>
                </svg>
              )}
              {tab === 'mess' && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M4 3h16v4H4z"></path><path d="M4 11h16v10H4z"></path>
                </svg>
              )}
              {tab === 'rooms' && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M3 10h18"></path>
                </svg>
              )}
              {tab === 'complaints' && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              )}
              {tab === 'payments' && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="9"></circle><path d="M16 12a4 4 0 0 1-8 0"></path>
                </svg>
              )}
              {tab === 'moveout' && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M10 22V6l-2 2"></path><path d="M14 22V6l2 2"></path>
                </svg>
              )}
              {tab === 'notifications' && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
              )}
              {tab === 'profile' && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="7" r="4"></circle><path d="M5.5 21a6.5 6.5 0 0 1 13 0"></path>
                </svg>
              )}
              <span className="nav-label">{tab.toUpperCase()}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
          <button className="btn-primary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        {activeTab === 'overview' && (
          <div className="content-area">
            {(() => {
              const room = findTenantRoom();
              const stats = computeOverview();
              const bedIndex = room && Array.isArray(room.tenants)
                ? room.tenants.findIndex(t => (t._id || t.id) === (user.id || user._id)) + 1
                : null;
              const dep = depositStatus(room);
              const pendingCount = state.payments.filter(p => p.status === 'pending' && (p.tenant && p.tenant.name === (user?.name || ''))).length;
              const rentPaid = currentMonthPaid();
              const rentDue = nextDueDate();
              const roomOccupancy = room ? ((room.occupied || 0) >= (room.capacity || 0) ? 'full' : 'available') : 'unassigned';
              const depositPill = dep.status === 'paid' ? 'paid' : 'pending';
              return (
                <div className="tenant-overview">
                  <div className="page-header tenant-overview-header">
                    <div className="tenant-overview-title">
                      <h1>Welcome back, {user?.name}</h1>
                      <p>Your latest snapshot: room, rent, and requests at a glance.</p>
                    </div>
                    <div className="tenant-overview-actions">
                      <button className="btn-secondary tenant-action-btn" onClick={() => setActiveTab('payments')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 1v22"></path>
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"></path>
                        </svg>
                        Payments
                      </button>
                      <button className="btn-primary tenant-action-btn" onClick={() => setActiveTab('complaints')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>
                          <path d="M8 9h8"></path>
                          <path d="M8 13h6"></path>
                        </svg>
                        Raise Complaint
                      </button>
                    </div>
                  </div>

                  <div className="stats-grid tenant-stats-grid">
                    <div className="stat-card blue tenant-stat-card">
                      <div className="stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 21V3h18v18H3z"></path>
                          <path d="M3 9h18"></path>
                          <path d="M9 21V9"></path>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <p className="stat-label">Total Beds</p>
                        <p className="stat-value">{stats.totalBeds}</p>
                      </div>
                    </div>
                    <div className="stat-card green tenant-stat-card">
                      <div className="stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 7H4"></path>
                          <path d="M20 7v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7"></path>
                          <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <p className="stat-label">Vacant Beds</p>
                        <p className="stat-value">{stats.vacantBeds}</p>
                      </div>
                    </div>
                    <div className="stat-card purple tenant-stat-card">
                      <div className="stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 12h18"></path>
                          <path d="M12 3v18"></path>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <p className="stat-label">Occupied Rooms</p>
                        <p className="stat-value">{stats.occupiedRooms}</p>
                      </div>
                    </div>
                    <div className="stat-card orange tenant-stat-card">
                      <div className="stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 8v4"></path>
                          <path d="M12 16h.01"></path>
                          <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"></path>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <p className="stat-label">Pending Payments</p>
                        <p className="stat-value">{pendingCount}</p>
                      </div>
                    </div>
                  </div>

                  <div className="tenant-panels-grid">
                    <div className="card tenant-panel">
                      <div className="tenant-panel-header">
                        <div className="tenant-panel-title">
                          <div className="tenant-panel-icon tenant-panel-icon-blue">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10.5z"></path>
                              <path d="M9 22V12h6v10"></path>
                            </svg>
                          </div>
                          <div>
                            <h2>Your Room</h2>
                            <p className="tenant-panel-subtitle">Assignment and occupancy details</p>
                          </div>
                        </div>
                        <span className={`tenant-pill tenant-pill-${roomOccupancy}`}>
                          {roomOccupancy === 'unassigned' ? 'Not assigned' : (roomOccupancy === 'full' ? 'Full' : 'Available')}
                        </span>
                      </div>
                      <div className="tenant-kv-grid">
                        <div className="tenant-kv">
                          <div className="tenant-k">Room Number</div>
                          <div className="tenant-v">{room ? room.roomNumber : '—'}</div>
                        </div>
                        <div className="tenant-kv">
                          <div className="tenant-k">Bed Number</div>
                          <div className="tenant-v">{bedIndex || '—'}</div>
                        </div>
                        <div className="tenant-kv">
                          <div className="tenant-k">Room Type</div>
                          <div className="tenant-v">{room ? room.type : '—'}</div>
                        </div>
                        <div className="tenant-kv">
                          <div className="tenant-k">Capacity</div>
                          <div className="tenant-v">{room ? `${room.occupied || 0}/${room.capacity || 0}` : '—'}</div>
                        </div>
                      </div>
                      <div className="tenant-panel-actions">
                        <button className="btn-secondary tenant-action-btn" onClick={() => setActiveTab('rooms')}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                            <path d="M3 10h18"></path>
                          </svg>
                          View Rooms
                        </button>
                      </div>
                    </div>

                    <div className="card tenant-panel">
                      <div className="tenant-panel-header">
                        <div className="tenant-panel-title">
                          <div className="tenant-panel-icon tenant-panel-icon-purple">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 1v22"></path>
                              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"></path>
                            </svg>
                          </div>
                          <div>
                            <h2>Rent</h2>
                            <p className="tenant-panel-subtitle">Due date and payment status</p>
                          </div>
                        </div>
                        <span className={`tenant-pill tenant-pill-${rentPaid ? 'paid' : 'pending'}`}>
                          {rentPaid ? 'Paid' : 'Pending'}
                        </span>
                      </div>
                      <div className="tenant-kv-grid">
                        <div className="tenant-kv">
                          <div className="tenant-k">Monthly Amount</div>
                          <div className="tenant-v">{room ? `₹${room.price || 0}` : '—'}</div>
                        </div>
                        <div className="tenant-kv">
                          <div className="tenant-k">Due Date</div>
                          <div className="tenant-v">{rentDue.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        </div>
                      </div>
                      <div className="tenant-panel-actions">
                        <button className="btn-primary tenant-action-btn" onClick={() => setActiveTab('payments')}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2"></path>
                            <path d="M21 10H3v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8z"></path>
                            <path d="M7 15h4"></path>
                          </svg>
                          Open Payments
                        </button>
                      </div>
                    </div>

                    <div className="card tenant-panel">
                      <div className="tenant-panel-header">
                        <div className="tenant-panel-title">
                          <div className="tenant-panel-icon tenant-panel-icon-green">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 7H4"></path>
                              <path d="M20 7v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7"></path>
                              <path d="M16 7V5a2 2 0 0 0-2-2H10a2 2 0 0 0-2 2v2"></path>
                              <path d="M9 12h6"></path>
                            </svg>
                          </div>
                          <div>
                            <h2>Deposit</h2>
                            <p className="tenant-panel-subtitle">Security amount and status</p>
                          </div>
                        </div>
                        <span className={`tenant-pill tenant-pill-${depositPill}`}>{depositPill}</span>
                      </div>
                      <div className="tenant-kv-grid">
                        <div className="tenant-kv">
                          <div className="tenant-k">Amount</div>
                          <div className="tenant-v">₹{dep.amount}</div>
                        </div>
                        <div className="tenant-kv">
                          <div className="tenant-k">Status</div>
                          <div className="tenant-v tenant-capitalize">{dep.status}</div>
                        </div>
                      </div>
                      <div className="tenant-panel-actions">
                        <button className="btn-secondary tenant-action-btn" onClick={() => setActiveTab('notifications')}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                          </svg>
                          View Alerts
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'mess' && (
          <div className="content-area">
            <div className="page-header">
              <div>
                <h1>Mess Menu</h1>
                <p>Check today’s and weekly food schedule</p>
              </div>
              <span
                style={{
                  padding: '6px 12px',
                  borderRadius: '12px',
                  fontSize: 12,
                  fontWeight: 600,
                  background: state.messMenuStatus === 'active' ? '#d1fae5' : '#fee2e2',
                  color: state.messMenuStatus === 'active' ? '#065f46' : '#7f1d1d'
                }}
              >
                {state.messMenuStatus === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
            {state.messMenuStatus === 'inactive' && (
              <div className="card" style={{ marginBottom: '16px', background: '#fff7f7', border: '1px solid #fee2e2' }}>
                <p style={{ margin: 0, color: '#7f1d1d' }}>Mess service temporarily unavailable</p>
              </div>
            )}
            {state.messMenu.length === 0 ? (
              <p>No menu available</p>
            ) : (
              (() => {
                const todayName = new Date().toLocaleDateString('en-IN', { weekday: 'long' });
                return (
                  <div>
                    {state.messMenu.map((m, i) => {
                      const isToday = m.day === todayName;
                      return (
                        <div key={i} className={`mess-menu-card ${isToday ? 'today-card' : ''}`}>
                          <div className="mess-menu-header">
                            <div className="day-info">
                              <h3 className="day-name">{m.day}</h3>
                              {isToday && <span className="today-badge">Today</span>}
                            </div>
                            <span className="date-info">{new Date(m.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                          </div>
                          <div className="meal-list">
                            <div className="meal-item">
                              <div className="meal-icon breakfast-icon">🍳</div>
                              <div className="meal-content">
                                <div className="meal-name">Breakfast</div>
                                <div className="meal-dish">{m.breakfast}</div>
                              </div>
                              <span className={`veg-badge ${m.isBreakfastVeg ? 'veg' : 'non-veg'}`}>
                                {m.isBreakfastVeg ? '🥬 Veg' : '🍗 Non-Veg'}
                              </span>
                            </div>
                            <div className="meal-item">
                              <div className="meal-icon lunch-icon">🍽️</div>
                              <div className="meal-content">
                                <div className="meal-name">Lunch</div>
                                <div className="meal-dish">{m.lunch}</div>
                              </div>
                              <span className={`veg-badge ${m.isLunchVeg ? 'veg' : 'non-veg'}`}>
                                {m.isLunchVeg ? '🥬 Veg' : '🍗 Non-Veg'}
                              </span>
                            </div>
                            <div className="meal-item">
                              <div className="meal-icon dinner-icon">🍽️</div>
                              <div className="meal-content">
                                <div className="meal-name">Dinner</div>
                                <div className="meal-dish">{m.dinner}</div>
                              </div>
                              <span className={`veg-badge ${m.isDinnerVeg ? 'veg' : 'non-veg'}`}>
                                {m.isDinnerVeg ? '🥬 Veg' : '🍗 Non-Veg'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {activeTab === 'rooms' && (
          <div className="content-area">
            <div className="page-header">
              <h1>Room Management</h1>
            </div>
            
            {/* Room Requests Section */}
            <div className="card" style={{ marginBottom: '24px' }}>
              <h2>Your Room Requests</h2>
              {state.roomRequests.length === 0 ? (
                <p>No room requests found</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {state.roomRequests.map((request) => (
                    <div key={request._id} style={{ 
                      padding: '12px', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600' }}>Room {request.roomId?.roomNumber || 'Unknown'}</div>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                          Status: <span style={{ 
                            color: request.status === 'Approved' ? '#10b981' : 
                                   request.status === 'Rejected' ? '#ef4444' : '#f59e0b',
                            fontWeight: '500'
                          }}>
                            {request.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                          Requested: {new Date(request.requestedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        {request.status === 'Pending' && (
                          <button 
                            onClick={() => handleCancelRoomRequest(request._id)}
                            className="btn-secondary"
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Available Rooms */}
            <SharedRooms userRole="tenant" />
          </div>
        )}

        {activeTab === 'complaints' && (
          <div className="content-area">
            <TenantComplaints />
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="content-area">
            <div className="page-header">
              <h1>Payments</h1>
            </div>
            {(() => {
              const room = findTenantRoom();
              const due = nextDueDate();
              const paid = currentMonthPaid();
              return (
                <div>
                  <div className="card">
                    <h2>Monthly Rent</h2>
                    <p>Amount: ₹{room?.price || 0}</p>
                    <p>Due Date: {due.toLocaleDateString('en-IN')}</p>
                    <p>Status: {paid ? 'paid' : 'pending'}</p>
                    <p>{paid ? 'No upcoming reminders' : (new Date() > due ? 'Overdue rent' : 'Upcoming rent due')}</p>
                  </div>
                  <div className="card" style={{ marginTop: '16px' }}>
                    <h2>Payment History</h2>
                    <div>
                      {paymentHistoryForTenant().length === 0 ? (
                        <p>No payments found</p>
                      ) : (
                        <div>
                          {paymentHistoryForTenant().map(p => (
                            <div key={p._id} className="history-row">
                              <span>{formatMonth(p.date)}</span>
                              <span>₹{p.amount}</span>
                              <span>{new Date(p.date).toLocaleDateString('en-IN')}</span>
                              <span>-</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'moveout' && (
          <div className="content-area">
            <div className="page-header">
              <h1>Move-out Notice</h1>
            </div>
            {state.moveOut ? (
              <div className="card">
                <p>Status: {state.moveOut.status}</p>
                <p>Requested Date: {new Date(state.moveOut.moveOutDate).toLocaleDateString('en-IN')}</p>
                {state.moveOut.reason ? <p>Reason: {state.moveOut.reason}</p> : null}
              </div>
            ) : (
              <form onSubmit={handleSubmitMoveOut} className="card">
                <label>Move-out Date</label>
                <input
                  type="date"
                  value={moveOutDate}
                  onChange={e => setMoveOutDate(e.target.value)}
                  required
                />
                <label>Reason (optional)</label>
                <textarea
                  value={moveOutReason}
                  onChange={e => setMoveOutReason(e.target.value)}
                  placeholder="Reason for move-out"
                />
                <button type="submit" className="btn-primary" style={{ marginTop: '12px' }}>Submit Request</button>
              </form>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="content-area">
            <div className="page-header">
              <h1>Notifications</h1>
              <button className="btn-primary" onClick={fetchNotifications}>
                Refresh
              </button>
            </div>
            <div className="card">
              <div className="card-header">
                <h2>Your notices</h2>
              </div>
              {notificationsLoading ? (
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <div className="spinner"></div>
                  <p>Loading notifications...</p>
                </div>
              ) : notificationsError ? (
                <div style={{ padding: '16px', color: '#dc2626' }}>
                  {notificationsError}
                </div>
              ) : notifications.length === 0 ? (
                <ul className="notifications-list">
                  <li className="notification-item empty">
                    No notifications to show
                  </li>
                </ul>
              ) : (
                <ul className="notifications-list">
                  {notifications.map(n => (
                    <li key={n.id} className={`notification-item ${n.type}`}>
                      <div className="notification-icon">
                        {n.type === 'approval' && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 12l2 2 4-4"></path>
                            <circle cx="12" cy="12" r="10"></circle>
                          </svg>
                        )}
                        {n.type === 'alert' && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12" y2="16"></line>
                          </svg>
                        )}
                        {n.type === 'system' && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                          </svg>
                        )}
                      </div>
                      <div className="notification-content">
                        <div className="message">{n.message}</div>
                        <div className="timestamp">
                          {n.timestamp.toLocaleString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && <TenantProfile user={user} />}
      </main>
    </div>
  );
};

export default TenantDashboard;
