import React, { useEffect, useState } from 'react';
import { decryptToken } from './utils/encryption';
import './App.css';

function App() {
  const [isExpired, setIsExpired] = useState(false);
  const [userPsid, setUserPsid] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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

    // Get timestamp from URL and check if expired
    const urlParams = new URLSearchParams(window.location.search);
    const timestamp = parseInt(urlParams.get('timestamp'), 10);
    
    // Check local timestamp validation
    const isValid = validateSession(urlParams.get('token'), timestamp);
    
    if (isValid) {
      // If valid, send data to backend
      try {
        await fetch('https://redis-session-manage.onrender.com/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            psid: userPsid,
            timestamp: timestamp
          })
        });
      } catch (error) {
        console.error('Error submitting form:', error);
      }
    } else {
      // If invalid, check with backend
      const isExpired = await checkSessionExpiration(userPsid, timestamp);
      if (isExpired) {
        setIsExpired(true);
        return;
      }
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
    
    console.log('Form submitted:', formData);
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
        // Decrypt token to get PSID using the imported decryption function
        const decryptedPsid = decryptToken(encryptedToken);
        if (!decryptedPsid) {
          throw new Error('Failed to decrypt token');
        }

        setUserPsid(decryptedPsid);
        console.log('Session initialized with PSID:', decryptedPsid);

        // Check local timestamp validation
        const isValid = await validateSession(encryptedToken, timestamp);
        
        if (isValid) {
          // If valid, send data to backend
          try {
            await fetch('https://redis-session-manage.onrender.com/session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                psid: decryptedPsid,
                timestamp: timestamp
              })
            });
          } catch (error) {
            console.error('Error submitting form:', error);
          }
        } else {
          // If invalid, check with backend
          const isExpired = await checkSessionExpiration(decryptedPsid, timestamp);
          if (isExpired) {
            setIsExpired(true);
          }
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        setIsExpired(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []); // Run once on component mount

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
          <input type="text" id="fullName" name="fullName" required placeholder="Enter your full name" />
        </div>
        <div className="form-group">
          <label htmlFor="phone">Phone Number</label>
          <input type="tel" id="phone" name="phone" required placeholder="Enter your phone number" />
        </div>
        <div className="form-group">
          <label htmlFor="address">Street Address</label>
          <input type="text" id="address" name="address" required placeholder="Enter your street address" />
        </div>
        <div className="form-group">
          <label htmlFor="city">City</label>
          <input type="text" id="city" name="city" required placeholder="Enter your city" />
        </div>
        <div className="form-group">
          <label htmlFor="state">State/Province</label>
          <input type="text" id="state" name="state" required placeholder="Enter your state or province" />
        </div>
        <div className="form-group">
          <label htmlFor="zipCode">ZIP/Postal Code</label>
          <input type="text" id="zipCode" name="zipCode" required placeholder="Enter your ZIP or postal code" />
        </div>
        <div className="form-group">
          <label htmlFor="country">Country</label>
          <select id="country" name="country" required>
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