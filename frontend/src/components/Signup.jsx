import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

const Signup = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    age: '',
    occupation: '',
    idType: '',
    idNumber: '',
    password: '',
    confirmPassword: '',
    role: 'tenant'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let v = value;

    // Normalize PAN to uppercase
    if (name === 'idNumber' && formData.idType === 'pan') {
      v = v.toUpperCase();
    }

    // If ID type changes, clear idNumber
    if (name === 'idType') {
      setFormData({
        ...formData,
        idType: v,
        idNumber: ''
      });
    } else {
      setFormData({
        ...formData,
        [name]: v
      });
    }

    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate ID number if provided
    if (formData.idType && formData.idNumber) {
      const id = formData.idNumber.trim();
      if (formData.idType === 'aadhaar') {
        if (!/^\d{12}$/.test(id)) {
          setError('Aadhaar must be a 12 digit number');
          setLoading(false);
          return;
        }
      } else if (formData.idType === 'pan') {
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(id)) {
          setError('PAN must be 10 characters in format ABCDE1234F');
          setLoading(false);
          return;
        }
      }
    } else if (formData.idType && !formData.idNumber) {
      setError('Please enter the ID number for the selected ID type');
      setLoading(false);
      return;
    }


    try {
      const response = await axios.post('http://localhost:5000/api/auth/signup', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        age: formData.age,
        occupation: formData.occupation,
        idType: formData.idType,
        idNumber: formData.idNumber,
        password: formData.password,
        role: formData.role
      });

      // If token returned -> login normally
      if (response.data?.token) {
        onLogin(response.data.token, response.data.user);
      } else {
        // Otherwise show informational message about pending approval
        setError(response.data?.message || 'Signup submitted — pending approval');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      
      <div className="auth-card signup-card">
        <div className="auth-header">
          <div className="logo-circle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <h2>Create Account</h2>
          <p className="subtitle">Join us and manage your PG efficiently</p>
        </div>
        
        {error && (
          <div className="error-message">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter your phone number"
              autoComplete="tel"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="age">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                Age
              </label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleChange}
                placeholder="Your age"
                min="18"
                max="100"
                autoComplete="bday"
              />
            </div>

            <div className="form-group">
              <label htmlFor="occupation">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 7h-3V6a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v1H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"></path>
                  <path d="M9 12l2 2 4-4"></path>
                </svg>
                Occupation
              </label>
              <input
                type="text"
                id="occupation"
                name="occupation"
                value={formData.occupation}
                onChange={handleChange}
                placeholder="Your occupation"
                autoComplete="organization-title"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="address">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="2"></circle>
              </svg>
              Address
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter your address (optional)"
              autoComplete="street-address"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="idType">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a2 2 0 0 1 2 2v2h-4V4a2 2 0 0 1 2-2z"></path>
                  <path d="M20 8v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8h16z"></path>
                </svg>
                ID Type
              </label>
              <select
                id="idType"
                name="idType"
                value={formData.idType}
                onChange={handleChange}
              >
                <option value="">Select ID </option>
                <option value="aadhaar">Aadhaar Card</option>
                <option value="pan">PAN Card</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="idNumber">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 7h18M6 10h.01M6 14h.01M8 10h.01M8 14h.01"></path>
                </svg>
                ID Number
              </label>
              <input
                type="text"
                id="idNumber"
                name="idNumber"
                value={formData.idNumber}
                onChange={handleChange}
                placeholder={formData.idType === 'aadhaar' ? '12 digit Aadhaar' : formData.idType === 'pan' ? 'ABCDE1234F' : 'Select ID type first'}
                autoComplete="off"
                disabled={formData.idType === ''}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="role">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              User Role
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="tenant">Tenant - I'm looking for a room</option>
              <option value="admin">Admin - System administrator</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Min. 6 characters"
                minLength="6"
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Repeat password"
                minLength="6"
                autoComplete="new-password"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Creating Account...
              </>
            ) : (
              <>
                Create Account
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </>
            )}
          </button>
        </form>

        <div className="divider">
          <span>Already have an account?</span>
        </div>

        <Link to="/login" className="link-button">
          Login to Your Account
        </Link>
      </div>
    </div>
  );
};

export default Signup;