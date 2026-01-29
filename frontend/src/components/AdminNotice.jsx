import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import config from '../config';
import { showToast } from './toastApi';
import { onNoticeNotification, onNoticeUpdate, onNoticeDelete, offNoticeNotifications } from '../socket';
import './AdminNotice.css';

const PRIORITY_OPTIONS = [
  { value: 'Normal', label: 'Normal' },
  { value: 'Important', label: 'Important' },
  { value: 'Urgent', label: 'Urgent' }
];

const TARGET_AUDIENCE_OPTIONS = [
  { value: 'All Tenants', label: 'All Tenants' },
  { value: 'Selected Rooms', label: 'Selected Rooms' }
];

const PRIORITY_MAP = {
  Normal: { label: 'Normal', color: 'blue', class: 'badge-normal' },
  Important: { label: 'Important', color: 'orange', class: 'badge-important' },
  Urgent: { label: 'Urgent', color: 'red', class: 'badge-urgent' }
};

const AdminNotice = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'Normal',
    targetAudience: 'All Tenants',
    targetRooms: ''
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
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
        `${config.API_URL}/notices/all?page=${page}&limit=10`,
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

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    try {
      const token = getToken();
      const response = await axios.get(
        `${config.API_URL}/notices/stats`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (formData.title.trim().length > 200) {
      newErrors.title = 'Title must not exceed 200 characters';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    } else if (formData.content.trim().length < 10) {
      newErrors.content = 'Content must be at least 10 characters';
    } else if (formData.content.trim().length > 2000) {
      newErrors.content = 'Content must not exceed 2000 characters';
    }

    if (!formData.priority) {
      newErrors.priority = 'Priority is required';
    }

    if (!formData.targetAudience) {
      newErrors.targetAudience = 'Target audience is required';
    }

    if (formData.targetAudience === 'Selected Rooms' && !formData.targetRooms.trim()) {
      newErrors.targetRooms = 'Please specify target rooms';
    }

    return newErrors;
  };

  // Submit form (create or update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSubmitting(true);
      const token = getToken();
      
      const payload = {
        ...formData,
        targetRooms: formData.targetAudience === 'Selected Rooms' 
          ? formData.targetRooms.split(',').map(room => room.trim()).filter(Boolean)
          : []
      };

      let response;
      if (editingNotice) {
        response = await axios.put(
          `${config.API_URL}/notices/update/${editingNotice._id}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      } else {
        response = await axios.post(
          `${config.API_URL}/notices/create`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      }

      if (response.data.success) {
        showToast(
          editingNotice ? 'Notice updated successfully!' : 'Notice published successfully!',
          'success'
        );
        resetForm();
        fetchNotices();
        fetchStats();
      } else {
        showToast(response.data.message || 'Operation failed', 'error');
      }
    } catch (error) {
      console.error('Error submitting notice:', error);
      showToast('Failed to save notice', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      priority: 'Normal',
      targetAudience: 'All Tenants',
      targetRooms: ''
    });
    setErrors({});
    setShowForm(false);
    setEditingNotice(null);
  };

  // Edit notice
  const handleEdit = (notice) => {
    setFormData({
      title: notice.title,
      content: notice.content,
      priority: notice.priority,
      targetAudience: notice.targetAudience,
      targetRooms: notice.targetRooms ? notice.targetRooms.join(', ') : ''
    });
    setEditingNotice(notice);
    setShowForm(true);
  };

  // Delete notice
  const handleDelete = async (noticeId) => {
    if (!window.confirm('Are you sure you want to delete this notice? This action cannot be undone.')) {
      return;
    }

    try {
      const token = getToken();
      const response = await axios.delete(
        `${config.API_URL}/notices/delete/${noticeId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        showToast('Notice deleted successfully!', 'success');
        fetchNotices();
        fetchStats();
      } else {
        showToast(response.data.message || 'Failed to delete notice', 'error');
      }
    } catch (error) {
      console.error('Error deleting notice:', error);
      showToast('Failed to delete notice', 'error');
    }
  };

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
    fetchNotices();
    fetchStats();

    // Socket integration for real-time updates
    const userId = localStorage.getItem('userId');
    if (userId) {
      // Set up socket listeners
      onNoticeNotification(() => {
        showToast('New notice published', 'info');
        fetchNotices(pagination.page);
        fetchStats();
      });

      onNoticeUpdate(() => {
        showToast('Notice updated', 'info');
        fetchNotices(pagination.page);
        fetchStats();
      });

      onNoticeDelete(() => {
        showToast('Notice deleted', 'info');
        fetchNotices(pagination.page);
        fetchStats();
      });
    }

    // Cleanup socket listeners on unmount
    return () => {
      offNoticeNotifications();
    };
  }, [fetchNotices, fetchStats, pagination.page]);

  // Pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchNotices(newPage);
    }
  };

  if (loading && notices.length === 0) {
    return (
      <div className="admin-notice-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading notices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-notice-container">
      <div className="notice-header">
        <div className="header-top">
          <h2>📢 Notice Management</h2>
          <button 
            className="btn-primary"
            onClick={() => setShowForm(true)}
          >
            ➕ Create Notice
          </button>
        </div>
        <p className="notice-subtitle">Manage announcements and important updates</p>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📢</div>
            <div className="stat-content">
              <h3>{stats.totalNotices}</h3>
              <p>Total Notices</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔴</div>
            <div className="stat-content">
              <h3>{stats.urgentNotices}</h3>
              <p>Urgent Notices</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🟠</div>
            <div className="stat-content">
              <h3>{stats.importantNotices}</h3>
              <p>Important Notices</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>{stats.thisMonth}</h3>
              <p>This Month</p>
            </div>
          </div>
        </div>
      )}

      {/* Notices List */}
      <div className="notices-section">
        <h3>All Notices</h3>
        
        {notices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No notices found</h3>
            <p>Create your first notice to get started.</p>
          </div>
        ) : (
          <>
            <div className="notices-table">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Priority</th>
                    <th>Target</th>
                    <th>Created</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notices.map((notice) => {
                    const priority = PRIORITY_MAP[notice.priority] || PRIORITY_MAP.Normal;
                    return (
                      <tr key={notice._id}>
                        <td>
                          <div className="notice-title-cell">
                            <div className="notice-title">{notice.title}</div>
                            <div className="notice-preview">
                              {notice.content.length > 50 
                                ? `${notice.content.substring(0, 50)}...` 
                                : notice.content
                              }
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`priority-badge ${priority.class}`}>
                            {priority.label}
                          </span>
                        </td>
                        <td>
                          <span className="target-badge">
                            {notice.targetAudience}
                          </span>
                        </td>
                        <td>
                          <div className="date-cell">
                            <div>{formatDate(notice.createdAt)}</div>
                            <div className="date-author">by {notice.createdByName}</div>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${notice.status.toLowerCase()}`}>
                            {notice.status}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="btn-view"
                              onClick={() => viewNoticeDetails(notice)}
                              title="View Details"
                            >
                              👁
                            </button>
                            <button 
                              className="btn-edit"
                              onClick={() => handleEdit(notice)}
                              title="Edit Notice"
                            >
                              ✏️
                            </button>
                            <button 
                              className="btn-delete"
                              onClick={() => handleDelete(notice._id)}
                              title="Delete Notice"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingNotice ? 'Edit Notice' : 'Create New Notice'}</h2>
              <button 
                className="modal-close"
                onClick={resetForm}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="notice-form">
              <div className="form-group">
                <label htmlFor="title">Notice Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={errors.title ? 'error' : ''}
                  placeholder="Enter notice title"
                  maxLength="200"
                />
                {errors.title && <span className="error-message">{errors.title}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="content">Notice Content *</label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  className={errors.content ? 'error' : ''}
                  placeholder="Enter notice content"
                  rows="6"
                  maxLength="2000"
                />
                {errors.content && <span className="error-message">{errors.content}</span>}
                <div className="character-count">
                  {formData.content.length}/2000 characters
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="priority">Priority *</label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className={errors.priority ? 'error' : ''}
                  >
                    {PRIORITY_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.priority && <span className="error-message">{errors.priority}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="targetAudience">Target Audience *</label>
                  <select
                    id="targetAudience"
                    name="targetAudience"
                    value={formData.targetAudience}
                    onChange={handleInputChange}
                    className={errors.targetAudience ? 'error' : ''}
                  >
                    {TARGET_AUDIENCE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.targetAudience && <span className="error-message">{errors.targetAudience}</span>}
                </div>
              </div>

              {formData.targetAudience === 'Selected Rooms' && (
                <div className="form-group">
                  <label htmlFor="targetRooms">Target Rooms *</label>
                  <input
                    type="text"
                    id="targetRooms"
                    name="targetRooms"
                    value={formData.targetRooms}
                    onChange={handleInputChange}
                    className={errors.targetRooms ? 'error' : ''}
                    placeholder="e.g., 101, 102, 103 (comma-separated)"
                  />
                  {errors.targetRooms && <span className="error-message">{errors.targetRooms}</span>}
                  <div className="form-help">Enter room numbers separated by commas</div>
                </div>
              )}

              <div className="form-actions">
                <button 
                  type="button"
                  className="btn-secondary"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : (editingNotice ? 'Update Notice' : 'Publish Notice')}
                </button>
              </div>
            </form>
          </div>
        </div>
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
                <span className="target-badge">
                  {selectedNotice.targetAudience}
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
              
              {selectedNotice.targetAudience === 'Selected Rooms' && selectedNotice.targetRooms.length > 0 && (
                <div className="target-rooms">
                  <strong>Target Rooms:</strong> {selectedNotice.targetRooms.join(', ')}
                </div>
              )}
              
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
              <button 
                className="btn-primary"
                onClick={() => {
                  setShowDetails(false);
                  handleEdit(selectedNotice);
                }}
              >
                Edit Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotice;