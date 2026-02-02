import { useEffect, useState } from 'react';
import axios from 'axios';
import config from '../config';
import './AdminDashboard.css';

const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const AdminMessMenu = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    date: '',
    breakfast: '',
    lunch: '',
    dinner: '',
    isBreakfastVeg: true,
    isLunchVeg: true,
    isDinnerVeg: true,
    isActive: true
  });
  const token = localStorage.getItem('token');

  const fetchWeek = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${config.API_URL}/mess/menu`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(res.data.menu || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWeek(); }, []);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await axios.post(`${config.API_URL}/mess/menu`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setForm({
        date: '',
        breakfast: '',
        lunch: '',
        dinner: '',
        isBreakfastVeg: true,
        isLunchVeg: true,
        isDinnerVeg: true,
        isActive: true
      });
      fetchWeek();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save menu');
    }
  };

  const toggleStatus = async (id, current) => {
    try {
      await axios.patch(`${config.API_URL}/mess/menu/${id}/status`, { isActive: !current }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchWeek();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const removeItem = async (id) => {
    if (!window.confirm('Delete this menu day?')) return;
    try {
      await axios.delete(`${config.API_URL}/mess/menu/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchWeek();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'short', day:'numeric' });

  const getFilteredItems = () => {
    return items;
  };

  return (
    <div className="content-area">
      <div className="page-header">
        <div>
          <h1>Mess Menu Management</h1>
          <p>Create, update, activate/deactivate, and manage weekly menu</p>
        </div>
        <button className="btn-primary" onClick={fetchWeek} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && <div className="auth-info" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card">
        <div className="card-header"><h2>Create / Update Day</h2></div>
        <form onSubmit={handleSave} className="admin-mess-form">
          <div className="form-group">
            <label className="form-label">📅 Date</label>
            <input className="form-input" type="date" name="date" value={form.date} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">🍳 Breakfast</label>
            <input className="form-input" type="text" name="breakfast" value={form.breakfast} onChange={handleChange} required placeholder="e.g. Idli Sambar" />
            <label className="checkbox-label">
              <input className="form-checkbox" type="checkbox" name="isBreakfastVeg" checked={form.isBreakfastVeg} onChange={handleChange} />
              <span className="checkmark"></span> Veg
            </label>
          </div>
          <div className="form-group">
            <label className="form-label">🍽️ Lunch</label>
            <input className="form-input" type="text" name="lunch" value={form.lunch} onChange={handleChange} required placeholder="e.g. Rice, Dal, Curry" />
            <label className="checkbox-label">
              <input className="form-checkbox" type="checkbox" name="isLunchVeg" checked={form.isLunchVeg} onChange={handleChange} />
              <span className="checkmark"></span> Veg
            </label>
          </div>
          <div className="form-group">
            <label className="form-label">🌙 Dinner</label>
            <input className="form-input" type="text" name="dinner" value={form.dinner} onChange={handleChange} required placeholder="e.g. Chapati, Sabzi" />
            <label className="checkbox-label">
              <input className="form-checkbox" type="checkbox" name="isDinnerVeg" checked={form.isDinnerVeg} onChange={handleChange} />
              <span className="checkmark"></span> Veg
            </label>
          </div>
          <div className="form-group">
            <label className="form-label">🔆 Status</label>
            <select className="form-select" name="isActive" value={form.isActive ? 'true' : 'false'} onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.value === 'true' }))}>
              <option value="true">✅ Active</option>
              <option value="false">⏸️ Inactive</option>
            </select>
          </div>
          <div className="form-actions">
            <button className="btn-primary btn-save" type="submit">
              <span className="btn-icon">💾</span>
              Save Day
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header"><h2>Current Week</h2></div>
        {getFilteredItems().length === 0 ? (
          <p className="placeholder-text">{searchQuery ? 'No matching menu items found' : 'No menu available'}</p>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:12 }}>
            {getFilteredItems().map(it => (
              <div key={it._id} className="admin-mess-card">
                <div className="admin-mess-card-header">
                  <div>
                    <h3>{formatDate(it.date)}</h3>
                    <p className="admin-mess-meta">{weekdays[new Date(it.date).getDay()]}</p>
                  </div>
                  <span className={`admin-status-badge ${it.isActive ? 'active' : 'inactive'}`}>
                    {it.isActive ? '✅ Active' : '⏸️ Inactive'}
                  </span>
                </div>
                <div className="admin-meal-list">
                  <div className="admin-meal-item">
                    <div className="admin-meal-icon breakfast-icon">🍳</div>
                    <div className="admin-meal-content">
                      <div className="admin-meal-name">Breakfast</div>
                      <div className="admin-meal-dish">{it.breakfast}</div>
                    </div>
                    <span className={`admin-veg-badge ${it.isBreakfastVeg ? 'veg' : 'non-veg'}`}>
                      {it.isBreakfastVeg ? '🥬 Veg' : '🍗 Non-Veg'}
                    </span>
                  </div>
                  <div className="admin-meal-item">
                    <div className="admin-meal-icon lunch-icon">🍽️</div>
                    <div className="admin-meal-content">
                      <div className="admin-meal-name">Lunch</div>
                      <div className="admin-meal-dish">{it.lunch}</div>
                    </div>
                    <span className={`admin-veg-badge ${it.isLunchVeg ? 'veg' : 'non-veg'}`}>
                      {it.isLunchVeg ? '🥬 Veg' : '🍗 Non-Veg'}
                    </span>
                  </div>
                  <div className="admin-meal-item">
                    <div className="admin-meal-icon dinner-icon">🌙</div>
                    <div className="admin-meal-content">
                      <div className="admin-meal-name">Dinner</div>
                      <div className="admin-meal-dish">{it.dinner}</div>
                    </div>
                    <span className={`admin-veg-badge ${it.isDinnerVeg ? 'veg' : 'non-veg'}`}>
                      {it.isDinnerVeg ? '🥬 Veg' : '🍗 Non-Veg'}
                    </span>
                  </div>
                </div>
                <div className="admin-mess-actions">
                  <button className={`btn-secondary ${it.isActive ? 'btn-deactivate' : 'btn-activate'}`} onClick={() => toggleStatus(it._id, it.isActive)}>
                    {it.isActive ? '⏸️ Deactivate' : '✅ Activate'}
                  </button>
                  <button className="btn-danger" onClick={() => removeItem(it._id)}>
                    <span className="btn-icon">🗑️</span> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMessMenu;
