import { useState } from 'react';
import axios from 'axios';
import config from '../config';
import './MoveOut.css';

const TenantMoveOut = ({ notices, onRefresh }) => {
  const [moveOutDate, setMoveOutDate] = useState('');
  const [reason, setReason] = useState('');
  const [noticePeriodAck, setNoticePeriodAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if there is an active request
  const activeRequest = notices.find(n => ['pending', 'approved', 'submitted'].includes(n.status));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!noticePeriodAck) {
      setError('Please acknowledge the notice period.');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${config.API_URL}/moveouts`, {
        moveOutDate,
        reason,
        noticePeriodAcknowledgement: noticePeriodAck
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Move-out request submitted successfully!');
      setMoveOutDate('');
      setReason('');
      setNoticePeriodAck(false);
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this request?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${config.API_URL}/moveouts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onRefresh();
      setSuccess('Request deleted successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete request');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
      case 'submitted':
        return <span className="status-badge pending">Pending</span>;
      case 'approved':
        return <span className="status-badge approved">Approved</span>;
      case 'rejected':
        return <span className="status-badge rejected">Rejected</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <div className="content-area">
      <div className="moveout-container">
        <div className="page-header">
          <h1>Move-out Requests</h1>
        </div>

        {!activeRequest ? (
          <div className="card">
            <div className="card-header">
              <h2>Submit Move-Out Request</h2>
            </div>
            <div className="card-body">
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}
              
              <form onSubmit={handleSubmit} className="form-grid">
                <div className="field-group">
                  <label>Intended Move-Out Date</label>
                  <input 
                    type="date" 
                    className="form-input"
                    value={moveOutDate}
                    onChange={(e) => setMoveOutDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="field-group">
                  <label>Reason for Move-Out</label>
                  <select 
                    className="form-input"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  >
                    <option value="">Select a reason...</option>
                    <option value="Job Change">Job Change</option>
                    <option value="Relocation">Relocation</option>
                    <option value="Course Completed">Course Completed</option>
                    <option value="Not Satisfied">Not Satisfied</option>
                    <option value="Other">Other</option>
                  </select>
                  {reason === 'Other' && (
                    <textarea
                      className="form-input"
                      placeholder="Please specify..."
                      onChange={(e) => setReason(e.target.value)}
                    />
                  )}
                </div>

                <div className="field-group checkbox-group">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox"
                      checked={noticePeriodAck}
                      onChange={(e) => setNoticePeriodAck(e.target.checked)}
                    />
                    I acknowledge the notice period policy.
                  </label>
                </div>

                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body">
              <div className="info-box">
                <p>You have an active move-out request. You cannot submit a new one until the current one is resolved.</p>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h2>My Move-Out Requests</h2>
          </div>
          <div className="card-body">
            {notices.length === 0 ? (
              <p>No move-out requests found.</p>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Request ID</th>
                      <th>Room</th>
                      <th>Move-Out Date</th>
                      <th>Submitted Date</th>
                      <th>Status</th>
                      <th>Admin Reply</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notices.map((notice) => (
                      <tr key={notice._id}>
                        <td>#{notice._id.slice(-6).toUpperCase()}</td>
                        <td>{notice.roomNumber || 'N/A'}</td>
                        <td>{new Date(notice.moveOutDate).toLocaleDateString()}</td>
                        <td>{new Date(notice.createdAt).toLocaleDateString()}</td>
                        <td>{getStatusBadge(notice.status)}</td>
                        <td>{notice.adminReply || '-'}</td>
                        <td>
                          {['pending', 'submitted'].includes(notice.status) && (
                            <button 
                              className="btn-danger btn-sm"
                              onClick={() => handleDelete(notice._id)}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantMoveOut;
