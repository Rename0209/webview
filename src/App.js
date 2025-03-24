import React, { useEffect, useState } from 'react';
import { decryptToken } from './utils/encryption';
import './App.css';

function App() {
  const [isExpired, setIsExpired] = useState(false);
  const [userPsid, setUserPsid] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  });

  const TIMEOUT_MINUTES = 20;

  const validateSession = (timestamp) => {
    if (!timestamp || isNaN(timestamp)) {
      console.error('Invalid timestamp:', timestamp);
      return false;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime < timestamp) {
      console.error('Timestamp is in the future');
      return false;
    }

    const timeDiffMinutes = Math.floor((currentTime - timestamp) / 60);
    console.log('Time validation:', {
      currentTime,
      timestamp,
      timeDiffMinutes,
      isValid: timeDiffMinutes < TIMEOUT_MINUTES
    });

    return timeDiffMinutes < TIMEOUT_MINUTES;
  };

  const checkSessionExpiration = async (psid, timestamp) => {
    try {
      const response = await fetch(`https://redis-session-manage.onrender.com/session/${psid}/${timestamp}`);
      const data = await response.json();
      return data.isExpired;
    } catch (error) {
      console.error('Error checking session expiration:', error);
      return true;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitted) {
      console.log('Form already submitted');
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const timestamp = parseInt(urlParams.get('timestamp'), 10);
    
    try {
      const response = await fetch('https://redis-session-manage.onrender.com/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          psid: userPsid,
          timestamp: timestamp
        })
      });
      const data = await response.json();

      if (data.isExpired) {
        console.log('Session expired during form submission');
        setIsExpired(true);
        return;
      }

      const submitData = {
        ...formData,
        psid: userPsid,
        sessionTimestamp: timestamp
      };

      const mongoResponse = await fetch('https://mongodb-manage.onrender.com/api/address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      });

      if (!mongoResponse.ok) {
        throw new Error('Failed to submit address data');
      }

      setIsSubmitted(true);
      alert('Address confirmed successfully!');
      
      if (window.MessengerExtensions) {
        window.MessengerExtensions.requestCloseBrowser(
          () => console.log('Webview closed successfully'),
          (err) => console.error('Error closing webview:', err)
        );
      }
    } catch (error) {
      console.error('Error submitting address data:', error);
      alert('Failed to submit address. Please try again.');
    }
  };

  useEffect(() => {
    const initializeSession = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const encryptedToken = urlParams.get('token');
      const timestamp = parseInt(urlParams.get('timestamp'), 10);
      
      console.log('URL Parameters:', {
        token: encryptedToken ? 'exists' : 'missing',
        timestamp
      });

      if (!encryptedToken || !timestamp) {
        console.error('Missing required parameters');
        setIsExpired(true);
        setIsLoading(false);
        return;
      }

      try {
        const decryptedPsid = decryptToken(encryptedToken);
        if (!decryptedPsid) {
          throw new Error('Failed to decrypt token');
        }
        setUserPsid(decryptedPsid);

        const isValid = validateSession(timestamp);
        console.log('URL timestamp validation:', isValid);

        if (isValid) {
          const response = await fetch('https://redis-session-manage.onrender.com/session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              psid: decryptedPsid,
              timestamp: timestamp
            })
          });
          const data = await response.json();

          if (!data.isExpired) {
            try {
              const mongoResponse = await fetch(`https://mongodb-manage.onrender.com/api/address/${decryptedPsid}/${timestamp}`);
              if (mongoResponse.status === 404) {
                console.log('No existing data in MongoDB');
              } else if (mongoResponse.ok) {
                const data = await mongoResponse.json();
                setFormData({
                  fullName: data.fullName || '',
                  phone: data.phone || '',
                  address: data.address || '',
                  city: data.city || '',
                  state: data.state || '',
                  zipCode: data.zipCode || '',
                  country: data.country || ''
                });
              }
            } catch (error) {
              console.error('Error fetching MongoDB data:', error);
            }
          } else {
            setIsExpired(true);
          }
        } else {
          const isExpired = await checkSessionExpiration(decryptedPsid, timestamp);
          if (isExpired) {
            setIsExpired(true);
          } else {
            try {
              const mongoResponse = await fetch(`https://mongodb-manage.onrender.com/api/address/${decryptedPsid}/${timestamp}`);
              if (mongoResponse.status === 404) {
                console.log('No existing data in MongoDB');
              } else if (mongoResponse.ok) {
                const data = await mongoResponse.json();
                setFormData({
                  fullName: data.fullName || '',
                  phone: data.phone || '',
                  address: data.address || '',
                  city: data.city || '',
                  state: data.state || '',
                  zipCode: data.zipCode || '',
                  country: data.country || ''
                });
              }
            } catch (error) {
              console.error('Error fetching MongoDB data:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        setIsExpired(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, []);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content"></div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="form-container">
        <div className="timeout-warning">
          Your session has expired. Please try again.
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="form-container">
        <div className="success-message">
          Address already confirmed. Thank you!
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <h1>Address Information</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="fullName">Full Name</label>
          <input 
            type="text" 
            id="fullName" 
            name="fullName" 
            required 
            placeholder="Enter your full name"
            value={formData.fullName}
            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label htmlFor="phone">Phone Number</label>
          <input 
            type="tel" 
            id="phone" 
            name="phone" 
            required 
            placeholder="Enter your phone number"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label htmlFor="address">Street Address</label>
          <input 
            type="text" 
            id="address" 
            name="address" 
            required 
            placeholder="Enter your street address"
            value={formData.address}
            onChange={(e) => setFormData({...formData, address: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label htmlFor="city">City</label>
          <input 
            type="text" 
            id="city" 
            name="city" 
            required 
            placeholder="Enter your city"
            value={formData.city}
            onChange={(e) => setFormData({...formData, city: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label htmlFor="state">State/Province</label>
          <input 
            type="text" 
            id="state" 
            name="state" 
            required 
            placeholder="Enter your state or province"
            value={formData.state}
            onChange={(e) => setFormData({...formData, state: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label htmlFor="zipCode">ZIP/Postal Code</label>
          <input 
            type="text" 
            id="zipCode" 
            name="zipCode" 
            required 
            placeholder="Enter your ZIP or postal code"
            value={formData.zipCode}
            onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label htmlFor="country">Country</label>
          <select 
            id="country" 
            name="country" 
            required
            value={formData.country}
            onChange={(e) => setFormData({...formData, country: e.target.value})}
          >
            <option value="">Select a country</option>
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="VN">Vietnam</option>
            <option value="GB">United Kingdom</option>
            <option value="AU">Australia</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="JP">Japan</option>
            <option value="CN">China</option>
          </select>
        </div>
        <button type="submit" className="confirm-btn">Confirm Address</button>
      </form>
    </div>
  );
}

export default App; 