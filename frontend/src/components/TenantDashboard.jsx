import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import './Dashboard.css';

const TenantDashboard = ({ onLogout }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [messMenu, setMessMenu] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [paymentReminders, setPaymentReminders] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [newComplaint, setNewComplaint] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium'
  });

  const navigate = useNavigate();

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    fetchUserProfile();
    fetchMessMenu();
    fetchComplaints();
    fetchPaymentReminders();
    fetchRooms();
  }, []);

  const getToken = () => localStorage.getItem('token');

  const fetchUserProfile = async () => {
    try {
      const res = await axios.get(`${config.API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setUser(res.data);
    } catch {
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const fetchMessMenu = async () => {
    try {
      const res = await axios.get(`${config.API_URL}/mess/menu`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setMessMenu(res.data.menu || []);
    } catch {}
  };

  const fetchComplaints = async () => {
    try {
      const res = await axios.get(`${config.API_URL}/complaints`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setComplaints(res.data.complaints || []);
    } catch {}
  };

  const fetchPaymentReminders = async () => {
    try {
      const res = await axios.get(`${config.API_URL}/payments/reminders`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setPaymentReminders(res.data.reminders || []);
    } catch {}
  };

  const fetchRooms = async () => {
    try {
      const res = await axios.get(`${config.API_URL}/rooms`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setRooms(res.data.rooms || []);
    } catch {}
  };

  /* ================= ACTIONS ================= */
  const handleLogout = () => {
    localStorage.removeItem('token');
    onLogout();
    navigate('/login');
  };

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${config.API_URL}/complaints`,
        newComplaint,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setNewComplaint({
        title: '',
        description: '',
        category: '',
        priority: 'medium'
      });
      fetchComplaints();
      alert('Complaint submitted');
    } catch {
      alert('Error submitting complaint');
    }
  };

  /* ================= HELPERS ================= */
  const getStatusColor = (status) =>
    status === 'resolved' ? 'green' : status === 'in-progress' ? 'blue' : 'orange';

  const getPriorityColor = (p) =>
    p === 'high' || p === 'urgent' ? 'red' : p === 'medium' ? 'orange' : 'green';

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="loading-screen">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  /* ================= RENDER ================= */
  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <h2 className="logo">PG Manager</h2>

        <nav>
          {['overview', 'mess', 'rooms', 'complaints', 'payments', 'profile'].map(tab => (
            <button
              key={tab}
              className={activeTab === tab ? 'active' : ''}
              onClick={() => setActiveTab(tab)}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="main-content">
        {activeTab === 'overview' && (
          <section>
            <h1>Welcome, {user?.name}</h1>
            <p>Room: {user?.roomNumber || 'Not assigned'}</p>
          </section>
        )}

        {activeTab === 'mess' && (
          <section>
            <h1>Mess Menu</h1>
            {messMenu.length === 0 ? (
              <p>No menu available</p>
            ) : (
              messMenu.map((m, i) => (
                <div key={i}>
                  <strong>{m.day}</strong>
                  <p>{m.breakfast} | {m.lunch} | {m.dinner}</p>
                </div>
              ))
            )}
          </section>
        )}

        {activeTab === 'rooms' && (
          <section>
            <h1>Rooms</h1>
            {rooms.map(room => (
              <div key={room._id}>
                Room {room.roomNumber} - {room.occupied ? 'Occupied' : 'Available'}
              </div>
            ))}
          </section>
        )}

        {activeTab === 'complaints' && (
          <section>
            <h1>Complaints</h1>

            <form onSubmit={handleSubmitComplaint}>
              <input
                placeholder="Title"
                value={newComplaint.title}
                onChange={e => setNewComplaint({ ...newComplaint, title: e.target.value })}
                required
              />
              <textarea
                placeholder="Description"
                value={newComplaint.description}
                onChange={e => setNewComplaint({ ...newComplaint, description: e.target.value })}
                required
              />
              <button type="submit">Submit</button>
            </form>

            {complaints.map(c => (
              <div key={c._id}>
                <h3>{c.title}</h3>
                <span className={getStatusColor(c.status)}>{c.status}</span>
                <span className={getPriorityColor(c.priority)}>{c.priority}</span>
              </div>
            ))}
          </section>
        )}

        {activeTab === 'payments' && (
          <section>
            <h1>Payments</h1>
            {paymentReminders.map(p => (
              <div key={p._id}>
                ₹{p.amount} – {p.status}
              </div>
            ))}
          </section>
        )}

        {activeTab === 'profile' && (
          <section>
            <h1>Profile</h1>
            <p>Name: {user?.name}</p>
            <p>Email: {user?.email}</p>
            <p>Phone: {user?.phone || 'N/A'}</p>
          </section>
        )}
      </main>
    </div>
  );
};

export default TenantDashboard;
