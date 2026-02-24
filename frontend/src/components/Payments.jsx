import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import './Payments.css';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  // removed legacy tenants state; use users instead
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    tenantId: '',
    amount: '',
    billingPeriod: '',
    paymentType: 'rent',
    referenceId: ''
  });

  useEffect(() => {
    fetchPayments();
    fetchUsers();
    fetchRooms();
  }, []);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.API_URL}/payments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setPayments(response.data.payments);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${config.API_URL}/auth/all-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data?.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${config.API_URL}/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(res.data?.rooms || []);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      setUpdatingId(id);
      const token = localStorage.getItem('token');
      await axios.patch(
        `${config.API_URL}/payments/${id}`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      fetchPayments();
    } catch (error) {
      console.error('Error updating payment:', error);
      alert(error.response?.data?.message || 'Error updating payment');
    } finally {
      setUpdatingId('');
    }
  };

  const handleReply = async (id, currentReply) => {
    const reply = window.prompt('Enter reply for this payment:', currentReply || '');
    if (reply === null) return;
    try {
      setUpdatingId(id);
      const token = localStorage.getItem('token');
      await axios.patch(
        `${config.API_URL}/payments/${id}`,
        { adminReply: reply },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      fetchPayments();
    } catch (error) {
      console.error('Error saving reply:', error);
      alert(error.response?.data?.message || 'Error saving reply');
    } finally {
      setUpdatingId('');
    }
  };

  const isPaidThisMonth = (p) => {
    if (!p?.date) return false;
    const d = new Date(p.date);
    const now = new Date();
    const sameMonth = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    const ok = p.status === 'paid' || p.status === 'verified' || p.status === 'completed';
    return sameMonth && ok;
  };

  const bySearch = (name, email) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (name || '').toLowerCase().includes(q) || (email || '').toLowerCase().includes(q);
    };

  const getFilteredPayments = () => {
    let list = payments.slice();
    if (search.trim()) {
      list = list.filter(p => bySearch(p.tenant?.name, p.tenant?.email));
    }
    if (filter === 'paid') {
      list = list.filter(isPaidThisMonth);
    }
    return list;
  };

  const getUnpaidTenantsThisMonth = () => {
    const paidEmails = new Set(
      payments
        .filter(isPaidThisMonth)
        .map(p => (p.tenant?.email || '').toLowerCase())
        .filter(e => !!e)
    );
    const activeTenantUsers = users
      .filter(u => u.role === 'tenant' && u.approved !== false && (u.status || 'active') !== 'moved-out');
    return activeTenantUsers
      .filter(u => {
        const email = (u.email || '').toLowerCase();
        if (!email) return true;
        return !paidEmails.has(email);
      })
      .filter(u => bySearch(u.name, u.email));
  };

  return (
    <div className="content-area">
      <div className="page-header">
        <h1>Payment Tracking</h1>
        <button className="btn-primary">Record Payment</button>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ maxWidth: 280 }}
          />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="form-input" style={{ maxWidth: 220 }}>
            <option value="all">All payments</option>
            <option value="paid">Paid this month</option>
            <option value="unpaid">Unpaid this month</option>
          </select>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>Record Cash Payment</button>
        </div>
      </div>
      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2>Record Cash Payment</h2>
          <div className="profile-fields">
            <div className="field-group">
              <label>Tenant</label>
              <select
                className="form-input"
                value={form.tenantId}
                onChange={(e) => {
                  const val = e.target.value;
                  // auto-fill amount from room price if available
                  const selectedUser = users.find(u => String(u._id) === String(val));
                  let autoAmount = form.amount;
                  if (selectedUser && selectedUser.roomNumber) {
                    const room = rooms.find(r => String(r.roomNumber) === String(selectedUser.roomNumber));
                    if (room && typeof room.price === 'number') {
                      autoAmount = String(room.price);
                    }
                  }
                  setForm({ ...form, tenantId: val, amount: autoAmount });
                }}
              >
                <option value="">Select tenant</option>
                {users
                  .filter(u => u.role === 'tenant' && u.approved !== false)
                  .map(u => (
                    <option key={u._id} value={u._id}>
                      {u.name} {u.email ? `(${u.email})` : ''} {u.roomNumber ? `- Room ${u.roomNumber}` : ''}
                    </option>
                  ))}
              </select>
              {(() => {
                const u = users.find(x => String(x._id) === String(form.tenantId));
                if (!u) return null;
                const room = u?.roomNumber ? rooms.find(r => String(r.roomNumber) === String(u.roomNumber)) : null;
                const price = room?.price;
                return (
                  <small style={{ color: '#6b7280' }}>
                    {u.roomNumber ? `Assigned Room: ${u.roomNumber}` : 'No room assigned'}{typeof price === 'number' ? ` • Suggested amount: ₹${price}` : ''}
                  </small>
                );
              })()}
            </div>
            <div className="field-group">
              <label>Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="Enter amount"
              />
            </div>
            <div className="field-group">
              <label>Month / Period</label>
              <input
                type="month"
                className="form-input"
                value={form.billingPeriod}
                onChange={(e) => setForm({ ...form, billingPeriod: e.target.value })}
              />
            </div>
            <div className="field-group">
              <label>Payment Type</label>
              <select
                className="form-input"
                value={form.paymentType}
                onChange={(e) => setForm({ ...form, paymentType: e.target.value })}
              >
                <option value="rent">Rent</option>
                <option value="deposit">Deposit</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="field-group">
              <label>Reference (optional)</label>
              <input
                type="text"
                className="form-input"
                value={form.referenceId}
                onChange={(e) => setForm({ ...form, referenceId: e.target.value })}
                placeholder="Receipt no. or note"
              />
            </div>
          </div>
          <div className="profile-actions" style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-primary"
              disabled={creating}
              onClick={async () => {
                if (!form.tenantId || !form.amount) {
                  alert('Select tenant and amount');
                  return;
                }
                try {
                  setCreating(true);
                  const token = localStorage.getItem('token');
                  await axios.post(
                    `${config.API_URL}/payments/admin`,
                    {
                      tenantId: form.tenantId,
                      amount: Number(form.amount),
                      billingPeriod: form.billingPeriod || '',
                      paymentType: form.paymentType,
                      method: 'cash',
                      referenceId: form.referenceId || '',
                      status: 'completed'
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  setShowAdd(false);
                  setForm({ tenantId: '', amount: '', billingPeriod: '', paymentType: 'rent', referenceId: '' });
                  fetchPayments();
                } catch (err) {
                  console.error('Error recording payment:', err);
                  alert(err.response?.data?.message || 'Failed to record payment');
                } finally {
                  setCreating(false);
                }
              }}
            >
              {creating ? 'Saving...' : 'Save Payment'}
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setShowAdd(false);
                setForm({ tenantId: '', amount: '', billingPeriod: '', paymentType: 'rent', referenceId: '' });
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <div className="spinner"></div>
          <p>Loading payments...</p>
        </div>
      ) : filter === 'unpaid' ? (
        <div className="card">
          <div className="card-header">
            <h2>Unpaid This Month</h2>
          </div>
          {loading || users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <div className="spinner"></div>
              <p>Loading tenants...</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Tenant</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Email</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {getUnpaidTenantsThisMonth().map(u => (
                    <tr key={u._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px' }}>{u.name}</td>
                      <td style={{ padding: '12px' }}>{u.email || '-'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                          Unpaid this month
                        </span>
                      </td>
                    </tr>
                  ))}
                  {getUnpaidTenantsThisMonth().length === 0 && (
                    <tr>
                      <td style={{ padding: '16px', color: '#6b7280' }} colSpan={3}>No matches</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h2>{filter === 'paid' ? 'Paid This Month' : 'All Payments'} ({getFilteredPayments().length})</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Tenant</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Type</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Amount</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Period</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Method</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Reply</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredPayments().map((payment) => (
                  <tr key={payment._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px' }}>{payment.tenant?.name || 'Tenant'}</td>
                    <td style={{ padding: '12px', textTransform: 'capitalize' }}>{payment.paymentType || 'rent'}</td>
                    <td style={{ padding: '12px' }}>₹{payment.amount}</td>
                    <td style={{ padding: '12px' }}>{payment.billingPeriod || '-'}</td>
                    <td style={{ padding: '12px', textTransform: 'capitalize' }}>{payment.method || '-'}</td>
                    <td style={{ padding: '12px' }}>
                      <select
                        value={payment.status === 'paid' ? 'verified' : payment.status}
                        onChange={(e) => handleStatusChange(payment._id, e.target.value)}
                        disabled={updatingId === payment._id}
                      >
                        <option value="pending">Pending</option>
                        <option value="verified">Verified</option>
                        <option value="rejected">Rejected</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px', maxWidth: '200px', fontSize: '12px', color: '#4b5563' }}>
                      {payment.adminReply || '-'}
                    </td>
                    <td style={{ padding: '12px', color: '#9ca3af', fontSize: '14px' }}>
                      {new Date(payment.date).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                      <button
                        className="btn-primary"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => handleReply(payment._id, payment.adminReply)}
                        disabled={updatingId === payment._id}
                      >
                        Reply
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
