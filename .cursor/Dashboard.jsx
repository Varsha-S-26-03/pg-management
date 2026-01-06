import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Tenants from './Tenants';
import AddTenant from './AddTenant';
import './Dashboard.css';

const Dashboard = ({ onLogout }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const maskId = (id) => {
    if (!id) return '';
    const s = String(id);
    if (s.length <= 4) return s;
    // show only last 4, mask the rest
    return '••••' + s.slice(-4);
  };
  const navigate = useNavigate();
  const location = useLocation();
  const [showAdd, setShowAdd] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    address: '',
    idType: '',
    idNumber: ''
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/auth/profile', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setUser(response.data);
      } catch (error) {
        console.error('Error fetching profile:', error);
        handleLogout();
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();

    // check query param to open Add Tenant inline
    const qp = new URLSearchParams(location.search);
    if (qp.get('openAdd') === '1') {
      setActiveTab('tenants');
      setShowAdd(true);
    }
  }, [location.search]);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const handleEdit = () => {
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      address: user.address || '',
      idType: user.idType || '',
      idNumber: user.idNumber || ''
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put('http://localhost:5000/api/auth/profile', editForm, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUser(response.data.user);
      setIsEditing(false);
      alert('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(error.response?.data?.message || 'Error updating profile');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

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
            className={activeTab === 'rooms' ? 'active' : ''} 
            onClick={() => setActiveTab('rooms')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            </svg>
            Rooms
          </button>

          <button 
            className={activeTab === 'tenants' ? 'active' : ''} 
            onClick={() => setActiveTab('tenants')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Tenants
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
            <button className="icon-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span className="badge">3</span>
            </button>
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

            <div className="stats-grid">
              <div className="stat-card blue">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  </svg>
                </div>
                <div className="stat-content">
                  <p className="stat-label">Total Rooms</p>
                  <h3 className="stat-value">24</h3>
                  <p className="stat-change positive">
                    <span>↑ 12%</span> from last month
                  </p>
                </div>
              </div>

              <div className="stat-card green">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                  </svg>
                </div>
                <div className="stat-content">
                  <p className="stat-label">Active Tenants</p>
                  <h3 className="stat-value">18</h3>
                  <p className="stat-change positive">
                    <span>↑ 8%</span> occupancy rate
                  </p>
                </div>
              </div>

              <div className="stat-card purple">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
                <div className="stat-content">
                  <p className="stat-label">Monthly Revenue</p>
                  <h3 className="stat-value">₹2,45,000</h3>
                  <p className="stat-change positive">
                    <span>↑ 15%</span> from last month
                  </p>
                </div>
              </div>

              <div className="stat-card orange">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <div className="stat-content">
                  <p className="stat-label">Pending Payments</p>
                  <h3 className="stat-value">₹45,000</h3>
                  <p className="stat-change negative">
                    <span>↓ 5%</span> improvement
                  </p>
                </div>
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="card">
                <div className="card-header">
                  <h2>Recent Activities</h2>
                  <button className="text-btn">View All</button>
                </div>
                <div className="activity-list">
                  <div className="activity-item">
                    <div className="activity-icon blue">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                    <div className="activity-content">
                      <p><strong>New tenant added</strong></p>
                      <span>Rajesh Kumar moved to Room 204</span>
                    </div>
                    <span className="activity-time">2h ago</span>
                  </div>

                  <div className="activity-item">
                    <div className="activity-icon green">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </div>
                    <div className="activity-content">
                      <p><strong>Payment received</strong></p>
                      <span>₹12,000 from Priya Sharma</span>
                    </div>
                    <span className="activity-time">5h ago</span>
                  </div>

                  <div className="activity-item">
                    <div className="activity-icon purple">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                      </svg>
                    </div>
                    <div className="activity-content">
                      <p><strong>Room maintenance</strong></p>
                      <span>Room 105 marked for cleaning</span>
                    </div>
                    <span className="activity-time">1d ago</span>
                  </div>

                  <div className="activity-item">
                    <div className="activity-icon orange">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    </div>
                    <div className="activity-content">
                      <p><strong>Payment reminder sent</strong></p>
                      <span>Notification to 3 tenants</span>
                    </div>
                    <span className="activity-time">2d ago</span>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h2>Quick Stats</h2>
                </div>
                <div className="quick-stats">
                  <div className="quick-stat-item">
                    <div className="progress-circle blue">
                      <svg viewBox="0 0 36 36">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e6e6e6" strokeWidth="3"/>
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="75, 100"/>
                      </svg>
                      <span>75%</span>
                    </div>
                    <p>Occupancy Rate</p>
                  </div>

                  <div className="quick-stat-item">
                    <div className="progress-circle green">
                      <svg viewBox="0 0 36 36">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e6e6e6" strokeWidth="3"/>
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="88, 100"/>
                      </svg>
                      <span>88%</span>
                    </div>
                    <p>Payment Collection</p>
                  </div>

                  <div className="quick-stat-item">
                    <div className="progress-circle purple">
                      <svg viewBox="0 0 36 36">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e6e6e6" strokeWidth="3"/>
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="92, 100"/>
                      </svg>
                      <span>92%</span>
                    </div>
                    <p>Tenant Satisfaction</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rooms' && (
          <div className="content-area">
            <div className="page-header">
              <h1>Room Management</h1>
              <button className="btn-primary">Add New Room</button>
            </div>
            <p className="placeholder-text">Room management features coming soon...</p>
          </div>
        )}

        {activeTab === 'tenants' && (
          <div className="content-area">
            <div className="page-header">
              <h1>Tenant Management</h1>
              <button className="btn-primary" onClick={() => setActiveTab('tenants')}>Manage Tenants</button>
            </div>
            {showAdd && (
              <div style={{ marginBottom: 16 }}>
                <AddTenant onCreated={() => setShowAdd(false)} />
              </div>
            )}
            <Tenants />
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="content-area">
            <div className="page-header">
              <h1>Payment Tracking</h1>
              <button className="btn-primary">Record Payment</button>
            </div>
            <p className="placeholder-text">Payment tracking features coming soon...</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="content-area">
            <div className="page-header">
              <h1>Settings</h1>
              {!isEditing && (
                <button className="btn-primary" onClick={handleEdit}>
                  Edit Profile
                </button>
              )}
            </div>
            <div className="card">
              <h2>Profile Information</h2>
              {isEditing ? (
                <form onSubmit={handleSave} className="settings-form">
                  <div className="settings-section">
                    <div className="setting-item">
                      <label>Full Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        required
                        className="form-input"
                      />
                    </div>
                    <div className="setting-item">
                      <label>Email Address</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                        required
                        className="form-input"
                      />
                    </div>
                    <div className="setting-item">
                      <label>Address</label>
                      <input
                        type="text"
                        value={editForm.address}
                        onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                        className="form-input"
                      />
                    </div>
                    <div className="setting-item">
                      <label>ID Type</label>
                      <select
                        value={editForm.idType}
                        onChange={(e) => setEditForm({...editForm, idType: e.target.value})}
                        className="form-input"
                      >
                        <option value="">Select ID Type</option>
                        <option value="aadhaar">Aadhaar</option>
                        <option value="pan">PAN Card</option>
                      </select>
                    </div>
                    <div className="setting-item">
                      <label>ID Number</label>
                      <input
                        type="text"
                        value={editForm.idNumber}
                        onChange={(e) => setEditForm({...editForm, idNumber: e.target.value})}
                        className="form-input"
                      />
                    </div>
                    <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                      <button type="submit" className="btn-primary">Save Changes</button>
                      <button type="button" onClick={handleCancel} className="text-btn" style={{ border: '1px solid #ccc', padding: '8px 16px', borderRadius: '6px' }}>Cancel</button>
                    </div>
                  </div>
                </form>
              ) : (
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
                    <label>Address</label>
                    <p>{user?.address || 'Not provided'}</p>
                  </div>
                  <div className="setting-item">
                    <label>ID</label>
                    <p>{user?.idType ? `${user.idType.toUpperCase()} • ${maskId(user?.idNumber)}` : 'Not provided'}</p>
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
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
