import { useEffect, useState } from 'react';
import axios from 'axios';
import config from '../config';
import './Dashboard.css';

const STATUS_MAP = {
  pending: { label: 'Open', key: 'open' },
  'in-progress': { label: 'In-Progress', key: 'inprogress' },
  resolved: { label: 'Resolved', key: 'closed' },
  closed: { label: 'Closed', key: 'closed' },
  rejected: { label: 'Rejected', key: 'closed' }
};

const ComplaintAdmin = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [activeComplaint, setActiveComplaint] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [status, setStatus] = useState('pending');

  const token = localStorage.getItem('token');

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${config.API_URL}/complaints/admin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComplaints(res.data.complaints || []);
    } catch (err) {
      console.error('Error fetching complaints:', err);
      setError(err.response?.data?.message || 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const openModal = (complaint) => {
    setActiveComplaint(complaint);
    const mappedStatus = complaint.status || 'pending';
    setStatus(mappedStatus);
    setResponseText(complaint.resolution?.description || '');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setActiveComplaint(null);
    setResponseText('');
    setStatus('pending');
  };

  const handleUpdate = async () => {
    if (!activeComplaint) return;
    try {
      setError('');
      await axios.patch(
        `${config.API_URL}/complaints/${activeComplaint._id}`,
        { status, response: responseText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      closeModal();
      fetchComplaints();
    } catch (err) {
      console.error('Error updating complaint:', err);
      setError(err.response?.data?.message || 'Failed to update complaint');
    }
  };

  const handleDelete = async (complaintId) => {
    const confirmed = window.confirm('Are you sure you want to delete this complaint?');
    if (!confirmed) return;
    try {
      setError('');
      await axios.delete(`${config.API_URL}/complaints/${complaintId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComplaints(prev => prev.filter(c => c._id !== complaintId));
    } catch (err) {
      console.error('Error deleting complaint:', err);
      setError(err.response?.data?.message || 'Failed to delete complaint');
    }
  };

  const getStatusBadgeClass = (rawStatus) => {
    const s = STATUS_MAP[rawStatus] || STATUS_MAP.pending;
    if (s.key === 'open') return 'badge badge-status badge-open';
    if (s.key === 'inprogress') return 'badge badge-status badge-inprogress';
    return 'badge badge-status badge-closed';
  };

  const getStatusLabel = (rawStatus) => {
    const s = STATUS_MAP[rawStatus] || STATUS_MAP.pending;
    return s.label;
  };

  return (
    <div className="content-area">
      <div className="page-header">
        <div>
          <h1>Complaint Management</h1>
          <p>View, respond, update status, and manage student complaints</p>
        </div>
        <button className="btn-primary" onClick={fetchComplaints} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="auth-info" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-screen" style={{ height: 240 }}>
          <div className="spinner" />
          <p>Loading complaints...</p>
        </div>
      ) : complaints.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="placeholder-text">No complaints found.</p>
        </div>
      ) : (
        <div className="complaints-admin-grid">
          {complaints.map((c) => (
            <div key={c._id} className="complaint-card">
              <div className="complaint-card-header">
                <div>
                  <h3>{c.title}</h3>
                  <p className="complaint-meta">
                    {c.studentName || c.submittedBy?.name || 'Unknown student'} • Room{' '}
                    {c.roomNumber || '—'}
                  </p>
                  <p className="complaint-meta">
                    {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}
                  </p>
                </div>
                <span className={getStatusBadgeClass(c.status)}>
                  {getStatusLabel(c.status)}
                </span>
              </div>

              <p className="complaint-description">{c.description}</p>

              {c.resolution?.description && (
                <div className="complaint-response">
                  <strong>Admin Response:</strong>
                  <p>{c.resolution.description}</p>
                </div>
              )}

              <div className="complaint-actions">
                <button className="btn-secondary" onClick={() => openModal(c)}>
                  Respond / Update
                </button>
                <button className="text-btn remove" onClick={() => handleDelete(c._id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="card-header">
              <h2>Respond to Complaint</h2>
              <button className="text-btn" onClick={closeModal}>
                Close
              </button>
            </div>
            <div className="form-row" style={{ marginBottom: 12 }}>
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="pending">Open</option>
                <option value="in-progress">In-Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="form-row">
              <label>Admin Response</label>
              <textarea
                rows={4}
                placeholder="Write your response..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
              <button className="text-btn" onClick={closeModal}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleUpdate}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintAdmin;

