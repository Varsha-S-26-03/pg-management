import { useState } from 'react';

const OwnerDashboard = ({ user, onLogout, activeTab, setActiveTab, sidebarMinimized }) => {
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
          className={activeTab === 'properties' ? 'active' : ''} 
          onClick={() => setActiveTab('properties')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          </svg>
          My Properties
        </button>

        <button 
          className={activeTab === 'rooms' ? 'active' : ''} 
          onClick={() => setActiveTab('rooms')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="10" x2="21" y2="10"></line>
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

      <main className="main-content">
        <header className="top-bar">
          <div className="search-bar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input type="text" placeholder="Search properties, tenants, payments..." />
          </div>
          <div className="top-bar-actions">
            <button className="icon-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span className="badge">0</span>
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
                Add New Property
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
                  <p className="stat-label">Total Properties</p>
                  <h3 className="stat-value">0</h3>
                  <p className="stat-change">Add your first property</p>
                </div>
              </div>

              <div className="stat-card green">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <div className="stat-content">
                  <p className="stat-label">Total Rooms</p>
                  <h3 className="stat-value">0</h3>
                  <p className="stat-change">Start listing rooms</p>
                </div>
              </div>

              <div className="stat-card purple">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                  </svg>
                </div>
                <div className="stat-content">
                  <p className="stat-label">Active Tenants</p>
                  <h3 className="stat-value">0</h3>
                  <p className="stat-change">No tenants yet</p>
                </div>
              </div>

              <div className="stat-card orange">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
                <div className="stat-content">
                  <p className="stat-label">Monthly Revenue</p>
                  <h3 className="stat-value">₹0</h3>
                  <p className="stat-change">No revenue yet</p>
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
                      <p><strong>Get started</strong></p>
                      <span>Add your first property to begin managing your PG</span>
                    </div>
                    <span className="activity-time">Now</span>
                  </div>

                  <div className="activity-item">
                    <div className="activity-icon green">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                      </svg>
                    </div>
                    <div className="activity-content">
                      <p><strong>Property management</strong></p>
                      <span>List your properties and rooms to attract tenants</span>
                    </div>
                    <span className="activity-time">Start</span>
                  </div>

                  <div className="activity-item">
                    <div className="activity-icon purple">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </div>
                    <div className="activity-content">
                      <p><strong>Ready to manage</strong></p>
                      <span>Set up your property listings and start accepting bookings</span>
                    </div>
                    <span className="activity-time">Ready</span>
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
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="0, 100"/>
                      </svg>
                      <span>0%</span>
                    </div>
                    <p>Occupancy Rate</p>
                  </div>

                  <div className="quick-stat-item">
                    <div className="progress-circle green">
                      <svg viewBox="0 0 36 36">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e6e6e6" strokeWidth="3"/>
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="0, 100"/>
                      </svg>
                      <span>0%</span>
                    </div>
                    <p>Payment Collection</p>
                  </div>

                  <div className="quick-stat-item">
                    <div className="progress-circle purple">
                      <svg viewBox="0 0 36 36">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e6e6e6" strokeWidth="3"/>
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="0, 100"/>
                      </svg>
                      <span>0%</span>
                    </div>
                    <p>Tenant Satisfaction</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'properties' && (
          <div className="content-area">
            <div className="page-header">
              <h1>My Properties</h1>
              <button className="btn-primary">Add Property</button>
            </div>
            <p className="placeholder-text">Property management features coming soon...</p>
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
              <button className="btn-primary">Add Tenant</button>
            </div>
            <p className="placeholder-text">Tenant management features coming soon...</p>
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

export default OwnerDashboard;
