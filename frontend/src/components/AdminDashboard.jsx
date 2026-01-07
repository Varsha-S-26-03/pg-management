import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';
import Stats from './Stats';
import AiRentCalculator from './AiRentCalculator';
import RecentActivities from './RecentActivities';
import QuickStats from './QuickStats';
import Rooms from './Rooms';
import Payments from './Payments';

const AdminDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [pendingTenants, setPendingTenants] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalTenants: 0,
    pendingApprovals: 0,
    occupiedBeds: 0,
    totalRevenue: 0,
    balance:0,
    pendingPayments:0
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifBtnRef = useRef(null);
  const notifPanelRef = useRef(null);

  useEffect(() => {
    if (activeTab === 'approvals') {
      fetchPendingTenants();
    } else if (activeTab === 'users') {
      fetchAllUsers();
    }
    if (activeTab === 'overview') {
      fetchStats();
    }
  }, [activeTab]);

  const fetchPendingTenants = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/auth/pending-tenants', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setPendingTenants(response.data.tenants);
    } catch (error) {
      console.error('Error fetching pending tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/auth/all-users', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setAllUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching all users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/stats/admin', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    const items = [];
    if (stats.pendingApprovals > 0) {
      items.push({
        id: 'approvals',
        type: 'approval',
        message: `You have ${stats.pendingApprovals} tenant approval${stats.pendingApprovals !== 1 ? 's' : ''} pending`,
        timestamp: new Date().toISOString()
      });
    }
    if (stats.pendingPayments > 0) {
      items.push({
        id: 'payments',
        type: 'alert',
        message: `${stats.pendingPayments} payment reminder${stats.pendingPayments !== 1 ? 's' : ''} due`,
        timestamp: new Date().toISOString()
      });
    }
    items.push({
      id: 'system',
      type: 'system',
      message: 'System update: Dashboard metrics refreshed',
      timestamp: new Date().toISOString()
    });
    setNotifications(items);
  }, [stats]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!notificationsOpen) return;
      const btn = notifBtnRef.current;
      const panel = notifPanelRef.current;
      if (panel && !panel.contains(e.target) && btn && !btn.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [notificationsOpen]);

  const handleApprove = async (tenantId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/auth/approve-tenant/${tenantId}`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      fetchPendingTenants();
      fetchStats();
    } catch (error) {
      console.error('Error approving tenant:', error);
      alert(error.response?.data?.message || 'Error approving tenant');
    }
  };

  const handleReject = async (tenantId) => {
    if (!window.confirm('Are you sure you want to reject and delete this tenant account?')) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/auth/reject-tenant/${tenantId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      fetchPendingTenants();
      fetchStats();
    } catch (error) {
      console.error('Error rejecting tenant:', error);
      alert(error.response?.data?.message || 'Error rejecting tenant');
    }
  };

  const handleLogout = () => {
    onLogout();
  };

  const handleRemoveUser = async (userId) => {
    if (!window.confirm('Remove this user?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      fetchAllUsers();
      fetchStats();
    } catch (error) {
      alert(error.response?.data?.message || 'Error removing user');
    }
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>PG Manager</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={activeTab === 'overview' ? 'active' : ''} 
            onClick={() => setActiveTab('overview')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            Overview
          </button>

          <button 
            className={activeTab === 'approvals' ? 'active' : ''} 
            onClick={() => setActiveTab('approvals')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4"></path>
              <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
              <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
              <path d="M12 21c0-1-1-3-3-3s-3 2-3 3 1 3 3 3 3-2 3-3z"></path>
              <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3z"></path>
            </svg>
            Tenant Approvals
            {stats.pendingApprovals > 0 && (
              <span style={{ marginLeft: 'auto', background: '#dc2626', color: 'white', borderRadius: '10px', padding: '2px 8px', fontSize: '12px', fontWeight: '600' }}>
                {stats.pendingApprovals}
              </span>
            )}
          </button>

          <button 
            className={activeTab === 'users' ? 'active' : ''} 
            onClick={() => setActiveTab('users')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            All Users
          </button>

          <button 
            className={activeTab === 'rooms' ? 'active' : ''} 
            onClick={() => setActiveTab('rooms')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            </svg>
            Rooms
          </button>

          <button 
            className={activeTab === 'payments' ? 'active' : ''} 
            onClick={() => setActiveTab('payments')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
              <line x1="1" y1="10" x2="23" y2="10"></line>
            </svg>
            Payments
          </button>

          <button 
            className={activeTab === 'settings' ? 'active' : ''} 
            onClick={() => setActiveTab('settings')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"></path>
            </svg>
            Settings
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <p className="user-name">{user?.name}</p>
              <p className="user-role">{user?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div className="search-bar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input type="text" placeholder="Search rooms, tenants, payments..." />
          </div>
          <div className="top-bar-actions">
            <button
              className="icon-btn"
              onClick={() => setNotificationsOpen((v) => !v)}
              aria-haspopup="dialog"
              aria-expanded={notificationsOpen}
              aria-controls="notifications-panel"
              ref={notifBtnRef}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span className="badge">3</span>
            </button>
            {notificationsOpen && (
              <div
                className="notifications-panel"
                id="notifications-panel"
                role="dialog"
                aria-label="Notifications"
                ref={notifPanelRef}
              >
                <div className="notifications-header">
                  <span>Notifications</span>
                  <button
                    className="close-btn"
                    type="button"
                    onClick={() => setNotificationsOpen(false)}
                    aria-label="Close notifications"
                    title="Close"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                <ul className="notifications-list">
                  {notifications.length === 0 ? (
                    <li className="notification-item empty">No notifications</li>
                  ) : (
                    notifications.map((n) => (
                      <li key={n.id} className={`notification-item ${n.type}`}>
                        <div className="notification-icon">
                          {n.type === 'approval' ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M9 12l2 2 4-4"></path>
                              <circle cx="12" cy="12" r="9"></circle>
                            </svg>
                          ) : n.type === 'alert' ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                              <line x1="12" y1="9" x2="12" y2="13"></line>
                              <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 12h18M12 3v18"></path>
                            </svg>
                          )}
                        </div>
                        <div className="notification-content">
                          <span className="message">{n.message}</span>
                          <span className="timestamp">{new Date(n.timestamp).toLocaleString()}</span>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>
        </header>

        {activeTab === 'overview' && (
          <div className="content-area">
            <div className="page-header">
              <div>
                <h1>Welcome back, {user?.name}! 👋</h1>
                <p>Here's what's happening with your properties today</p>
              </div>
              <button className="btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add New Room
              </button>
            </div>

            <Stats stats={stats} />

            {stats.pendingApprovals > 0 && (
              <div className="card" style={{ marginTop: '24px', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '1px solid #f59e0b' }}>
                <div className="card-header">
                  <h2>⚠️ Action Required</h2>
                </div>
                <p style={{ margin: 0, color: '#92400e' }}>
                  You have <strong>{stats.pendingApprovals}</strong> tenant approval{stats.pendingApprovals !== 1 ? 's' : ''} pending. 
                  <button 
                    onClick={() => setActiveTab('approvals')} 
                    className="text-btn" 
                    style={{ marginLeft: '8px' }}
                  >
                    Review now →
                  </button>
                </p>
              </div>
            )}

            <div className="dashboard-grid" style={{ marginTop: '24px' }}>
              <RecentActivities />
              <QuickStats />
            </div>

            <div style={{ marginTop: '24px' }}>
              <AiRentCalculator />
            </div>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="content-area">
            <div className="page-header">
              <h1>Tenant Approvals</h1>
              <button className="btn-primary" onClick={fetchPendingTenants}>
                Refresh
              </button>
              <button 
                className="btn-primary" 
                onClick={() => navigate('/tenants')}
                style={{ marginLeft: '12px' }}
              >
                Open Tenants
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px' }}>
                <div className="spinner"></div>
                <p>Loading pending tenants...</p>
              </div>
            ) : pendingTenants.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '64px', height: '64px', margin: '0 auto 16px', color: '#10b981' }}>
                  <path d="M9 12l2 2 4-4"></path>
                  <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
                  <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
                </svg>
                <h2>All caught up!</h2>
                <p style={{ color: '#6b7280' }}>No pending tenant approvals at the moment.</p>
              </div>
            ) : (
              <div className="card">
                <div className="card-header">
                  <h2>Pending Approvals ({pendingTenants.length})</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {pendingTenants.map((tenant) => (
                    <div key={tenant._id} style={{ 
                      padding: '20px', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>{tenant.name}</h3>
                        <p style={{ margin: '0 0 4px 0', color: '#6b7280' }}>{tenant.email}</p>
                        {tenant.phone && (
                          <p style={{ margin: '0 0 4px 0', color: '#6b7280' }}>{tenant.phone}</p>
                        )}
                        {tenant.address && (
                          <p style={{ margin: '0 0 4px 0', color: '#6b7280' }}>{tenant.address}</p>
                        )}
                        {(tenant.idType || tenant.idNumber) && (
                          <p style={{ margin: '0 0 4px 0', color: '#6b7280' }}>
                            {tenant.idType ? tenant.idType.toUpperCase() : 'ID'} • {tenant.idNumber ? ('••••' + String(tenant.idNumber).slice(-4)) : ''}
                          </p>
                        )}
                        <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                          Signed up: {new Date(tenant.createdAt).toLocaleDateString('en-IN', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                          onClick={() => handleApprove(tenant._id)}
                          className="btn-primary"
                          style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleReject(tenant._id)}
                          style={{
                            padding: '12px 24px',
                            background: 'white',
                            color: '#dc2626',
                            border: '1px solid #dc2626',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#fee';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'white';
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="content-area">
            <div className="page-header">
              <h1>All Users</h1>
              <button className="btn-primary" onClick={fetchAllUsers}>
                Refresh
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px' }}>
                <div className="spinner"></div>
                <p>Loading users...</p>
              </div>
            ) : (
              <div className="card">
                <div className="card-header">
                  <h2>Users ({allUsers.length})</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Name</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Email</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Room No</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Role</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Status</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map((user) => (
                        <tr key={user._id} style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }} onClick={() => setSelectedUser(user)}>
                          <td style={{ padding: '12px' }}>{user.name}</td>
                          <td style={{ padding: '12px', color: '#6b7280' }}>{user.email}</td>
                          <td style={{ padding: '12px' }}>{user.roomNumber || '—'}</td>
                          <td style={{ padding: '12px' }}>
                            <span className="role-badge">{user.role}</span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            {user.role === 'tenant' ? (
                              user.approved ? (
                                <span style={{ color: '#10b981', fontWeight: '600' }}>Approved</span>
                              ) : (
                                <span style={{ color: '#f59e0b', fontWeight: '600' }}>Pending</span>
                              )
                            ) : (
                              <span style={{ color: '#10b981', fontWeight: '600' }}>Active</span>
                            )}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {user.role !== 'admin' && (
                              <button
                                className="text-btn remove"
                                onClick={(e) => { e.stopPropagation(); handleRemoveUser(user._id); }}
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'rooms' && <Rooms />}
        {activeTab === 'payments' && <Payments />}

        {activeTab === 'settings' && (
          <div className="content-area">
            <div className="page-header">
              <h1>Settings</h1>
            </div>
            <div className="card">
              <h2>Profile Information</h2>
              <div className="settings-section">
                <div className="setting-item">
                  <label>Full Name</label>
                  <p>{user?.name}</p>
                </div>
                <div className="setting-item">
                  <label>Email Address</label>
                  <p>{user?.email}</p>
                </div>
                <div className="setting-item">
                  <label>User Role</label>
                  <span className="role-badge">{user?.role}</span>
                </div>
                <div className="setting-item">
                  <label>Member Since</label>
                  <p>{new Date(user?.createdAt).toLocaleDateString('en-IN', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {selectedUser && (
          <div className="card" style={{ position: 'fixed', right: '24px', bottom: '24px', width: '360px', maxWidth: '90vw', zIndex: 50 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Details</h2>
              <button className="text-btn" onClick={() => setSelectedUser(null)}>Close</button>
            </div>
            <div style={{ padding: '16px' }}>
              <p><strong>Name:</strong> {selectedUser.name}</p>
              <p><strong>Email:</strong> {selectedUser.email}</p>
              <p><strong>Phone:</strong> {selectedUser.phone || '—'}</p>
              <p><strong>Address:</strong> {selectedUser.address || '—'}</p>
              <p><strong>Age:</strong> {typeof selectedUser.age === 'number' ? selectedUser.age : '—'}</p>
              <p><strong>Occupation:</strong> {selectedUser.occupation || '—'}</p>
              <p><strong>Room No:</strong> {selectedUser.roomNumber || '—'}</p>
              <p><strong>Joined:</strong> {new Date(selectedUser.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
              <p><strong>Move Out:</strong> {selectedUser.moveOutDate ? new Date(selectedUser.moveOutDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</p>
              <p><strong>Remaining Rent:</strong> {typeof selectedUser.remainingRent === 'number' ? `₹${selectedUser.remainingRent}` : '₹0'}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
