import React from 'react';
import './Stats.css';

const Stats = ({ stats, onNavigate }) => {
  const data = stats || {};

  const handleNavigate = (tab) => {
    if (typeof onNavigate === 'function') {
      onNavigate(tab);
    }
  };

  const occupiedBeds = data.occupiedBeds || 0;
  const totalBeds = data.totalRooms || 0;
  const occupancyPercent = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  return (
    <div className="stats-grid">
      <div className="stat-card blue" onClick={() => handleNavigate('users')} style={{ cursor: 'pointer' }}>
        <div className="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <div className="stat-content">
          <p className="stat-label">Active Tenants</p>
          <p className="stat-value">{data.totalUsers || 0}</p>
          <p className="stat-change">Tap to view all users</p>
        </div>
      </div>

      <div
        className="stat-card orange"
        onClick={() => handleNavigate('approvals')}
        style={{ cursor: 'pointer' }}
      >
        <div className="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12l2 2 4-4"></path>
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
        </div>
        <div className="stat-content">
          <p className="stat-label">Pending Approvals</p>
          <p className="stat-value">{data.pendingApprovals || 0}</p>
          <p className="stat-change">Tap to review new tenants</p>
        </div>
      </div>

      <div className="stat-card green">
        <div className="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21V3h18v18H3z"></path>
            <path d="M3 9h18"></path>
            <path d="M9 21V9"></path>
          </svg>
        </div>
        <div className="stat-content">
          <p className="stat-label">Occupancy</p>
          <p className="stat-value">
            {occupiedBeds}/{totalBeds}
          </p>
          <p className="stat-change">{occupancyPercent}% beds filled</p>
        </div>
      </div>

      <div
        className="stat-card purple"
        onClick={() => handleNavigate('payments')}
        style={{ cursor: 'pointer' }}
      >
        <div className="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        </div>
        <div className="stat-content">
          <p className="stat-label">Total Revenue</p>
          <p className="stat-value">₹{data.totalRevenue || 0}</p>
          <p className="stat-change">Tap to open payments</p>
        </div>
      </div>
    </div>
  );
};

export default Stats;
