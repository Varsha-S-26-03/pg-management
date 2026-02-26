import { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import { showToast } from './toastApi';
import './TenantComplaints.css';

const CATEGORIES = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'water', label: 'Water Issue' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'cleanliness', label: 'Cleanliness' },
  { value: 'food', label: 'Food' },
  { value: 'security', label: 'Security' },
  { value: 'other', label: 'Other' }
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
];

const STATUS_MAP = {
  pending: { label: 'Pending', color: 'yellow', class: 'badge-pending' },
  'in-progress': { label: 'In Progress', color: 'blue', class: 'badge-in-progress' },
  resolved: { label: 'Resolved', color: 'green', class: 'badge-resolved' },
  rejected: { label: 'Rejected', color: 'red', class: 'badge-rejected' },
  closed: { label: 'Closed', color: 'gray', class: 'badge-closed' }
};

const TenantComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    priority: 'medium',
    description: '',
    image: null
  });
  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);

  const getToken = () => localStorage.getItem('token');

  // Fetch complaints
  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${config.API_URL}/complaints`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setComplaints(res.data.complaints || []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      showToast('Failed to load complaints', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showToast('Image size should be less than 5MB', 'error');
        return;
      }
      if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file', 'error');
        return;
      }
      setFormData(prev => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove image
  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image: null }));
    setImagePreview(null);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Complaint title is required';
    }
    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit complaint
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast('Please fix the form errors', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const complaintData = new FormData();
      complaintData.append('title', formData.title.trim());
      complaintData.append('category', formData.category);
      complaintData.append('priority', formData.priority);
      complaintData.append('description', formData.description.trim());
      if (formData.image) {
        complaintData.append('image', formData.image);
      }

      await axios.post(`${config.API_URL}/complaints`, complaintData, {
        headers: {
          Authorization: `Bearer ${getToken()}`
          // Don't set Content-Type - axios sets it automatically with boundary for FormData
        }
      });

      // Reset form
      setFormData({
        title: '',
        category: '',
        priority: 'medium',
        description: '',
        image: null
      });
      setImagePreview(null);
      setErrors({});
      showToast('Complaint submitted successfully', 'success');
      fetchComplaints();
    } catch (error) {
      console.error('Error submitting complaint:', error);
      showToast(error.response?.data?.message || 'Failed to submit complaint', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setFormData({
      title: '',
      category: '',
      priority: 'medium',
      description: '',
      image: null
    });
    setImagePreview(null);
    setErrors({});
  };

  // Delete complaint
  const handleDelete = async (complaintId) => {
    const confirmed = window.confirm('Are you sure you want to delete this complaint?');
    if (!confirmed) return;

    try {
      await axios.delete(`${config.API_URL}/complaints/${complaintId}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      showToast('Complaint deleted successfully', 'success');
      fetchComplaints();
    } catch (error) {
      console.error('Error deleting complaint:', error);
      showToast(error.response?.data?.message || 'Failed to delete complaint', 'error');
    }
  };

  // View details
  const handleViewDetails = (complaint) => {
    setSelectedComplaint(complaint);
    setShowModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedComplaint(null);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusInfo = STATUS_MAP[status] || STATUS_MAP.pending;
    return (
      <span className={`status-badge ${statusInfo.class}`}>
        {statusInfo.label}
      </span>
    );
  };

  return (
    <div className="tenant-complaints">
      {/* Header Section */}
      <div className="complaints-header">
        <div>
          <h1>My Complaints</h1>
          <p>Raise and track issues related to your PG stay.</p>
        </div>
      </div>

      {/* Raise Complaint Form */}
      <div className="complaint-form-card">
        <h2>Raise a Complaint</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">
              Complaint Title <span className="required">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter complaint title"
              className={errors.title ? 'error' : ''}
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">
                Category <span className="required">*</span>
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={errors.category ? 'error' : ''}
              >
                <option value="">Select category</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              {errors.category && <span className="error-message">{errors.category}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                {PRIORITIES.map(pri => (
                  <option key={pri.value} value={pri.value}>{pri.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">
              Description <span className="required">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your complaint in detail..."
              rows="5"
              className={errors.description ? 'error' : ''}
            />
            {errors.description && <span className="error-message">{errors.description}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="image">Attach Image (Optional)</label>
            <div className="image-upload-container">
              <input
                type="file"
                id="image"
                accept="image/*"
                onChange={handleImageChange}
                className="image-input"
              />
              <label htmlFor="image" className="image-upload-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Choose Image
              </label>
              {imagePreview && (
                <div className="image-preview">
                  <img src={imagePreview} alt="Preview" />
                  <button type="button" onClick={handleRemoveImage} className="remove-image-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={handleReset} className="btn-secondary" disabled={submitting}>
              Reset
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <svg className="spinner" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" opacity="0.75" />
                  </svg>
                  Submitting...
                </>
              ) : (
                'Submit Complaint'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Complaint List / History */}
      <div className="complaints-list-section">
        <h2>Complaint History</h2>
        {loading ? (
          <div className="loading-state">
            <div className="spinner-large"></div>
            <p>Loading complaints...</p>
          </div>
        ) : complaints.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <p>No complaints yet. Raise a complaint using the form above.</p>
          </div>
        ) : (
          <div className="complaints-grid">
            {complaints.map(complaint => (
              <div key={complaint._id} className="complaint-card">
                <div className="complaint-card-header">
                  <div className="complaint-title-section">
                    <h3>{complaint.title}</h3>
                    <span className="complaint-id">ID: {complaint._id.slice(-8)}</span>
                  </div>
                  {getStatusBadge(complaint.status)}
                </div>

                <div className="complaint-card-body">
                  <div className="complaint-meta">
                    <span className="meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      </svg>
                      {CATEGORIES.find(c => c.value === complaint.category)?.label || complaint.category}
                    </span>
                    <span className="meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {formatDate(complaint.createdAt)}
                    </span>
                    <span className={`priority-badge priority-${complaint.priority}`}>
                      {PRIORITIES.find(p => p.value === complaint.priority)?.label || complaint.priority}
                    </span>
                  </div>

                  <p className="complaint-description-preview">
                    {complaint.description.length > 100
                      ? `${complaint.description.substring(0, 100)}...`
                      : complaint.description}
                  </p>

                  {complaint.attachments && complaint.attachments.length > 0 && (
                    <div className="complaint-attachments">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      {complaint.attachments.length} attachment(s)
                    </div>
                  )}
                </div>

                <div className="complaint-card-actions">
                  <button
                    onClick={() => handleViewDetails(complaint)}
                    className="btn-view"
                  >
                    View Details
                  </button>
                  {complaint.status === 'pending' && (
                    <button
                      onClick={() => handleDelete(complaint._id)}
                      className="btn-delete"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complaint Details Modal */}
      {showModal && selectedComplaint && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Complaint Details</h2>
              <button onClick={handleCloseModal} className="modal-close-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <div className="detail-row">
                  <span className="detail-label">Complaint ID:</span>
                  <span className="detail-value">{selectedComplaint._id}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Title:</span>
                  <span className="detail-value">{selectedComplaint.title}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Category:</span>
                  <span className="detail-value">
                    {CATEGORIES.find(c => c.value === selectedComplaint.category)?.label || selectedComplaint.category}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Priority:</span>
                  <span className={`priority-badge priority-${selectedComplaint.priority}`}>
                    {PRIORITIES.find(p => p.value === selectedComplaint.priority)?.label || selectedComplaint.priority}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  {getStatusBadge(selectedComplaint.status)}
                </div>
                <div className="detail-row">
                  <span className="detail-label">Date Submitted:</span>
                  <span className="detail-value">{formatDate(selectedComplaint.createdAt)}</span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Description</h3>
                <p className="detail-description">{selectedComplaint.description}</p>
              </div>

              {selectedComplaint.attachments && selectedComplaint.attachments.length > 0 && (
                <div className="detail-section">
                  <h3>Attachments</h3>
                  <div className="attachments-list">
                    {selectedComplaint.attachments.map((att, idx) => {
                      // Use full URL if it's already a full URL, otherwise prepend API base URL
                      const imageUrl = att.url.startsWith('http') 
                        ? att.url 
                        : `${config.API_URL.replace('/api', '')}${att.url}`;
                      return (
                        <div key={idx} className="attachment-item">
                          <a
                            href={imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="attachment-link"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            {att.filename || `Attachment ${idx + 1}`}
                          </a>
                          {att.url && att.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                            <div className="attachment-preview">
                              <img src={imageUrl} alt={att.filename || `Attachment ${idx + 1}`} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedComplaint.resolution && (
                <div className="detail-section response-section">
                  <h3>Admin Response</h3>
                  {selectedComplaint.resolution.description && (
                    <p className="response-text">{selectedComplaint.resolution.description}</p>
                  )}
                  {selectedComplaint.resolution.resolvedAt && (
                    <p className="response-date">
                      Resolved on: {formatDate(selectedComplaint.resolution.resolvedAt)}
                    </p>
                  )}
                </div>
              )}

              {(!selectedComplaint.resolution || selectedComplaint.status === 'pending') && (
                <div className="detail-section">
                  <p className="no-response">No response yet. We'll update you once the admin responds.</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={handleCloseModal} className="btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantComplaints;
