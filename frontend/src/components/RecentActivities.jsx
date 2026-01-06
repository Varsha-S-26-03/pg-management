import React from 'react';
import './RecentActivities.css';

const RecentActivities = () => {
  const activities = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      ),
      title: 'New tenant added',
      description: 'Rajesh Kumar moved to Room 204',
      time: '2h ago',
      iconColor: 'blue',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      ),
      title: 'Payment received',
      description: '₹12,000 from Priya Sharma',
      time: '5h ago',
      iconColor: 'green',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        </svg>
      ),
      title: 'Room maintenance',
      description: 'Room 105 marked for cleaning',
      time: '1d ago',
      iconColor: 'purple',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      ),
      title: 'Payment reminder sent',
      description: 'Notification to 3 tenants',
      time: '2d ago',
      iconColor: 'orange',
    },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <h2>Recent Activities</h2>
        <button className="text-btn">View All</button>
      </div>
      <div className="activity-list">
        {activities.map((activity, index) => (
          <div className="activity-item" key={index}>
            <div className={`activity-icon ${activity.iconColor}`}>{activity.icon}</div>
            <div className="activity-content">
              <p>
                <strong>{activity.title}</strong>
              </p>
              <span>{activity.description}</span>
            </div>
            <span className="activity-time">{activity.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentActivities;
