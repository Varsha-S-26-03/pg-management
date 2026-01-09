import { useState, useEffect, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import TenantComplaints from './TenantComplaints';
import TenantProfile from './TenantProfile';
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
    moveOut: null
  };
  const reducer = (s, a) => {
    switch (a.type) {
      case 'SET_MENU': return { ...s, messMenu: a.payload || [] };
      case 'SET_MENU_STATUS': return { ...s, messMenuStatus: a.payload || 'inactive' };
      case 'SET_COMPLAINTS': return { ...s, complaints: a.payload || [] };
      case 'SET_PAYMENTS': return { ...s, payments: a.payload || [] };
      case 'SET_ROOMS': return { ...s, rooms: a.payload || [] };
      case 'SET_MOVEOUT': return { ...s, moveOut: a.payload || null };
      default: return s;
    }
  };
  const [state, dispatch] = useReducer(reducer, initialState);
  const [moveOutDate, setMoveOutDate] = useState('');
  const [moveOutReason, setMoveOutReason] = useState('');
  const [sidebarMinimized, setSidebarMinimized] = useState(false);

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
    } else if (activeTab === 'payments') {
      fetchPayments();
      fetchRooms();
    } else if (activeTab === 'mess') {
      fetchMessMenu();
    } else if (activeTab === 'complaints') {
      fetchComplaints();
    } else if (activeTab === 'moveout') {
      fetchMoveOutStatus();
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
          {['overview', 'mess', 'rooms', 'complaints', 'payments', 'moveout', 'profile'].map(tab => (
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
            <div className="page-header">
              <h1>Welcome, {user?.name}</h1>
            </div>
            {(() => {
              const room = findTenantRoom();
              const stats = computeOverview();
              const bedIndex = room && Array.isArray(room.tenants)
                ? room.tenants.findIndex(t => (t._id || t.id) === (user.id || user._id)) + 1
                : null;
              const dep = depositStatus(room);
              const pendingCount = state.payments.filter(p => p.status === 'pending' && (p.tenant && p.tenant.name === (user?.name || ''))).length;
              return (
                <div>
                  <div className="stats-grid">
                    <div className="stat-card blue">
                      <div className="stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <p className="stat-label">Total Beds</p>
                        <p className="stat-value">{stats.totalBeds}</p>
                      </div>
                    </div>
                    <div className="stat-card green">
                      <div className="stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M3 12h18"></path>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <p className="stat-label">Vacant Beds</p>
                        <p className="stat-value">{stats.vacantBeds}</p>
                      </div>
                    </div>
                    <div className="stat-card purple">
                      <div className="stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M3 12h18"></path><path d="M12 3v18"></path>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <p className="stat-label">Occupied Rooms</p>
                        <p className="stat-value">{stats.occupiedRooms}</p>
                      </div>
                    </div>
                    <div className="stat-card orange">
                      <div className="stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <circle cx="12" cy="12" r="9"></circle>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <p className="stat-label">Pending Payments</p>
                        <p className="stat-value">{pendingCount}</p>
                      </div>
                    </div>
                  </div>
                  <div className="card" style={{ marginTop: '16px' }}>
                    <h2>Your Room</h2>
                    <p>Room Number: {room ? room.roomNumber : 'Not assigned'}</p>
                    <p>Bed Number: {bedIndex || 'N/A'}</p>
                    <p>Room Type: {room ? room.type : 'N/A'}</p>
                    <p>Occupancy: {room ? ((room.occupied || 0) >= (room.capacity || 0) ? 'Full' : 'Available') : 'N/A'}</p>
                  </div>
                  <div className="card" style={{ marginTop: '16px' }}>
                    <h2>Deposit</h2>
                    <p>Amount: ₹{dep.amount}</p>
                    <p>Status: {dep.status}</p>
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
              <h1>Rooms</h1>
            </div>
            {state.rooms.map(room => (
              <div key={room._id}>
                Room {room.roomNumber} - {room.occupied ? 'Occupied' : 'Available'}
              </div>
            ))}
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

        {activeTab === 'profile' && <TenantProfile user={user} />}
      </main>
    </div>
  );
};

export default TenantDashboard;
