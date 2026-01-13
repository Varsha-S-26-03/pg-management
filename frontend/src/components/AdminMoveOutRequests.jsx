import { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import './MoveOut.css';

const AdminMoveOutRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState({});

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${config.API_URL}/moveouts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data.notices);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch move-out requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleStatusUpdate = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${config.API_URL}/moveouts/${id}/status`, 
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchRequests();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this request?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${config.API_URL}/moveouts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRequests();
    } catch (err) {
      alert('Failed to delete request');
    }
  };

  const handleReply = async (id) => {
    const text = replyText[id];
    if (!text || !text.trim()) return;

    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${config.API_URL}/moveouts/${id}/reply`, 
        { adminReply: text },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReplyText({ ...replyText, [id]: '' });
      fetchRequests();
    } catch (err) {
      alert('Failed to send reply');
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
          <h1>Move-Out Management</h1>
          <button className="btn-primary" onClick={fetchRequests}>Refresh</button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {loading ? (
          <div className="loading">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="empty-state">No move-out requests found.</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Room</th>
                  <th>Move-Out Date</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req._id}>
                    <td>
                      <div>
                        <strong>{req.user?.name || 'Unknown'}</strong>
                        <div className="text-sm text-muted">{req.user?.email}</div>
                        <div className="text-sm text-muted">{req.user?.phone}</div>
                      </div>
                    </td>
                    <td>{req.roomNumber || 'N/A'}</td>
                    <td>{new Date(req.moveOutDate).toLocaleDateString()}</td>
                    <td>{req.reason || '-'}</td>
                    <td>{getStatusBadge(req.status)}</td>
                    <td>
                      <div className="action-buttons">
                        {req.status === 'pending' || req.status === 'submitted' ? (
                          <>
                            <button 
                              className="btn-success btn-sm"
                              onClick={() => handleStatusUpdate(req._id, 'approved')}
                            >
                              Approve
                            </button>
                            <button 
                              className="btn-danger btn-sm"
                              onClick={() => handleStatusUpdate(req._id, 'rejected')}
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-muted text-sm">Processed</span>
                        )}
                        <button 
                          className="btn-danger btn-sm"
                          onClick={() => handleDelete(req._id)}
                        >
                          Delete
                        </button>
                      </div>
                      
                      <div className="reply-section">
                        {req.adminReply ? (
                          <div className="admin-reply text-sm">
                            <strong>Reply:</strong> {req.adminReply}
                          </div>
                        ) : (
                          <div className="reply-input-group">
                            <input 
                              type="text" 
                              className="form-input text-sm"
                              placeholder="Add reply..."
                              value={replyText[req._id] || ''}
                              onChange={(e) => setReplyText({ ...replyText, [req._id]: e.target.value })}
                            />
                            <button 
                              className="btn-secondary btn-sm"
                              onClick={() => handleReply(req._id)}
                            >
                              Send
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMoveOutRequests;
