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

  const validateSession = async (token, timestamp) => {
    if (!token || !timestamp || isNaN(timestamp)) {
      console.error('Invalid session parameters:', { token, timestamp });
      return false;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    // Check if current time has passed the timestamp
    if (currentTime < timestamp) {
      console.error('Timestamp is in the future');
      return false;
    }

    // Calculate time difference from the URL timestamp
    const timeDiff = currentTime - timestamp;
    const timeDiffMinutes = Math.floor(timeDiff / 60);

    console.log('Time check:', {
      currentTime,
      timestamp,
      timeDiff,
      timeDiffMinutes,
      isExpired: timeDiffMinutes >= TIMEOUT_MINUTES
    });

    // Session is valid if current time is less than 20 minutes from the timestamp
    return timeDiffMinutes < TIMEOUT_MINUTES;
  };

  const checkSessionExpiration = async (psid, timestamp) => {
    try {
      const response = await fetch(`https://redis-session-manage.onrender.com/session/${psid}/${timestamp}`);
      const data = await response.json();
      return data.isExpired;
    } catch (error) {
      console.error('Error checking session expiration:', error);
      return true; // Assume expired on error
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitted) {
      console.log('Form already submitted');
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const timestamp = parseInt(urlParams.get('timestamp'), 10);
    
    try {
      // Check session with Redis
      const redisResponse = await fetch('https://redis-session-manage.onrender.com/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          psid: userPsid,
          timestamp: timestamp
        })
      });
      const redisData = await redisResponse.json();
      console.log('Redis validation response:', redisData);

      if (redisData.isExpired) {
        console.log('Session expired during form submission');
        setIsExpired(true);
        return;
      }
    
      const formData = {
        fullName: e.target.fullName.value,
        phone: e.target.phone.value,
        address: e.target.address.value,
        city: e.target.city.value,
        state: e.target.state.value,
        zipCode: e.target.zipCode.value,
        country: e.target.country.value,
        psid: userPsid,
        sessionTimestamp: timestamp
      };
      
      // Send form data to MongoDB server
      const response = await fetch('https://mongodb-manage.onrender.com/api/address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to submit address data');
      }

      // Get and log the response data from MongoDB server
      const responseData = await response.json();
      console.log('MongoDB Server Response:', responseData);

      console.log('Form submitted successfully:', formData);
      setIsSubmitted(true);
      alert('Address confirmed successfully!');
      
      // Close the webview
      if (window.MessengerExtensions) {
        window.MessengerExtensions.requestCloseBrowser(function success() {
          console.log('Webview closed successfully');
        }, function error(err) {
          console.error('Error closing webview:', err);
        });
      } else {
        console.log('MessengerExtensions not available, webview will not close');
      }
    } catch (error) {
      console.error('Error submitting address data:', error);
      alert('Failed to submit address. Please try again.');
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const encryptedToken = urlParams.get('token');
      const timestamp = parseInt(urlParams.get('timestamp'), 10);
      
      console.log('URL Parameters:', {
        token: encryptedToken ? 'exists' : 'missing',
        timestamp,
        raw: window.location.search
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
        console.log('Session initialized with PSID:', decryptedPsid);

        // First check URL timestamp validity
        const isValid = await validateSession(encryptedToken, timestamp);
        console.log('URL timestamp validation:', isValid);

        if (isValid) {
          // If URL timestamp is valid, POST to Redis
          try {
            const redisResponse = await fetch('https://redis-session-manage.onrender.com/session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                psid: decryptedPsid,
                timestamp: timestamp
              })
            });
            const redisData = await redisResponse.json();
            console.log('Redis POST response:', redisData);

            // Session is valid, fetch MongoDB data
            await fetchMongoData(decryptedPsid, timestamp);
          } catch (error) {
            console.error('Error posting to Redis:', error);
            setIsExpired(true);
          }
        } else {
          // If URL timestamp is not valid, GET from Redis to check expiration
          console.log('URL timestamp invalid, checking Redis expiration');
          const isExpired = await checkSessionExpiration(decryptedPsid, timestamp);
          console.log('Redis GET response - isExpired:', isExpired);
          
          if (isExpired) {
            setIsExpired(true);
          } else {
            // Session is valid through Redis, fetch MongoDB data
            await fetchMongoData(decryptedPsid, timestamp);
          }
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        setIsExpired(true);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchMongoData = async (psid, timestamp) => {
      try {
        console.log('Fetching MongoDB data for:', { psid, timestamp });
        const mongoResponse = await fetch(`https://mongodb-manage.onrender.com/api/address/${psid}/${timestamp}`);
        console.log('MongoDB response status:', mongoResponse.status);
        
        if (mongoResponse.status === 404) {
          console.log('No existing data found in MongoDB');
          return;
        }
        
        if (mongoResponse.ok) {
          const data = await mongoResponse.json();
          console.log('MongoDB Data received:', data);
          
          // Auto-fill form with received data
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
    };

    initializeApp();
  }, []);

  // Show black screen while loading
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content"></div>
      </div>
    );
  }

  // If session is expired, only show the warning
  if (isExpired) {
    return (
      <div className="form-container">
        <div className="timeout-warning">
          Your session has expired. Please try again.
        </div>
      </div>
    );
  }

  // If form was already submitted, show success message
  if (isSubmitted) {
    return (
      <div className="form-container">
        <div className="success-message">
          Address already confirmed. Thank you!
        </div>
      </div>
    );
  }

  // Only show form if session is valid and not submitted
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