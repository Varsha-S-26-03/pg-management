import React, { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import './AdminDashboard.css';
import Stats from './Stats';
import Rooms from './Rooms';
import SharedRooms from './SharedRooms';
import AdminMessMenu from './AdminMessMenu';
import Payments from './Payments';
import ComplaintAdmin from './Complaint';
import AdminMoveOutRequests from './AdminMoveOutRequests';
import AdminFeedback from './AdminFeedback';
import AdminNotice from './AdminNotice';
import { showToast } from './toastApi';
import { connectSocket, onFeedbackNotification, offFeedbackNotification, onNoticeNotification, onNoticeUpdate, onNoticeDelete, offNoticeNotifications } from '../socket';

const AdminDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [pendingTenants, setPendingTenants] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApprovals: 0,
    totalRooms: 0,
    availableRooms: 0,
    vacantBeds: 0,
    occupiedBeds: 0,
    totalRevenue: 0,
    balance:0,
    pendingPayments:0
  });
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [todaysMenu, setTodaysMenu] = useState(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState('');

  const getFilteredUsers = () => {
    return allUsers;
  };

  const getFilteredPendingTenants = () => {
    return pendingTenants;
  };

  useEffect(() => {
    if (activeTab === 'approvals') {
      fetchPendingTenants();
    } else if (activeTab === 'users') {
      fetchAllUsers();
      fetchRooms();
      fetchAllPayments();
    }
    if (activeTab === 'overview') {
      fetchStats();
      fetchNotifications();
      fetchTodaysMenu();
    }
    if (activeTab === 'notifications') {
      fetchNotifications();
    }
  }, [activeTab]);

  // Auto-refresh notifications every 30 seconds when on overview or notifications tab
  useEffect(() => {
    let interval;
    if (activeTab === 'overview' || activeTab === 'notifications') {
      interval = setInterval(() => {
        fetchNotifications();
      }, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab]);

  // Auto-refresh stats every 60 seconds when on overview tab
  useEffect(() => {
    let interval;
    if (activeTab === 'overview') {
      interval = setInterval(() => {
        fetchStats();
      }, 60000); // Refresh every 60 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab]);

  // Socket.io connection for real-time notifications
  useEffect(() => {
    if (user?.role === 'admin') {
      connectSocket(user._id);
      
      // Listen for new feedback notifications
      onFeedbackNotification((data) => {
        showToast(`New feedback from ${data.tenantName}: ${data.category} - ${data.rating}★`, 'info');
        // Refresh notifications and stats if on overview tab
        if (activeTab === 'overview' || activeTab === 'notifications') {
          fetchNotifications();
          fetchStats();
        }
      });

      // Listen for new notice notifications
      onNoticeNotification((data) => {
        showToast(`New notice published: ${data.title}`, 'info');
        if (activeTab === 'overview' || activeTab === 'notifications') {
          fetchNotifications();
        }
      });

      // Listen for notice updates
      onNoticeUpdate((data) => {
        showToast(`Notice updated: ${data.title}`, 'info');
        if (activeTab === 'overview' || activeTab === 'notifications') {
          fetchNotifications();
        }
      });

      // Listen for notice deletions
      onNoticeDelete((data) => {
        showToast(`Notice deleted: ${data.title}`, 'info');
        if (activeTab === 'overview' || activeTab === 'notifications') {
          fetchNotifications();
        }
      });
    }
    
    return () => {
      offFeedbackNotification();
      offNoticeNotifications();
    };
  }, [user, activeTab]);

  const fetchPendingTenants = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.API_URL}/auth/pending-tenants`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setPendingTenants(response.data.tenants);
    } catch (error) {
      console.error('Error fetching pending tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.API_URL}/auth/all-users`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setAllUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching all users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.API_URL}/stats/admin`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      // Map backend data to match frontend component expectations
      const backendData = response.data;
      setStats({
        totalUsers: backendData.totalTenants || 0,
        pendingApprovals: backendData.pendingApprovals || 0,
        totalRooms: backendData.totalBeds || 0,
        availableRooms: backendData.availableRooms || 0,
        vacantBeds: backendData.vacantBeds || 0,
        occupiedBeds: backendData.occupiedBeds || 0,
        totalComplaints: backendData.totalComplaints || 0,
        inProgressComplaints: backendData.inProgressComplaints || 0,
        resolvedComplaints: backendData.resolvedComplaints || 0,
        moveOutRequests: backendData.moveOutRequests || 0,
        totalRevenue: backendData.totalRevenue || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true);
      setNotificationsError('');
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      let list = [];

      try {
        const res = await axios.get(`${config.API_URL}/auth/pending-tenants`, { headers });
        const tenants = res.data.tenants || [];
        tenants.forEach(t => {
          list.push({
            id: `tenant-${t._id}`,
            type: 'approval',
            message: `Tenant approval pending: ${t.name}`,
            timestamp: new Date(t.createdAt || Date.now())
          });
        });
      } catch (err) {
        console.error('Error fetching pending tenants for notifications:', err);
      }

      try {
        const res = await axios.get(`${config.API_URL}/room-requests`, { params: { status: 'Pending' }, headers });
        const requests = res.data.requests || [];
        requests.forEach(r => {
          const tenantName = r.tenantId?.name || r.tenantName || 'Tenant';
          const roomNumber = r.roomId?.roomNumber || 'Room';
          list.push({
            id: `roomreq-${r._id}`,
            type: 'approval',
            message: `Room request pending: ${tenantName} → ${roomNumber}`,
            timestamp: new Date(r.requestedAt || Date.now())
          });
        });
      } catch (err) {
        console.error('Error fetching room requests for notifications:', err);
      }

      try {
        const res = await axios.get(`${config.API_URL}/moveouts`, { headers });
        const moveOutRequests = res.data.notices || [];
        moveOutRequests.slice(0, 10).forEach(req => {
          const tenantName = req.user?.name || 'Tenant';
          const roomNumber = req.roomNumber || 'N/A';
          list.push({
            id: `moveout-${req._id}`,
            type: 'approval',
            message: `Move-out request pending: ${tenantName} (Room ${roomNumber})`,
            timestamp: new Date(req.createdAt || Date.now())
          });
        });
      } catch (err) {
        console.error('Error fetching move-out requests for notifications:', err);
      }

      try {
        const res = await axios.get(`${config.API_URL}/complaints/admin`, { headers });
        const complaints = res.data.complaints || [];
        complaints.slice(0, 10).forEach(c => {
          list.push({
            id: `complaint-${c._id}`,
            type: 'alert',
            message: `Complaint (${c.category || 'general'}): ${c.title}`,
            timestamp: new Date(c.createdAt || Date.now())
          });
        });
      } catch (err) {
        console.error('Error fetching complaints for notifications:', err);
      }

      try {
        const res = await axios.get(`${config.API_URL}/payments`, { headers });
        const payments = res.data.payments || [];
        payments.slice(0, 10).forEach(p => {
          const tenantName = p.tenant?.name || 'Tenant';
          const isVerified = p.status === 'paid' || p.status === 'verified';
          const isRejected = p.status === 'rejected';
          const statusLabel = isVerified ? 'Payment verified' : isRejected ? 'Payment rejected' : 'Payment pending';
          list.push({
            id: `payment-${p._id}`,
            type: isVerified ? 'system' : 'alert',
            message: `${statusLabel}: ₹${p.amount} from ${tenantName}`,
            timestamp: new Date(p.updatedAt || p.date || Date.now())
          });
        });
      } catch (err) {
        console.error('Error fetching payments for notifications:', err);
      }

      try {
        const res = await axios.get(`${config.API_URL}/mess/menu`, { headers });
        const menu = res.data.menu || [];
        menu.forEach(m => {
          const date = new Date(m.date);
          const day = m.day || date.toLocaleDateString('en-IN', { weekday: 'long' });
          list.push({
            id: `mess-${m._id}`,
            type: 'system',
            message: `Mess menu updated for ${day}`,
            timestamp: new Date(m.updatedAt || m.createdAt || m.date || Date.now())
          });
        });
      } catch (err) {
        console.error('Error fetching mess menu for notifications:', err);
      }

      try {
        const res = await axios.get(`${config.API_URL}/feedback/all`, { 
            params: { limit: 10, sort: 'desc' }, 
            headers 
        });
        const feedbacks = res.data.feedback || [];
        feedbacks.slice(0, 10).forEach(f => {
          list.push({
            id: `feedback-${f._id}`,
            type: 'alert',
            message: `Feedback: ${f.category} (${f.rating}★) - ${f.tenantName}`,
            timestamp: new Date(f.createdAt || Date.now())
          });
        });
      } catch (err) {
        console.error('Error fetching feedback for notifications:', err);
      }

      try {
        const res = await axios.get(`${config.API_URL}/notices/all`, { 
            params: { limit: 10 },
            headers 
        });
        const notices = res.data.notices || [];
        notices.slice(0, 10).forEach(n => {
          list.push({
            id: `notice-${n._id}`,
            type: 'system',
            message: `Notice: ${n.title} (${n.priority})`,
            timestamp: new Date(n.createdAt || Date.now())
          });
        });
      } catch (err) {
        console.error('Error fetching notices for notifications:', err);
      }

      list.sort((a, b) => b.timestamp - a.timestamp);
      setNotifications(list);
    } catch (error) {
      console.error('Error building notifications:', error);
      setNotificationsError('Failed to load notifications');
    } finally {
      setNotificationsLoading(false);
    }
  };

  const fetchTodaysMenu = async () => {
    try {
      setMenuLoading(true);
      setMenuError('');
      const token = localStorage.getItem('token');
      
      // Get today's date in local timezone
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const todayDayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][now.getDay()];
      
      console.log('Fetching menu for today:', today, 'Day:', todayDayName);
      
      const response = await axios.get(`${config.API_URL}/mess/menu`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const menu = response.data.menu || [];
      
      console.log('Menu data received:', menu);
      console.log('Total menu items found:', menu.length);
      
      // Try multiple approaches to find today's menu
      let todayMenu = null;
      
      // Approach 1: Direct date comparison with isActive
      todayMenu = menu.find(item => {
        if (!item.date) return false;
        const itemDate = new Date(item.date).toISOString().split('T')[0];
        console.log('Checking item:', itemDate, 'Active:', item.isActive, 'Day:', item.day);
        return itemDate === today && item.isActive;
      });
      
      // Approach 2: If no active menu found, try inactive menu
      if (!todayMenu) {
        console.log('No active menu found for today, trying inactive...');
        todayMenu = menu.find(item => {
          if (!item.date) return false;
          const itemDate = new Date(item.date).toISOString().split('T')[0];
          return itemDate === today;
        });
      }
      
      // Approach 3: Try by day name if date comparison fails
      if (!todayMenu) {
        console.log('No menu found by date, trying by day name...');
        todayMenu = menu.find(item => {
          const itemDay = item.day;
          return itemDay === todayDayName;
        });
      }
      
      // Approach 4: Show any available menu if nothing matches today
      if (!todayMenu && menu.length > 0) {
        console.log('No menu found for today, showing first available menu for debugging');
        todayMenu = menu[0]; // Show first available menu
      }
      
      console.log('Final today\'s menu:', todayMenu);
      setTodaysMenu(todayMenu);
    } catch (error) {
      console.error('Error fetching today\'s menu:', error);
      setMenuError('Failed to load today\'s menu');
    } finally {
      setMenuLoading(false);
    }
  };

  const handleApprove = async (tenantId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${config.API_URL}/auth/approve-tenant/${tenantId}`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      fetchPendingTenants();
      fetchStats();
    } catch (error) {
      console.error('Error approving tenant:', error);
      alert(error.response?.data?.message || 'Error approving tenant');
    }
  };

  const handleReject = async (tenantId) => {
    if (!window.confirm('Are you sure you want to reject and delete this tenant account?')) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${config.API_URL}/auth/reject-tenant/${tenantId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      fetchPendingTenants();
      fetchStats();
    } catch (error) {
      console.error('Error rejecting tenant:', error);
      alert(error.response?.data?.message || 'Error rejecting tenant');
    }
  };

  const handleLogout = () => {
    onLogout();
  };

  const handleRemoveUser = async (userId) => {
    if (!window.confirm('Remove this user?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${config.API_URL}/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      fetchAllUsers();
      fetchStats();
    } catch (error) {
      alert(error.response?.data?.message || 'Error removing user');
    }
  };



  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.API_URL}/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(response.data.rooms || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const fetchAllPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.API_URL}/payments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayments(response.data.payments || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const getRoomType = (roomNumber) => {
    const room = rooms.find(r => r.roomNumber === roomNumber);
    if (!room) return '—';
    const typeMap = {
      'single': 'Single Share',
      'double': '2 Share',
      'triple': '3 Share',
      'dormitory': 'Dormitory'
    };
    return typeMap[room.type] || room.type;
  };

  const getRentStatus = (userId) => {
    // Check if rent is paid for current month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const paid = payments.some(p => {
      if (!p.tenant || (p.tenant._id !== userId && p.tenant !== userId)) return false;
      const pDate = new Date(p.date);
      return pDate.getMonth() === currentMonth && 
             pDate.getFullYear() === currentYear && 
             (p.status === 'paid' || p.status === 'verified');
    });

    return paid ? 'Paid' : 'Not Paid';
  };

  return (
    <div className="dashboard-container">
      <aside className={`sidebar ${sidebarMinimized ? 'minimized' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>PG Manager</span>
          </div>
          <button 
            className="sidebar-toggle" 
            onClick={() => setSidebarMinimized(!sidebarMinimized)}
            title={sidebarMinimized ? 'Expand sidebar' : 'Minimize sidebar'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {sidebarMinimized ? (
                <path d="M9 18l6-6-6-6"></path>
              ) : (
                <path d="M15 18l-6-6 6-6"></path>
              )}
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={activeTab === 'overview' ? 'active' : ''} 
            onClick={() => setActiveTab('overview')}
            title="Overview"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            {!sidebarMinimized && 'Overview'}
          </button>

          <button 
            className={activeTab === 'notifications' ? 'active' : ''} 
            onClick={() => setActiveTab('notifications')}
            title="Notifications"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {!sidebarMinimized && 'Notifications'}
          </button>

          <button 
            className={activeTab === 'approvals' ? 'active' : ''} 
            onClick={() => setActiveTab('approvals')}
            title="Tenant Approvals"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4"></path>
              <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
              <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
              <path d="M12 21c0-1-1-3-3-3s-3 2-3 3 1 3 3 3 3-2 3-3z"></path>
              <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3z"></path>
            </svg>
            {!sidebarMinimized && 'Tenant Approvals'}
            {stats.pendingApprovals > 0 && (
              <span style={{ marginLeft: 'auto', background: '#dc2626', color: 'white', borderRadius: '10px', padding: '2px 8px', fontSize: '12px', fontWeight: '600' }}>
                {stats.pendingApprovals}
              </span>
            )}
          </button>

          <button 
            className={activeTab === 'users' ? 'active' : ''} 
            onClick={() => setActiveTab('users')}
            title="All Users"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            {!sidebarMinimized && 'All Users'}
          </button>

          <button 
            className={activeTab === 'rooms' ? 'active' : ''} 
            onClick={() => setActiveTab('rooms')}
            title="Rooms"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            </svg>
            {!sidebarMinimized && 'Rooms'}
          </button>

          <button 
            className={activeTab === 'messmenu' ? 'active' : ''} 
            onClick={() => setActiveTab('messmenu')}
            title="Mess Menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 3h16v4H4z"></path>
              <path d="M4 11h16v10H4z"></path>
            </svg>
            {!sidebarMinimized && 'Mess Menu'}
          </button>

          <button 
            className={activeTab === 'payments' ? 'active' : ''} 
            onClick={() => setActiveTab('payments')}
            title="Payments"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
              <line x1="1" y1="10" x2="23" y2="10"></line>
            </svg>
            {!sidebarMinimized && 'Payments'}
          </button>

          <button 
            className={activeTab === 'complaints' ? 'active' : ''} 
            onClick={() => setActiveTab('complaints')}
            title="Complaints"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            {!sidebarMinimized && 'Complaints'}
          </button>

          <button 
            className={activeTab === 'feedback' ? 'active' : ''} 
            onClick={() => setActiveTab('feedback')}
            title="Feedback"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>
              <path d="M8 9h8"></path>
              <path d="M8 13h6"></path>
            </svg>
            {!sidebarMinimized && 'Feedback'}
          </button>

          <button 
            className={activeTab === 'notices' ? 'active' : ''} 
            onClick={() => setActiveTab('notices')}
            title="Notices"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
            {!sidebarMinimized && 'Notices'}
          </button>

          <button 
            className={activeTab === 'moveouts' ? 'active' : ''} 
            onClick={() => setActiveTab('moveouts')}
            title="Move-Outs"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 22V6l-2 2"></path>
              <path d="M14 22V6l2 2"></path>
            </svg>
            {!sidebarMinimized && 'Move-Outs'}
          </button>

          <button 
            className={activeTab === 'settings' ? 'active' : ''} 
            onClick={() => setActiveTab('settings')}
            title="Settings"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"></path>
            </svg>
            {!sidebarMinimized && 'Settings'}
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            {!sidebarMinimized && (
              <div className="user-info">
                <p className="user-name">{user?.name}</p>
                <p className="user-role">{user?.role}</p>
              </div>
            )}
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div className="top-bar-actions">
            <button className="icon-btn" aria-label="Settings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
              </svg>
            </button>
          </div>
        </header>

        {activeTab === 'overview' && (
          <div className="content-area">
            <div className="page-header">
              <div>
                <h1>Welcome back, {user?.name}! 👋</h1>
                <p>Here's what's happening with your properties today</p>
              </div>

            </div>

            <Stats stats={stats} onNavigate={setActiveTab} />

            {stats.pendingApprovals > 0 && (
              <div className="card" style={{ marginTop: '24px', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '1px solid #f59e0b' }}>
                <div className="card-header">
                  <h2>⚠️ Action Required</h2>
                </div>
                <p style={{ margin: 0, color: '#92400e' }}>
                  You have <strong>{stats.pendingApprovals}</strong> tenant approval{stats.pendingApprovals !== 1 ? 's' : ''} pending. 
                  <button 
                    onClick={() => setActiveTab('approvals')} 
                    className="text-btn" 
                    style={{ marginLeft: '8px' }}
                  >
                    Review now →
                  </button>
                </p>
              </div>
            )}

            <div className="dashboard-grid" style={{ marginTop: '24px' }}>
              {/* Recent Notifications Card */}
              <div className="card">
                <div className="card-header">
                  <h2>Recent Notifications</h2>
                  <button 
                    onClick={() => setActiveTab('notifications')} 
                    className="text-btn"
                  >
                    View All →
                  </button>
                </div>
                {notificationsLoading ? (
                  <div style={{ textAlign: 'center', padding: '32px' }}>
                    <div className="spinner"></div>
                    <p>Loading notifications...</p>
                  </div>
                ) : notificationsError ? (
                  <div style={{ padding: '16px', color: '#dc2626' }}>
                    {notificationsError}
                  </div>
                ) : notifications.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#6b7280', padding: '24px' }}>
                    No recent notifications
                  </p>
                ) : (
                  <ul className="notifications-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {notifications.slice(0, 5).map(n => (
                      <li key={n.id} className={`notification-item ${n.type}`} style={{ marginBottom: '12px' }}>
                        <div className="notification-content">
                          <div className="message">{n.message}</div>
                          <div className="timestamp" style={{ fontSize: '12px', color: '#6b7280' }}>
                            {n.timestamp.toLocaleString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Today's Menu Card */}
              <div className="card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('messmenu')}>
                <div className="card-header">
                  <h2>🍽️ Today's Menu</h2>
                  <span className="text-btn">View Full Menu →</span>
                </div>
                {menuLoading ? (
                  <div style={{ textAlign: 'center', padding: '32px' }}>
                    <div className="spinner"></div>
                    <p>Loading today's menu...</p>
                  </div>
                ) : menuError ? (
                  <div style={{ padding: '16px', color: '#dc2626' }}>
                    {menuError}
                  </div>
                ) : todaysMenu ? (
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'grid', gap: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                        <div>
                          <div style={{ fontWeight: '600', color: '#f59e0b', fontSize: '14px', background: '#fef3c7', padding: '6px 12px', borderRadius: '20px', display: 'inline-block' }}>🍳 Breakfast</div>
                          <div style={{ color: '#1f2937', fontWeight: '700', marginTop: '8px', fontSize: '16px' }}>{todaysMenu.breakfast}</div>
                        </div>
                        <span style={{ fontSize: '11px', background: todaysMenu.isBreakfastVeg ? '#2e7d32' : '#c62828', color: 'white', padding: '6px 10px', borderRadius: '20px', fontWeight: '700', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                          {todaysMenu.isBreakfastVeg ? '🥬 Veg' : '🍗 Non-Veg'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                        <div>
                          <div style={{ fontWeight: '600', color: '#22c55e', fontSize: '14px', background: '#dcfce7', padding: '6px 12px', borderRadius: '20px', display: 'inline-block' }}>🍽️ Lunch</div>
                          <div style={{ color: '#1f2937', fontWeight: '700', marginTop: '8px', fontSize: '16px' }}>{todaysMenu.lunch}</div>
                        </div>
                        <span style={{ fontSize: '11px', background: todaysMenu.isLunchVeg ? '#2e7d32' : '#c62828', color: 'white', padding: '6px 10px', borderRadius: '20px', fontWeight: '700' }}>
                          {todaysMenu.isLunchVeg ? '🥬 Veg' : '🍗 Non-Veg'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                        <div>
                          <div style={{ fontWeight: '600', color: '#8b5cf6', fontSize: '14px', background: '#ede9fe', padding: '6px 12px', borderRadius: '20px', display: 'inline-block' }}>🌙 Dinner</div>
                          <div style={{ color: '#1f2937', fontWeight: '700', marginTop: '8px', fontSize: '16px' }}>{todaysMenu.dinner}</div>
                        </div>
                        <span style={{ fontSize: '11px', background: todaysMenu.isDinnerVeg ? '#2e7d32' : '#c62828', color: 'white', padding: '6px 10px', borderRadius: '20px', fontWeight: '700' }}>
                          {todaysMenu.isDinnerVeg ? '🥬 Veg' : '🍗 Non-Veg'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍽️</div>
                    <p>No menu available for today</p>
                    <p style={{ fontSize: '14px', marginTop: '8px' }}>Click to add today's menu</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="content-area">
            <div className="page-header">
              <h1>Tenant Approvals</h1>
              <button className="btn-primary" onClick={fetchPendingTenants}>
                Refresh
              </button>
              <button 
                className="btn-primary" 
                onClick={() => navigate('/tenants')}
                style={{ marginLeft: '12px' }}
              >
                Open Tenants
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px' }}>
                <div className="spinner"></div>
                <p>Loading pending tenants...</p>
              </div>
            ) : pendingTenants.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '64px', height: '64px', margin: '0 auto 16px', color: '#10b981' }}>
                  <path d="M9 12l2 2 4-4"></path>
                  <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
                  <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
                </svg>
                <h2>All caught up!</h2>
                <p style={{ color: '#6b7280' }}>No pending tenant approvals at the moment.</p>
              </div>
            ) : getFilteredPendingTenants().length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
                <p style={{ color: '#6b7280' }}>No pending approvals match your search.</p>
              </div>
            ) : (
              <div className="card">
                <div className="card-header">
                  <h2>Pending Approvals ({getFilteredPendingTenants().length})</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {getFilteredPendingTenants().map((tenant) => (
                    <div key={tenant._id} style={{ 
                      padding: '20px', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>{tenant.name}</h3>
                        <p style={{ margin: '0 0 4px 0', color: '#6b7280' }}>{tenant.email}</p>
                        {tenant.phone && (
                          <p style={{ margin: '0 0 4px 0', color: '#6b7280' }}>{tenant.phone}</p>
                        )}
                        {tenant.address && (
                          <p style={{ margin: '0 0 4px 0', color: '#6b7280' }}>{tenant.address}</p>
                        )}
                        {(tenant.idType || tenant.idNumber) && (
                          <p style={{ margin: '0 0 4px 0', color: '#6b7280' }}>
                            {tenant.idType ? tenant.idType.toUpperCase() : 'ID'} • {tenant.idNumber ? ('••••' + String(tenant.idNumber).slice(-4)) : ''}
                          </p>
                        )}
                        <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                          Signed up: {new Date(tenant.createdAt).toLocaleDateString('en-IN', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                          onClick={() => handleApprove(tenant._id)}
                          className="btn-primary"
                          style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleReject(tenant._id)}
                          style={{
                            padding: '12px 24px',
                            background: 'white',
                            color: '#dc2626',
                            border: '1px solid #dc2626',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#fee';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'white';
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="content-area">
            <div className="page-header">
              <h1>Notifications</h1>
              <button className="btn-primary" onClick={fetchNotifications}>
                Refresh
              </button>
            </div>

            <div className="card">
              <div className="card-header">
                <h2>All notices</h2>
              </div>
              {notificationsLoading ? (
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <div className="spinner"></div>
                  <p>Loading notifications...</p>
                </div>
              ) : notificationsError ? (
                <div style={{ padding: '16px', color: '#dc2626' }}>
                  {notificationsError}
                </div>
              ) : notifications.length === 0 ? (
                <ul className="notifications-list">
                  <li className="notification-item empty">
                    No notifications to show
                  </li>
                </ul>
              ) : (
                <ul className="notifications-list">
                  {notifications.map(n => (
                    <li key={n.id} className={`notification-item ${n.type}`}>
                      <div className="notification-icon">
                        {n.type === 'approval' && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 12l2 2 4-4"></path>
                            <circle cx="12" cy="12" r="10"></circle>
                          </svg>
                        )}
                        {n.type === 'alert' && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12" y2="16"></line>
                          </svg>
                        )}
                        {n.type === 'system' && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                          </svg>
                        )}
                      </div>
                      <div className="notification-content">
                        <div className="message">{n.message}</div>
                        <div className="timestamp">
                          {n.timestamp.toLocaleString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="content-area">
            <div className="page-header">
              <h1>All Users</h1>
              <button className="btn-primary" onClick={fetchAllUsers}>
                Refresh
              </button>
            </div>
            


            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px' }}>
                <div className="spinner"></div>
                <p>Loading users...</p>
              </div>
            ) : getFilteredUsers().length === 0 ? (
               <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
                 <p style={{ color: '#6b7280' }}>No users match your search.</p>
               </div>
            ) : (
              <div className="card">
                <div className="card-header">
                  <h2>Users ({getFilteredUsers().length})</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Name</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Email</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Room No</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Role</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Status</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredUsers().map((user) => (
                        <Fragment key={user._id}>
                          <tr 
                            style={{ 
                              borderBottom: expandedUserId === user._id ? 'none' : '1px solid #e5e7eb', 
                              cursor: 'pointer',
                              background: expandedUserId === user._id ? '#f8fafc' : 'transparent',
                              transition: 'background 0.2s'
                            }} 
                            onClick={() => setExpandedUserId(expandedUserId === user._id ? null : user._id)}
                          >
                            <td style={{ padding: '12px' }}>{user.name}</td>
                            <td style={{ padding: '12px', color: '#6b7280' }}>{user.email}</td>
                            <td style={{ padding: '12px' }}>{user.roomNumber || '—'}</td>
                            <td style={{ padding: '12px' }}>
                              <span className="role-badge">{user.role}</span>
                            </td>
                            <td style={{ padding: '12px' }}>
                              {user.role === 'tenant' ? (
                                user.approved ? (
                                  <span style={{ color: '#10b981', fontWeight: '600' }}>Approved</span>
                                ) : (
                                  <span style={{ color: '#f59e0b', fontWeight: '600' }}>Pending</span>
                                )
                              ) : (
                                <span style={{ color: '#10b981', fontWeight: '600' }}>Active</span>
                              )}
                            </td>
                            <td style={{ padding: '12px' }}>
                              {user.role !== 'admin' && (
                                <button
                                  className="text-btn remove"
                                  onClick={(e) => { e.stopPropagation(); handleRemoveUser(user._id); }}
                                >
                                  Remove
                                </button>
                              )}
                            </td>
                          </tr>
                          {expandedUserId === user._id && (
                            <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
                              <td colSpan="6" style={{ padding: '0 24px 24px 24px' }}>
                                <div style={{ 
                                  display: 'grid', 
                                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                                  gap: '20px', 
                                  padding: '24px', 
                                  background: 'white', 
                                  borderRadius: '12px', 
                                  border: '1px solid #e2e8f0',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500 }}>{user.name || '—'}</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500 }}>{user.email || '—'}</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500 }}>{user.phone || '—'}</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Address</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500 }}>{user.address || '—'}</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gender</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500 }}>{user.gender || '—'}</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date of Birth</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500 }}>
                                      {user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Age</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500 }}>{user.age || '—'}</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Occupation</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500 }}>{user.occupation || '—'}</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Room Number</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500 }}>{user.roomNumber || '—'}</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Room Type</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500, textTransform: 'capitalize' }}>{getRoomType(user.roomNumber)}</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Month Rent</span>
                                    <span style={{ 
                                      color: getRentStatus(user._id) === 'Paid' ? '#16a34a' : '#dc2626', 
                                      fontWeight: 700 
                                    }}>
                                      {getRentStatus(user._id)}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Remaining Rent</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500 }}>{typeof user.remainingRent === 'number' ? `₹${user.remainingRent}` : '—'}</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deposit</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500 }}>{user.deposit ? `₹${user.deposit}` : '—'}</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Role</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500 }}>{user.role || user.profileRole || '—'}</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Status</span>
                                    <span style={{ color: user.isActive ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                                      {user.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Approval Status</span>
                                    <span style={{ color: user.approved ? '#16a34a' : '#f59e0b', fontWeight: 600 }}>
                                      {user.approved ? 'Approved' : 'Pending'}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Joined</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500 }}>
                                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Login</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500 }}>
                                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString('en-IN') : '—'}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Move-out Date</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500 }}>
                                      {user.moveOutDate ? new Date(user.moveOutDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID Type</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500 }}>{user.idType ? user.idType.toUpperCase() : '—'}</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID Number</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500 }}>
                                      {user.aadharNumber || user.idNumber || '—'}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Emergency Contact Name</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500 }}>{user.emergencyContact?.name || '—'}</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Emergency Contact Phone</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500 }}>{user.emergencyContact?.phone || '—'}</span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Emergency Contact Relation</span>
                                    <span style={{ color: '#0f172a', fontWeight: 500 }}>{user.emergencyContact?.relation || '—'}</span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'rooms' && <SharedRooms userRole="admin" />}
        {activeTab === 'messmenu' && <AdminMessMenu />}
        {activeTab === 'payments' && <Payments />}
        {activeTab === 'complaints' && <ComplaintAdmin />}
        {activeTab === 'feedback' && <AdminFeedback />}
        {activeTab === 'notices' && <AdminNotice />}
        {activeTab === 'moveouts' && <AdminMoveOutRequests />}

        {activeTab === 'settings' && (
          <div className="content-area">
            <div className="page-header">
              <h1>Settings</h1>
            </div>
            <div className="card">
              <h2>Profile Information</h2>
              <div className="settings-section">
                <div className="setting-item">
                  <label>Full Name</label>
                  <p>{user?.name}</p>
                </div>
                <div className="setting-item">
                  <label>Email Address</label>
                  <p>{user?.email}</p>
                </div>
                <div className="setting-item">
                  <label>User Role</label>
                  <span className="role-badge">{user?.role}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
