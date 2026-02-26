import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import config from '../config';
import { showToast } from './toastApi';
import { connectSocket, onFeedbackReply, offFeedbackReply } from '../socket';
import './TenantFeedback.css';

const FEEDBACK_CATEGORIES = [
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

const StarRating = ({ rating, onRatingChange, readOnly = false }) => {
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star ${star <= rating ? 'filled' : ''} ${readOnly ? 'read-only' : 'clickable'}`}
          onClick={() => !readOnly && onRatingChange(star)}
        >
          ★
        </span>
      ))}
    </div>
  );
};

const TenantFeedback = () => {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    rating: 0,
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  const getToken = () => localStorage.getItem('token');

  // Fetch feedback
  const fetchFeedback = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const token = getToken();
      
      const response = await axios.get(
        `${config.API_URL}/feedback/my-feedback?page=${page}&limit=10`,
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
  }, []);

  // Submit feedback
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const newErrors = {};
    if (!formData.category) newErrors.category = 'Please select a category';
    if (formData.rating === 0) newErrors.rating = 'Please provide a rating';
    if (!formData.message.trim()) newErrors.message = 'Please enter your feedback message';
    if (formData.message.trim().length < 10) newErrors.message = 'Feedback message must be at least 10 characters';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSubmitting(true);
      const token = getToken();
      
      const response = await axios.post(
        `${config.API_URL}/feedback/submit`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        showToast('Feedback submitted successfully!', 'success');
        setShowForm(false);
        setFormData({ category: '', rating: 0, message: '' });
        setErrors({});
        fetchFeedback(1); // Refresh feedback list
      } else {
        showToast('Error submitting feedback', 'error');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      showToast('Failed to submit feedback', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  // Handle rating change
  const handleRatingChange = (rating) => {
    setFormData(prev => ({ ...prev, rating }));
    setErrors(prev => ({ ...prev, rating: '' }));
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchFeedback(newPage);
    }
  };

  useEffect(() => {
    fetchFeedback();
    
    // Connect to Socket.io
    const userId = localStorage.getItem('userId');
    if (userId) {
      connectSocket(userId);
      
      // Listen for feedback replies
      onFeedbackReply(() => {
        showToast('Admin replied to your feedback!', 'info');
        fetchFeedback(); // Refresh feedback to show new reply
      });
    }
    
    return () => {
      offFeedbackReply();
    };
  }, [fetchFeedback]);

  return (
    <div className="tenant-feedback-container">
      <div className="feedback-header">
        <h2>My Feedback</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          Submit New Feedback
        </button>
      </div>

      {/* Feedback Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Submit Feedback</h3>
              <button className="close-btn" onClick={() => setShowForm(false)}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="feedback-form">
              <div className="form-group">
                <label htmlFor="category">Category *</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={errors.category ? 'error' : ''}
                >
                  <option value="">Select Category</option>
                  {FEEDBACK_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                {errors.category && <span className="error-text">{errors.category}</span>}
              </div>

              <div className="form-group">
                <label>Rating *</label>
                <StarRating 
                  rating={formData.rating}
                  onRatingChange={handleRatingChange}
                />
                {errors.rating && <span className="error-text">{errors.rating}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="message">Feedback Message *</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Please share your feedback..."
                  rows="4"
                  className={errors.message ? 'error' : ''}
                  maxLength="1000"
                />
                <div className="character-count">
                  {formData.message.length}/1000
                </div>
                {errors.message && <span className="error-text">{errors.message}</span>}
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback List */}
      {loading ? (
        <div className="loading">Loading feedback...</div>
      ) : feedback.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <h3>No feedback yet</h3>
          <p>Share your experience by submitting your first feedback!</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            Submit Feedback
          </button>
        </div>
      ) : (
        <>
          <div className="feedback-list">
            {feedback.map(item => (
              <div key={item._id} className="feedback-card">
                <div className="feedback-header">
                  <div className="feedback-info">
                    <span className={`badge ${STATUS_MAP[item.status].class}`}>
                      {STATUS_MAP[item.status].label}
                    </span>
                    <span className="category">{item.category}</span>
                    <span className="date">{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="feedback-rating">
                    <StarRating rating={item.rating} readOnly={true} />
                  </div>
                </div>
                
                <div className="feedback-content">
                  <p className="message">{item.message}</p>
                  
                  {item.adminReply && (
                    <div className="admin-reply">
                      <div className="reply-header">
                        <strong>Admin Reply:</strong>
                        <span className="reply-date">
                          {new Date(item.repliedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="reply-message">{item.adminReply}</p>
                    </div>
                  )}
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
    </div>
  );
};

export default TenantFeedback;