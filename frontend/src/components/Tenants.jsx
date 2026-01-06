import { useEffect, useState } from 'react';
import axios from 'axios';
import './Dashboard.css';

const Tenants = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user?.role === 'admin';
  const [pending, setPending] = useState([]);

  // fetcher so we can call it from event listeners
  const fetchTenants = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/tenants', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Fetched tenants:', res.data.length);
      setTenants(res.data);
    } catch (err) {
      console.error('Error fetching tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteTenant = async (id) => {
    if (!window.confirm('Are you sure you want to remove this tenant?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/tenants/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTenants(prev => prev.filter(t => t._id !== id));
    } catch (err) {
      console.error('Error deleting tenant:', err);
      alert(err.response?.data?.message || 'Failed to remove tenant');
    }
  };

  const approveSignup = async (id) => {
    if (!window.confirm('Approve this signup and add to tenants?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/users/${id}/approve`, null, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // remove from pending and refresh tenants
      setPending(prev => prev.filter(p => p._id !== id));
      const tokenNow = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/tenants', { headers: { Authorization: `Bearer ${tokenNow}` } });
      setTenants(res.data);
    } catch (err) {
      console.error('Error approving user:', err);
      alert(err.response?.data?.message || 'Failed to approve');
    }
  };

  const rejectSignup = async (id) => {
    if (!window.confirm('Reject and delete this signup?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setPending(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      console.error('Error rejecting signup:', err);
      alert(err.response?.data?.message || 'Failed to reject');
    }
  };

  useEffect(() => {
    const doFetch = async () => {
      try {
        await fetchTenants();

        // If admin, also fetch pending signups
        if (isAdmin) {
          try {
            const token = localStorage.getItem('token');
            const pendingRes = await axios.get('http://localhost:5000/api/users/pending', {
              headers: { Authorization: `Bearer ${token}` }
            });
            setPending(pendingRes.data);
          } catch (perr) {
            console.error('Error fetching pending signups:', perr);
          }
        }
      } catch (err) {
        console.error('Error fetching tenants:', err);
      } finally {
        setLoading(false);
      }
    };

    // initial load
    doFetch();

    // refresh listener
    const handler = () => fetchTenants();
    window.addEventListener('tenants:refresh', handler);
    return () => window.removeEventListener('tenants:refresh', handler);
  }, []);

  return (
    <div className="content-area">
  

      {loading ? (
        <p>Loading tenants...</p>
      ) : (
        <div>
          {isAdmin && (
            <div className="card">
              <h2>Pending Tenant Signups</h2>
              {pending.length === 0 ? (
                <p>No pending signups.</p>
              ) : (
                pending.map(p => (
                  <div key={p._id} className="tenant-card">
                    <div className="tenant-header">
                      <h3>{p.name}</h3>
                      <div>
                        <span className="tenant-room">Requested</span>
                        <button className="text-btn remove" onClick={() => approveSignup(p._id)}>Approve</button>
                        <button className="text-btn remove" onClick={() => rejectSignup(p._id)}>Reject</button>
                      </div>
                    </div>
                    <p>{p.email}</p>
                    <p>{p.address || ''}</p>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="tenant-list" style={{ marginTop: isAdmin ? 16 : 0 }}>
            {tenants.length === 0 ? (
              <p>No tenants found.</p>
            ) : (
              tenants.map(t => (
                <div key={t._id} className="tenant-card">
                  <div className="tenant-header">
                    <h3>{t.name}</h3>
                    <div>
                      <span className="tenant-room">Room: {t.roomNumber || '—'}</span>
                      {isAdmin && (
                        <button className="text-btn remove" onClick={() => deleteTenant(t._id)}>Remove</button>
                      )}
                    </div>
                  </div>
                  <p>{t.email || ''}</p>
                  <p>{t.phone || ''}</p>
                  <p>{t.idType ? `${t.idType.toUpperCase()} • ${t.idNumber ? '••••' + t.idNumber.slice(-4) : ''}` : ''}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Tenants;
