import React, { useEffect, useState } from 'react';
import { validateSession, checkSessionExpiration, validateRedisTimestamp } from './utils/sessionUtils';
import AddressForm from './components/AddressForm';
import StatusMessage from './components/StatusMessage';
import './App.css';

function App() {
  const [isExpired, setIsExpired] = useState(false);
  const [userToken, setUserToken] = useState('');
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

  useEffect(() => {
    window.extAsyncInit = function() {
      console.log('Messenger Extensions SDK loaded (from extAsyncInit)');
      // Kiểm tra tham số messenger_extensions trên URL
      const urlParams = new URLSearchParams(window.location.search);
      const messengerExtensions = urlParams.get('messenger_extensions');
      console.log('messenger_extensions param:', messengerExtensions);
    };
  }, []);

  const closeWebview = () => {
    if (window.MessengerExtensions) {
      console.log('MessengerExtensions SDK is available, trying to close webview...');
      window.MessengerExtensions.requestCloseBrowser(
        () => console.log('Webview closed successfully'),
        (err) => console.error('Error closing webview:', err)
      );
    } else {
      console.log('MessengerExtensions SDK is NOT available at closeWebview time, will retry in 1s');
      setTimeout(() => {
        if (window.MessengerExtensions) {
          window.MessengerExtensions.requestCloseBrowser(
            () => console.log('Webview closed successfully (retry)'),
            (err) => console.error('Error closing webview (retry):', err)
          );
        } else {
          console.log('MessengerExtensions vẫn chưa khả dụng sau khi retry');
        }
      }, 1000);
    }
  };

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
        token: userToken,
        sessionTimestamp: timestamp
      };

      const mongoResponse = await fetch(`${process.env.REACT_APP_MONGODB_SERVER_URL}/api/address`, {
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
      
      if (!window.MessengerExtensions) {
        console.log('MessengerExtensions not available, waiting for SDK to load...');
        setTimeout(() => {
          closeWebview();
        }, 1000);
      } else {
        closeWebview();
      }
    } catch (error) {
      console.error('Error submitting address data:', error);
      alert('Failed to submit address. Please try again.');
    }
  };

  const fetchMongoData = async (token) => {
    try {
      const mongoResponse = await fetch(`${process.env.REACT_APP_MONGODB_SERVER_URL}/api/address/${token}`);
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
      sessionStorage.removeItem('redisTimestamp');
      console.log('Cleared Redis timestamp from sessionStorage');
      
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const timestamp = parseInt(urlParams.get('timestamp'), 10);
      
      console.log('URL Parameters:', {
        token: token ? 'exists' : 'missing',
        timestamp,
        currentTime: Math.floor(Date.now() / 1000)
      });

      if (!token || !timestamp) {
        console.error('Missing required parameters');
        setIsExpired(true);
        setIsLoading(false);
        return;
      }

      try {
        setUserToken(token);

        const isValid = validateSession(timestamp);
        console.log('URL timestamp validation:', {
          isValid,
          timestamp,
          currentTime: Math.floor(Date.now() / 1000)
        });

        if (isValid) {
          const response = await fetch(`${process.env.REACT_APP_REDIS_SERVER_URL}/session`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token: token,
              timestamp: timestamp
            })
          });
          const data = await response.json();

          if (data && data.timestamp) {
            sessionStorage.setItem('redisTimestamp', data.timestamp);
            console.log('Redis timestamp in sessionStorage:', sessionStorage.getItem('redisTimestamp'));
          }

          if (!data.isExpired) {
            await fetchMongoData(token);
          } else {
            setIsExpired(true);
          }
        } else {
          const isExpired = await checkSessionExpiration(token, timestamp);
          
          if (isExpired) {
            setIsExpired(true);
          } else {
            await fetchMongoData(token);
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