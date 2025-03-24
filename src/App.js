import React, { useEffect, useState } from 'react';
import { decryptToken } from './utils/encryption';
import { validateSession, checkSessionExpiration, validateRedisTimestamp } from './utils/sessionUtils';
import AddressForm from './components/AddressForm';
import StatusMessage from './components/StatusMessage';
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
    zipCode: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitted) {
      console.log('Form already submitted');
      return;
    }

    if (!validateRedisTimestamp()) {
      setIsExpired(true);
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const timestamp = parseInt(urlParams.get('timestamp'), 10);
    
    try {
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

  const fetchMongoData = async (psid, timestamp) => {
    try {
      const mongoResponse = await fetch(`https://mongodb-manage.onrender.com/api/address/${psid}/${timestamp}`);
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
          zipCode: data.zipCode || ''
        });
      }
    } catch (error) {
      console.error('Error fetching MongoDB data:', error);
    }
  };

  useEffect(() => {
    const initializeSession = async () => {
      localStorage.removeItem('redisTimestamp');
      console.log('Cleared Redis timestamp from localStorage');
      
      const urlParams = new URLSearchParams(window.location.search);
      const encryptedToken = urlParams.get('token');
      const timestamp = parseInt(urlParams.get('timestamp'), 10);
      
      console.log('URL Parameters:', {
        token: encryptedToken ? 'exists' : 'missing',
        timestamp,
        currentTime: Math.floor(Date.now() / 1000)
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
        console.log('URL timestamp validation:', {
          isValid,
          timestamp,
          currentTime: Math.floor(Date.now() / 1000)
        });

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

          if (data && data.timestamp) {
            localStorage.setItem('redisTimestamp', data.timestamp);
            console.log('Redis timestamp in localStorage:', localStorage.getItem('redisTimestamp'));
          }

          if (!data.isExpired) {
            await fetchMongoData(decryptedPsid, timestamp);
          } else {
            setIsExpired(true);
          }
        } else {
          const isExpired = await checkSessionExpiration(decryptedPsid, timestamp);
          
          if (isExpired) {
            setIsExpired(true);
          } else {
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

    initializeSession();
  }, []);

  if (isLoading) {
    return <StatusMessage type="loading" />;
  }

  if (isExpired) {
    return <StatusMessage type="expired" />;
  }

  if (isSubmitted) {
    return <StatusMessage type="success" />;
  }

  return (
    <div className="form-container">
      <h1>Address Information</h1>
      <AddressForm 
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

export default App; 