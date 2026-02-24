import React from 'react';
import './MovedOutUserEnhanced.css';

const MovedOutUser = ({ user, onLogout }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="moved-out-container">
      <div className="moved-out-card">
        <div className="moved-out-header">
          <div className="moved-out-icon">🏠</div>
          <h1>Account Deactivated</h1>
        </div>
        
        <div className="moved-out-content">
          <div className="user-info">
            <h2>Hello, {user?.name}</h2>
            <p className="email">{user?.email}</p>
          </div>
          
          <div className="deactivation-details">
            <div className="detail-item">
              <span className="label">Status:</span>
              <span className="value status-moved-out">Moved Out</span>
            </div>
            
            {user?.moveOutDate && (
              <div className="detail-item">
                <span className="label">Moved Out Date:</span>
                <span className="value">{formatDate(user.moveOutDate)}</span>
              </div>
            )}
            
            <div className="detail-item">
              <span className="label">Account Created:</span>
              <span className="value">{formatDate(user?.createdAt)}</span>
            </div>
          </div>
          
          <div className="message-box">
            <div className="message-icon">ℹ️</div>
            <div className="message-content">
              <h3>Account Deactivated</h3>
              <p>
                Your account has been deactivated as you have moved out from the PG accommodation. 
                You no longer have access to tenant features.
              </p>
            </div>
          </div>
          
          <div className="action-section">
            <h3>Need Assistance?</h3>
            <p>
              If you believe this is an error or if you need to reactivate your account, 
              please contact the PG owner or management.
            </p>
            
            <div className="contact-info">
              <div className="contact-item">
                <span className="contact-icon">📧</span>
                <span>Contact: admin@pgmanagement.com</span>
              </div>
              <div className="contact-item">
                <span className="contact-icon">📞</span>
                <span>Phone: +91-XXXXXXXXXX</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="moved-out-footer">
          <button onClick={onLogout} className="logout-button">
            <span className="logout-icon">🚪</span>
            Sign Out
          </button>
        </div>
      </div>
      
      <div className="moved-out-background">
        <div className="background-pattern"></div>
      </div>
    </div>
  );
};

export default MovedOutUser;