import { useState, useEffect } from 'react';
import axios from 'axios';

const AdminDashboard = ({ user, onLogout, activeTab, setActiveTab, sidebarMinimized }) => {
  const [pendingTenants, setPendingTenants] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApprovals: 0,
    approvedTenants: 0,
    totalOwners: 0
  });

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
      const response = await axios.get('http://localhost:5000/api/auth/all-users', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const users = response.data.users || [];
      setStats({
        totalUsers: users.length,
        pendingApprovals: users.filter(u => u.role === 'tenant' && !u.isApproved).length,
        approvedTenants: users.filter(u => u.role === 'tenant' && u.isApproved).length,
        totalOwners: users.filter(u => u.role === 'owner').length
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

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

  return (
    <>
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

      <main className="main-content">
        <header className="top-bar">
          <div className="search-bar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input type="text" placeholder="Search users, tenants..." />
          </div>
        </header>

        {activeTab === 'overview' && (
          <div className="content-area">
            <div className="page-header">
              <div>
                <h1>Welcome back, {user?.name}! 👋</h1>
                <p>Admin Dashboard - System Overview</p>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card blue">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <div className="stat-content">
                  <p className="stat-label">Total Users</p>
                  <h3 className="stat-value">{stats.totalUsers}</h3>
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
                  <p className="stat-label">Pending Approvals</p>
                  <h3 className="stat-value">{stats.pendingApprovals}</h3>
                  <p className="stat-change">Requires attention</p>
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
                  <p className="stat-label">Approved Tenants</p>
                  <h3 className="stat-value">{stats.approvedTenants}</h3>
                </div>
              </div>

              <div className="stat-card purple">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  </svg>
                </div>
                <div className="stat-content">
                  <p className="stat-label">Property Owners</p>
                  <h3 className="stat-value">{stats.totalOwners}</h3>
                </div>
              </div>
            </div>

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
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="content-area">
            <div className="page-header">
              <h1>Tenant Approvals</h1>
              <button className="btn-primary" onClick={fetchPendingTenants}>
                Refresh
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
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Role</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Status</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map((user) => (
                        <tr key={user._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '12px' }}>{user.name}</td>
                          <td style={{ padding: '12px', color: '#6b7280' }}>{user.email}</td>
                          <td style={{ padding: '12px' }}>
                            <span className="role-badge">{user.role}</span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            {user.role === 'tenant' ? (
                              user.isApproved ? (
                                <span style={{ color: '#10b981', fontWeight: '600' }}>Approved</span>
                              ) : (
                                <span style={{ color: '#f59e0b', fontWeight: '600' }}>Pending</span>
                              )
                            ) : (
                              <span style={{ color: '#10b981', fontWeight: '600' }}>Active</span>
                            )}
                          </td>
                          <td style={{ padding: '12px', color: '#9ca3af', fontSize: '14px' }}>
                            {new Date(user.createdAt).toLocaleDateString('en-IN', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
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
      </main>
    </>
  );
};

export default AdminDashboard;

