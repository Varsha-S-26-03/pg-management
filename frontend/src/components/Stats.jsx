import React from 'react';
import './Stats.css';

const Stats = ({ stats }) => {
  return (
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
          <p className="stat-label">Total Tenants</p>
          <h3 className="stat-value">{stats.totalTenants}</h3>
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
          <h3 className="stat-value">{stats.pendingPayments}</h3>
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
          <p className="stat-label">Occupied Beds</p>
          <h3 className="stat-value">{stats.occupiedBeds}</h3>
        </div>
      </div>

      <div className="stat-card purple">
        <div className="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          </svg>
        </div>
        <div className="stat-content">
          <p className="stat-label">Total Revenue</p>
          <h3 className="stat-value">₹{stats.totalRevenue}</h3>
        </div>
      </div>

      <div className="stat-card red">
        <div className="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        </div>
        <div className="stat-content">
          <p className="stat-label">Balance</p>
          <h3 className="stat-value">₹{stats.balance}</h3>
        </div>
      </div>
    </div>
  );
};

export default Stats;
