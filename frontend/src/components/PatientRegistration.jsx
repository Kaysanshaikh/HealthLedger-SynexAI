import React, { useState, useEffect } from 'react';
import './PatientRegistration.css';

const PatientRegistration = ({ walletAddress }) => {
  const [checking, setChecking] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    gender: 'Male',
    bloodGroup: 'O+',
    homeAddress: '',
    email: '',
    hhNumber: '',
    phoneNumber: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    allergies: '',
    chronicConditions: ''
  });

  useEffect(() => {
    if (walletAddress) {
      checkRegistration();
    }
  }, [walletAddress]);

  const checkRegistration = async () => {
    try {
      setChecking(true);
      const apiUrl = process.env.REACT_APP_API_URL || '/api';
      const response = await fetch(
        `${apiUrl}/profile/check-registration?walletAddress=${walletAddress}`
      );
      const data = await response.json();

      if (data.isRegistered) {
        setIsRegistered(true);
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Failed to check registration:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const validateForm = () => {
    const newErrors = [];

    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.push('Name must be at least 2 characters long');
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.push('Please enter a valid email address');
    }

    if (!formData.hhNumber || isNaN(formData.hhNumber) || formData.hhNumber <= 0) {
      newErrors.push('Please enter a valid HH Number');
    }

    if (!formData.dob) {
      newErrors.push('Date of birth is required');
    }

    if (!formData.homeAddress || formData.homeAddress.trim().length < 10) {
      newErrors.push('Please enter a complete home address (at least 10 characters)');
    }

    if (formData.phoneNumber && !/^\+?[1-9]\d{1,14}$/.test(formData.phoneNumber.replace(/[\s-]/g, ''))) {
      newErrors.push('Please enter a valid phone number');
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMessage('');

    // Client-side validation
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL || '/api';

      const response = await fetch(`${apiUrl}/register/patient`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          walletAddress: walletAddress
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(`✅ Registration successful! Welcome, ${data.profile.name}!`);

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } else {
        // Handle different error types
        if (data.errors && Array.isArray(data.errors)) {
          setErrors(data.errors);
        } else if (data.isRegistered) {
          // User is already registered
          setIsRegistered(true);
          checkRegistration();
        } else {
          setErrors([data.error || 'Registration failed. Please try again.']);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors(['Network error. Please check your connection and try again.']);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="registration-container">
        <div className="loading-box">
          <div className="spinner"></div>
          <p>Checking your registration status...</p>
        </div>
      </div>
    );
  }

  if (isRegistered && userProfile) {
    return (
      <div className="registration-container">
        <div className="already-registered-box">
          <div className="icon-success">✅</div>
          <h2>Welcome Back!</h2>
          <p className="subtitle">You are already registered with HealthLedger</p>

          <div className="profile-card">
            <h3>Your Profile</h3>
            <div className="profile-info">
              <div className="info-row">
                <span className="label">Name:</span>
                <span className="value">{userProfile.profile?.full_name || userProfile.profile?.center_name}</span>
              </div>
              <div className="info-row">
                <span className="label">Email:</span>
                <span className="value">{userProfile.user.email}</span>
              </div>
              <div className="info-row">
                <span className="label">HH Number:</span>
                <span className="value highlight">{userProfile.user.hhNumber}</span>
              </div>
              <div className="info-row">
                <span className="label">Role:</span>
                <span className="value">{userProfile.user.role}</span>
              </div>
              {userProfile.profile?.blood_group && (
                <div className="info-row">
                  <span className="label">Blood Group:</span>
                  <span className="value">{userProfile.profile.blood_group}</span>
                </div>
              )}
            </div>
          </div>

          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={() => window.location.href = '/dashboard'}
            >
              Go to Dashboard
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => window.location.href = `/profile/edit/${userProfile.user.hhNumber}`}
            >
              Update Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="registration-container">
      <div className="registration-box">
        <h2>Patient Registration</h2>
        <p className="subtitle">Register your account on HealthLedger</p>

        {errors.length > 0 && (
          <div className="error-box">
            <strong>⚠️ Please fix the following errors:</strong>
            <ul>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {successMessage && (
          <div className="success-box">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@example.com"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="hhNumber">HH Number *</label>
              <input
                type="number"
                id="hhNumber"
                name="hhNumber"
                value={formData.hhNumber}
                onChange={handleChange}
                placeholder="Enter your HH Number"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="dob">Date of Birth *</label>
              <input
                type="date"
                id="dob"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="gender">Gender *</label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="bloodGroup">Blood Group *</label>
              <select
                id="bloodGroup"
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
                required
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="homeAddress">Home Address *</label>
            <textarea
              id="homeAddress"
              name="homeAddress"
              value={formData.homeAddress}
              onChange={handleChange}
              placeholder="Enter your complete home address"
              rows="3"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phoneNumber">Phone Number (Optional)</label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="+1234567890"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="emergencyContactName">Emergency Contact Name (Optional)</label>
              <input
                type="text"
                id="emergencyContactName"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleChange}
                placeholder="Emergency contact person"
              />
            </div>

            <div className="form-group">
              <label htmlFor="emergencyContactPhone">Emergency Contact Phone (Optional)</label>
              <input
                type="tel"
                id="emergencyContactPhone"
                name="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={handleChange}
                placeholder="+1234567890"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="allergies">Allergies (Optional)</label>
            <textarea
              id="allergies"
              name="allergies"
              value={formData.allergies}
              onChange={handleChange}
              placeholder="List any allergies (e.g., Penicillin, Peanuts)"
              rows="2"
            />
          </div>

          <div className="form-group">
            <label htmlFor="chronicConditions">Chronic Conditions (Optional)</label>
            <textarea
              id="chronicConditions"
              name="chronicConditions"
              value={formData.chronicConditions}
              onChange={handleChange}
              placeholder="List any chronic conditions (e.g., Diabetes, Hypertension)"
              rows="2"
            />
          </div>

          <div className="wallet-info">
            <strong>Wallet Address:</strong> {walletAddress}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Registering...
              </>
            ) : (
              'Register'
            )}
          </button>
        </form>

        <div className="help-links">
          <a href="/forgot-hh-number">Forgot your HH Number?</a>
        </div>
      </div>
    </div>
  );
};

export default PatientRegistration;
