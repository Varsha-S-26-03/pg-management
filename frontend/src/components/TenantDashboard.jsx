import { useState } from 'react';

const TenantDashboard = ({ user, onLogout, activeTab, setActiveTab, sidebarMinimized }) => {
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
          className={activeTab === 'search' ? 'active' : ''} 
          onClick={() => setActiveTab('search')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          Search Rooms
        </button>

        <button 
          className={activeTab === 'bookings' ? 'active' : ''} 
          onClick={() => setActiveTab('bookings')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          My Bookings
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
            <input type="text" placeholder="Search available rooms..." />
          </div>
        </header>

        {activeTab === 'overview' && (
          <div className="content-area">
            <div className="page-header">
              <div>
                <h1>Welcome, {user?.name}! 👋</h1>
                <p>Find your perfect PG accommodation</p>
              </div>
              <button className="btn-primary" onClick={() => setActiveTab('search')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                Search Rooms
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
                  <p className="stat-label">Active Bookings</p>
                  <h3 className="stat-value">0</h3>
                  <p className="stat-change">Start searching for rooms</p>
                </div>
              </div>

              <div className="stat-card green">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                    <line x1="1" y1="10" x2="23" y2="10"></line>
                  </svg>
                </div>
                <div className="stat-content">
                  <p className="stat-label">Total Paid</p>
                  <h3 className="stat-value">₹0</h3>
                  <p className="stat-change">No payments yet</p>
                </div>
              </div>

              <div className="stat-card purple">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <div className="stat-content">
                  <p className="stat-label">Saved Listings</p>
                  <h3 className="stat-value">0</h3>
                  <p className="stat-change">Save your favorites</p>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginTop: '24px' }}>
              <div className="card-header">
                <h2>Getting Started</h2>
              </div>
              <div style={{ padding: '20px 0' }}>
                <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                  Welcome to PG Management System! Here's how to get started:
                </p>
                <ul style={{ color: '#6b7280', lineHeight: '1.8' }}>
                  <li>Browse available rooms in your area</li>
                  <li>Book a room that fits your needs and budget</li>
                  <li>Make payments securely through the platform</li>
                  <li>Track your bookings and payment history</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="content-area">
            <div className="page-header">
              <h1>Search Rooms</h1>
            </div>
            <p className="placeholder-text">Room search features coming soon...</p>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="content-area">
            <div className="page-header">
              <h1>My Bookings</h1>
            </div>
            <p className="placeholder-text">Booking management features coming soon...</p>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="content-area">
            <div className="page-header">
              <h1>Payments</h1>
            </div>
            <p className="placeholder-text">Payment features coming soon...</p>
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

export default TenantDashboard;

