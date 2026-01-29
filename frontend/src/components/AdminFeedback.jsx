import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import config from '../config';
import { showToast } from './toastApi';
import './AdminFeedback.css';

const FEEDBACK_CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'Service', label: 'Service' },
  { value: 'Cleanliness', label: 'Cleanliness' },
  { value: 'Food', label: 'Food' },
  { value: 'Management', label: 'Management' },
  { value: 'Other', label: 'Other' }
];

const STATUS_MAP = {
  Submitted: { label: 'Submitted', color: 'blue', class: 'badge-submitted' },
  Reviewed: { label: 'Reviewed', color: 'yellow', class: 'badge-reviewed' },
  Replied: { label: 'Replied', color: 'green', class: 'badge-replied' }
};

const StarRating = ({ rating, readOnly = true }) => {
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star ${star <= rating ? 'filled' : ''} ${readOnly ? 'read-only' : ''}`}
        >
          ★
        </span>
      ))}
    </div>
  );
};

const AdminFeedback = () => {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    rating: '',
    status: ''
  });
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  const getToken = () => localStorage.getItem('token');

  // Fetch feedback statistics
  const fetchStats = useCallback(async () => {
    try {
      const token = getToken();
      const response = await axios.get(
        `${config.API_URL}/feedback/stats`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching feedback stats:', error);
    }
  }, []);

  // Fetch all feedback
  const fetchFeedback = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const token = getToken();
      
      // Build query params
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      
      if (filters.category) params.append('category', filters.category);
      if (filters.rating) params.append('rating', filters.rating);
      if (filters.status) params.append('status', filters.status);

      const response = await axios.get(
        `${config.API_URL}/feedback/all?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setFeedback(response.data.feedback);
        setPagination(response.data.pagination);
      } else {
        showToast('Error fetching feedback', 'error');
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
      showToast('Failed to fetch feedback', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters.category, filters.rating, filters.status]);

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({ category: '', rating: '', status: '' });
    fetchFeedback(1);
  };

  // Open reply modal
  const openReplyModal = (feedbackItem) => {
    setSelectedFeedback(feedbackItem);
    setReplyMessage('');
    setShowReplyModal(true);
  };

  // Submit reply
  const handleReplySubmit = async () => {
    if (!replyMessage.trim()) {
      showToast('Please enter a reply message', 'error');
      return;
    }

    try {
      setSubmittingReply(true);
      const token = getToken();
      
      const response = await axios.put(
        `${config.API_URL}/feedback/reply/${selectedFeedback._id}`,
        { adminReply: replyMessage },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        showToast('Reply sent successfully!', 'success');
        setShowReplyModal(false);
        fetchFeedback(pagination.page);
        fetchStats(); // Refresh stats
      } else {
        showToast('Error sending reply', 'error');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      showToast('Failed to send reply', 'error');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Delete feedback
  const handleDelete = async (feedbackId) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) {
      return;
    }

    try {
      const token = getToken();
      const response = await axios.delete(
        `${config.API_URL}/feedback/${feedbackId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        showToast('Feedback deleted successfully!', 'success');
        fetchFeedback(pagination.page);
        fetchStats(); // Refresh stats
      } else {
        showToast('Error deleting feedback', 'error');
      }
    } catch (error) {
      console.error('Error deleting feedback:', error);
      showToast('Failed to delete feedback', 'error');
    }
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchFeedback(newPage);
    }
  };

  useEffect(() => {
    fetchFeedback();
    fetchStats();
  }, [fetchFeedback, fetchStats]);

  // Re-fetch when filters change (with debouncing)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchFeedback(1);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters, fetchFeedback]);

  return (
    <div className="admin-feedback-container">
      <div className="feedback-header">
        <h2>Feedback Management</h2>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>{stats.stats.totalFeedback}</h3>
              <p>Total Feedback</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-content">
              <h3>{stats.stats.averageRating.toFixed(1)}</h3>
              <p>Average Rating</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📤</div>
            <div className="stat-content">
              <h3>{stats.stats.submittedCount}</h3>
              <p>Submitted</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>{stats.stats.repliedCount}</h3>
              <p>Replied</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <h3>Filters</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
            >
              {FEEDBACK_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="rating">Rating</label>
            <select
              id="rating"
              name="rating"
              value={filters.rating}
              onChange={handleFilterChange}
            >
              <option value="">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">All Status</option>
              <option value="Submitted">Submitted</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Replied">Replied</option>
            </select>
          </div>
          
          <div className="filter-actions">
            <button className="btn btn-secondary" onClick={resetFilters}>
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="loading">Loading feedback...</div>
      ) : feedback.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <h3>No feedback found</h3>
          <p>Try adjusting your filters or wait for new feedback.</p>
        </div>
      ) : (
        <>
          <div className="feedback-list">
            {feedback.map(item => (
              <div key={item._id} className="feedback-card">
                <div className="feedback-header">
                  <div className="feedback-info">
                    <h4>{item.tenantName}</h4>
                    <span className={`badge ${STATUS_MAP[item.status].class}`}>
                      {STATUS_MAP[item.status].label}
                    </span>
                    <span className="category">{item.category}</span>
                    <span className="date">{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="feedback-rating">
                    <StarRating rating={item.rating} />
                  </div>
                </div>
                
                <div className="feedback-content">
                  <p className="message">{item.message}</p>
                  
                  {item.adminReply && (
                    <div className="admin-reply">
                      <div className="reply-header">
                        <strong>Your Reply:</strong>
                        <span className="reply-date">
                          {new Date(item.repliedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="reply-message">{item.adminReply}</p>
                    </div>
                  )}
                </div>
                
                <div className="feedback-actions">
                  {item.status !== 'Replied' && (
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => openReplyModal(item)}
                    >
                      Reply
                    </button>
                  )}
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(item._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="pagination">
              <button 
                className="btn btn-secondary"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Previous
              </button>
              
              <span className="page-info">
                Page {pagination.page} of {pagination.pages}
              </span>
              
              <button 
                className="btn btn-secondary"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Reply Modal */}
      {showReplyModal && (
        <div className="modal-overlay" onClick={() => setShowReplyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reply to Feedback</h3>
              <button className="close-btn" onClick={() => setShowReplyModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="feedback-preview">
                <h4>{selectedFeedback.tenantName}</h4>
                <p className="category">{selectedFeedback.category}</p>
                <div className="rating-preview">
                  <StarRating rating={selectedFeedback.rating} />
                </div>
                <p className="message">{selectedFeedback.message}</p>
              </div>
              
              <div className="form-group">
                <label htmlFor="reply">Your Reply</label>
                <textarea
                  id="reply"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Enter your reply..."
                  rows="4"
                  maxLength="1000"
                />
                <div className="character-count">
                  {replyMessage.length}/1000
                </div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowReplyModal(false)}
                disabled={submittingReply}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleReplySubmit}
                disabled={submittingReply || !replyMessage.trim()}
              >
                {submittingReply ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFeedback;