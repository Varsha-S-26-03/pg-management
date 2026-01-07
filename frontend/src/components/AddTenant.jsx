import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import './Auth.css';

const AddTenant = ({ onCreated }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    roomNumber: '',
    idType: '',
    idNumber: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${config.API_URL}/tenants`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('AddTenant response:', response.status, response.data);

      // navigate first so tenants component is mounted, then dispatch refresh
      navigate('/dashboard');
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tenants:refresh'));
        }
      }, 250);

      if (onCreated) onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Add Tenant</h2>
          <p className="subtitle">Add a tenant to your PG</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input name="name" value={form.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input name="email" value={form.email} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Room Number</label>
            <input name="roomNumber" value={form.roomNumber} onChange={handleChange} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>ID Type</label>
              <select name="idType" value={form.idType} onChange={handleChange}>
                <option value="">None</option>
                <option value="aadhaar">Aadhaar</option>
                <option value="pan">PAN</option>
              </select>
            </div>
            <div className="form-group">
              <label>ID Number</label>
              <input name="idNumber" value={form.idNumber} onChange={handleChange} />
            </div>
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'Add Tenant'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddTenant;
