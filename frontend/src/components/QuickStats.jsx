import React from 'react';
import './QuickStats.css';

const QuickStats = () => {
  const stats = [
    {
      label: 'Occupancy Rate',
      percentage: 75,
      color: 'blue',
    },
    {
      label: 'Payment Collection',
      percentage: 88,
      color: 'green',
    },
    {
      label: 'Tenant Satisfaction',
      percentage: 92,
      color: 'purple',
    },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <h2>Quick Stats</h2>
      </div>
      <div className="quick-stats">
        {stats.map((stat, index) => (
          <div className="quick-stat-item" key={index}>
            <div className={`progress-circle ${stat.color}`}>
              <svg viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e6e6e6"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${stat.percentage}, 100`}
                />
              </svg>
              <span>{stat.percentage}%</span>
            </div>
            <p>{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuickStats;
