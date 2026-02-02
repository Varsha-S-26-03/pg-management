import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import './Payments.css';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');

  useEffect(() => {
    fetchPayments();
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

  const getFilteredPayments = () => {
    return payments;
  };

  return (
    <div className="content-area">
      <div className="page-header">
        <h1>Payment Tracking</h1>
        <button className="btn-primary">Record Payment</button>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <div className="spinner"></div>
          <p>Loading payments...</p>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h2>All Payments ({getFilteredPayments().length})</h2>
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
