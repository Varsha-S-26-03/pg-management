import { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import './Dashboard.css';
import './TenantProfile.css';

const TenantProfile = ({ user: initialUser }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const token = localStorage.getItem('token');

  // Fetch tenant profile
  const fetchProfile = async () => {
    try {
      console.log('Fetching profile...');
      console.log('API URL:', `${config.API_URL}/users/me`);
      console.log('Token:', token?.substring(0, 10) + '...');
      setLoading(true);
      setError('');
      const res = await axios.get(`${config.API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Profile data received:', res.data);
      setProfile(res.data);
      const initialFormData = {
        phone: res.data.phone || '',
        gender: res.data.gender || '',
        dateOfBirth: res.data.dateOfBirth ? res.data.dateOfBirth.substring(0, 10) : '',
        profileRole: res.data.profileRole || '',
        emergencyContact: res.data.emergencyContact?.name && res.data.emergencyContact?.phone 
          ? `${res.data.emergencyContact.name} (${res.data.emergencyContact.phone})`
          : ''
      };
      console.log('Setting initial form data:', initialFormData);
      setFormData(initialFormData);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('TenantProfile mounted, user:', initialUser);
    console.log('Token available:', !!token);
    fetchProfile();
  }, []);

  // Track isEditing state changes
  useEffect(() => {
    console.log('isEditing state changed to:', isEditing);
  }, [isEditing]);

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(`Form change - ${name}:`, value);
    console.log('Current formData before change:', formData);
    const newFormData = { ...formData, [name]: value };
    console.log('New formData after change:', newFormData);
    setFormData(newFormData);
  };

  // Save profile changes
  const handleSave = async () => {
    try {
      // Parse emergency contact from formatted string
      let emergencyContact;
      const emergencyContactMatch = formData.emergencyContact.match(/^(.+?) \((.+?)\)$/);
      if (emergencyContactMatch) {
        emergencyContact = {
          name: emergencyContactMatch[1].trim(),
          phone: emergencyContactMatch[2].trim(),
          relation: ''
        };
      } else if (formData.emergencyContact.trim()) {
        // If user enters just text without parentheses format, treat as name
        emergencyContact = {
          name: formData.emergencyContact.trim(),
          phone: '',
          relation: ''
        };
      } else {
        emergencyContact = { name: '', phone: '', relation: '' };
      }

      const saveData = {
        phone: formData.phone,
        emergencyContact: emergencyContact
      };
      if (formData.gender) {
        saveData.gender = formData.gender;
      }
      if (formData.dateOfBirth) {
        saveData.dateOfBirth = formData.dateOfBirth;
      }
      if (formData.profileRole) {
        saveData.profileRole = formData.profileRole;
      }

      console.log('Saving profile with data:', saveData);
      setSaving(true);
      const response = await axios.put(`${config.API_URL}/users/me`, saveData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Profile saved successfully:', response.data);
      
      setProfile(prev => ({ 
        ...prev, 
        phone: formData.phone,
        gender: formData.gender || prev.gender,
        dateOfBirth: formData.dateOfBirth || prev.dateOfBirth,
        profileRole: formData.profileRole || prev.profileRole,
        emergencyContact: emergencyContact
      }));
      setIsEditing(false);
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      console.error('Error saving profile:', err);
      showToast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    console.log('Cancelling edit, resetting form data from profile:', profile);
    const resetData = {
      phone: profile.phone || '',
      gender: profile.gender || '',
      dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().substring(0, 10) : '',
      profileRole: profile.profileRole || '',
      emergencyContact: profile.emergencyContact?.name && profile.emergencyContact?.phone 
        ? `${profile.emergencyContact.name} (${profile.emergencyContact.phone})`
        : ''
    };
    console.log('Reset form data:', resetData);
    setFormData(resetData);
    setIsEditing(false);
  };

  // Show toast notification
  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="content-area">
        <div className="page-header">
          <h1>My Profile</h1>
          <p>Loading your profile information...</p>
        </div>
        <div className="profile-skeleton">
          <div className="skeleton-card">
            <div className="skeleton-avatar"></div>
            <div className="skeleton-content">
              <div className="skeleton-line"></div>
              <div className="skeleton-line short"></div>
              <div className="skeleton-line"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    console.log('Showing error state:', error);
    return (
      <div className="content-area">
        <div className="page-header">
          <h1>My Profile</h1>
        </div>
        <div className="auth-info" style={{ marginBottom: 16 }}>{error}</div>
        <button className="btn-primary" onClick={fetchProfile}>Retry</button>
      </div>
    );
  }

  // Check if profile is null/undefined
  if (!profile) {
    console.log('Profile is null, showing loading...');
    return (
      <div className="content-area">
        <div className="page-header">
          <h1>My Profile</h1>
          <p>Loading your profile information...</p>
        </div>
        <div className="profile-skeleton">
          <div className="skeleton-card">
            <div className="skeleton-avatar"></div>
            <div className="skeleton-content">
              <div className="skeleton-line"></div>
              <div className="skeleton-line short"></div>
              <div className="skeleton-line"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log('Rendering TenantProfile, profile:', profile, 'error:', error, 'loading:', loading);
  
  try {
    console.log('Rendering form - isEditing:', isEditing, 'formData:', formData);
    return (
    <div className="content-area">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <p>View and manage your personal information</p>
        </div>
        {!isEditing && (
          <button className="btn-primary" onClick={() => {
            console.log('Edit button clicked, current isEditing:', isEditing);
            setIsEditing(true);
          }}>
            ✏️ Edit Profile
          </button>
        )}
      </div>

      <div className="profile-container">
        {/* Personal Information */}
        <div className="profile-card">
          <div className="card-header">
            <h2>🧑 Personal Information</h2>
          </div>
          
          <div className="profile-section">
            <div className="profile-avatar-section">
              <div className="profile-avatar">
                <span className="avatar-initial">{profile.name?.charAt(0).toUpperCase()}</span>
              </div>
            </div>

            <div className="profile-fields">
              <div className="field-group">
                <label>Full Name</label>
                <div className="field-value">{profile.name}</div>
              </div>

              <div className="field-group">
                <label>Email Address</label>
                <div className="field-value read-only">{profile.email}</div>
                <small className="field-note">Email cannot be changed</small>
              </div>

              <div className="field-group">
                <label>Phone Number</label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={(e) => {
                      console.log('Phone input changed:', e.target.value);
                      handleChange(e);
                    }}
                    className="form-input"
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <div className="field-value">{profile.phone || 'Not provided'}</div>
                )}
              </div>

              <div className="field-group">
                <label>Gender</label>
                {isEditing ? (
                  <select
                    name="gender"
                    value={formData.gender || ''}
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <div className="field-value">
                    {profile.gender
                      ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)
                      : 'Not specified'}
                  </div>
                )}
              </div>

              <div className="field-group">
                <label>Date of Birth</label>
                {isEditing ? (
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth || ''}
                    onChange={handleChange}
                    className="form-input"
                  />
                ) : (
                  <div className="field-value">
                    {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'Not provided'}
                  </div>
                )}
              </div>

              <div className="field-group">
                <label>Emergency Contact</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={(e) => {
                      console.log('Emergency contact input changed:', e.target.value);
                      handleChange(e);
                    }}
                    className="form-input"
                    placeholder="John Doe (9876543210)"
                  />
                ) : (
                  <div className="field-value">
                    {profile.emergencyContact?.name && profile.emergencyContact?.phone 
                      ? `${profile.emergencyContact.name} (${profile.emergencyContact.phone})`
                      : 'Not provided'
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="profile-card">
          <div className="card-header">
            <h2>🏠 PG Stay Details</h2>
          </div>
          
          <div className="profile-fields">
            <div className="field-group">
              <label>Room Number</label>
              <div className="field-value">{profile.roomNumber || 'Not assigned'}</div>
            </div>

            <div className="field-group">
              <label>Joining Date</label>
              <div className="field-value">{profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : 'Not provided'}</div>
            </div>

            <div className="field-group">
              <label>Rent Amount</label>
              <div className="field-value">₹{profile.rentAmount || '0'}/month</div>
            </div>

            <div className="field-group">
              <label>Security Deposit</label>
              <div className="field-value">₹{profile.securityDeposit || '0'}</div>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="profile-card">
          <div className="card-header">
            <h2>🔐 Account Information</h2>
          </div>
          
          <div className="profile-fields">
            <div className="field-group">
              <label>Role</label>
              {isEditing ? (
                <select
                  name="profileRole"
                  value={formData.profileRole || ''}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="">Select role</option>
                  <option value="tenant">Tenant</option>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                </select>
              ) : (
                <div className="field-value read-only">
                  {profile.profileRole
                    ? profile.profileRole.charAt(0).toUpperCase() + profile.profileRole.slice(1)
                    : 'Tenant'}
                </div>
              )}
            </div>

            <div className="field-group">
              <label>Joining Date</label>
              <div className="field-value">
                {profile.joiningDate
                  ? new Date(profile.joiningDate).toLocaleDateString()
                  : (profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Not available')}
              </div>
            </div>

            <div className="field-group">
              <label>Account Status</label>
              <div className={`field-value status-badge ${profile.isActive ? 'active' : 'inactive'}`}>
                {profile.isActive ? '✅ Active' : '⏸️ Inactive'}
              </div>
            </div>

            <div className="field-group">
              <label>Last Login</label>
              <div className="field-value">{profile.lastLogin ? new Date(profile.lastLogin).toLocaleString() : 'Never'}</div>
            </div>

            <div className="field-group">
              <label>Member Since</label>
              <div className="field-value">{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Not available'}</div>
            </div>
          </div>
        </div>

        {/* Edit Actions */}
        {isEditing && (
          <div className="profile-actions">
            <button className="btn-secondary" onClick={handleCancel} disabled={saving}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '💾 Saving...' : '💾 Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
    );
  } catch (renderError) {
    console.error('Error rendering TenantProfile:', renderError);
    return (
      <div className="content-area">
        <div className="page-header">
          <h1>My Profile</h1>
        </div>
        <div className="auth-info" style={{ marginBottom: 16, color: 'red' }}>
          Error rendering profile: {renderError.message}
        </div>
        <button className="btn-primary" onClick={fetchProfile}>Retry</button>
      </div>
    );
  }
};

export default TenantProfile;
