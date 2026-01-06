import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Payments.css';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/payments', {
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
            <h2>All Payments ({payments.length})</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Tenant</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Amount</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px' }}>{payment.tenant.name}</td>
                    <td style={{ padding: '12px' }}>₹{payment.amount}</td>
                    <td style={{ padding: '12px' }}>
                      <span className={`status ${payment.status}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#9ca3af', fontSize: '14px' }}>
                      {new Date(payment.date).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
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
