import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import config from '../config';
import { showToast } from './toastApi';
import { connectSocket, onNoticeNotification, onNoticeUpdate, offNoticeNotifications } from '../socket';
import './TenantNotice.css';

const PRIORITY_MAP = {
  Normal: { label: 'Normal', color: 'blue', class: 'badge-normal' },
  Important: { label: 'Important', color: 'orange', class: 'badge-important' },
  Urgent: { label: 'Urgent', color: 'red', class: 'badge-urgent' }
};

const TenantNotice = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  const getToken = () => localStorage.getItem('token');

  // Fetch notices
  const fetchNotices = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const token = getToken();
      
      const response = await axios.get(
        `${config.API_URL}/notices/active?page=${page}&limit=10`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setNotices(response.data.notices);
        setPagination(response.data.pagination);
      } else {
        showToast('Error fetching notices', 'error');
      }
    } catch (error) {
      console.error('Error fetching notices:', error);
      showToast('Failed to fetch notices', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle new notice from socket
  const handleNewNotice = useCallback((newNotice) => {
    setNotices(prev => [newNotice, ...prev]);
    showToast('New notice published!', 'info');
  }, []);

  // Handle notice update from socket
  const handleNoticeUpdate = useCallback((updatedNotice) => {
    setNotices(prev => {
      const existingIndex = prev.findIndex(n => n._id === updatedNotice._id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = updatedNotice;
        return updated;
      } else {
        return [updatedNotice, ...prev];
      }
    });
    showToast('Notice updated!', 'info');
  }, []);

  // View notice details
  const viewNoticeDetails = (notice) => {
    setSelectedNotice(notice);
    setShowDetails(true);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Initialize
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    fetchNotices();
    connectSocket(userId);
    onNoticeNotification(handleNewNotice);
    onNoticeUpdate(handleNoticeUpdate);

    return () => {
      offNoticeNotifications();
    };
  }, [fetchNotices, handleNewNotice, handleNoticeUpdate]);

  // Pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchNotices(newPage);
    }
  };

  if (loading) {
    return (
      <div className="tenant-notice-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading notices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tenant-notice-container">
      <div className="notice-header">
        <h2>📢 Notices</h2>
        <p className="notice-subtitle">Important announcements and updates</p>
      </div>

      {notices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No notices available</h3>
          <p>Check back later for important announcements.</p>
        </div>
      ) : (
        <>
          <div className="notices-grid">
            {notices.map((notice) => {
              const priority = PRIORITY_MAP[notice.priority] || PRIORITY_MAP.Normal;
              return (
                <div key={notice._id} className="notice-card">
                  <div className="notice-card-header">
                    <span className={`priority-badge ${priority.class}`}>
                      {priority.label}
                    </span>
                    <span className="notice-date">
                      {formatDate(notice.createdAt)}
                    </span>
                  </div>
                  
                  <h3 className="notice-title">{notice.title}</h3>
                  <p className="notice-content">
                    {notice.content.length > 150 
                      ? `${notice.content.substring(0, 150)}...` 
                      : notice.content
                    }
                  </p>
                  
                  <div className="notice-card-footer">
                    <span className="notice-author">
                      By {notice.createdByName}
                    </span>
                    <button 
                      className="btn-view-details"
                      onClick={() => viewNoticeDetails(notice)}
                    >
                      Read More
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {pagination.pages > 1 && (
            <div className="pagination">
              <button 
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button 
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Notice Details Modal */}
      {showDetails && selectedNotice && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedNotice.title}</h2>
              <button 
                className="modal-close"
                onClick={() => setShowDetails(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="notice-meta">
                <span className={`priority-badge ${PRIORITY_MAP[selectedNotice.priority]?.class || 'badge-normal'}`}>
                  {PRIORITY_MAP[selectedNotice.priority]?.label || 'Normal'}
                </span>
                <span className="notice-date">
                  Published: {formatDate(selectedNotice.createdAt)}
                </span>
                {selectedNotice.updatedAt && (
                  <span className="notice-updated">
                    Updated: {formatDate(selectedNotice.updatedAt)}
                  </span>
                )}
              </div>
              
              <div className="notice-full-content">
                <p>{selectedNotice.content}</p>
              </div>
              
              <div className="notice-author-info">
                <p><strong>Published by:</strong> {selectedNotice.createdByName}</p>
                {selectedNotice.updatedByName && (
                  <p><strong>Last updated by:</strong> {selectedNotice.updatedByName}</p>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowDetails(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantNotice;