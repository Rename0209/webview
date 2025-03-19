import React, { useEffect, useState, useCallback } from 'react';
import './App.css';
import { MESSENGER_CONFIG } from './config';

function App() {
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [features, setFeatures] = useState(null);
  const { APP_ID } = MESSENGER_CONFIG;

  const getUserId = useCallback(() => {
    if (!window.MessengerExtensions) {
      setError("MessengerExtensions not available");
      return;
    }

    window.MessengerExtensions.getUserID(
      (uids) => {
        console.log("User ID result:", uids);
        if (uids.length > 0) {
          setUserId(uids[0]);
          setError(null);
        } else {
          setError("No user ID returned");
        }
      },
      (err) => {
        console.error("getUserID error:", err);
        setError(err.message || JSON.stringify(err));
      }
    );
  }, []);

  const getSupportedFeatures = useCallback(async () => {
    try {
      if (!window.MessengerExtensions) {
        throw new Error("MessengerExtensions not available");
      }
      
      window.MessengerExtensions.getSupportedFeatures(
        (result) => {
          console.log("Supported features:", result);
          setFeatures(result);
        },
        (err) => {
          console.error("Error getting supported features:", err);
          setError(err.message || JSON.stringify(err));
        }
      );
    } catch (error) {
      console.error("Error calling getSupportedFeatures:", error);
      setError(error.message);
    }
  }, []);

  useEffect(() => {
    const isInIframe = window !== window.top;
    console.log("Is in iframe:", isInIframe);
    console.log("Window name:", window.name);
    console.log("Origin:", window.location.origin);
    console.log("Referrer:", document.referrer);
    
    if (!isInIframe) {
      setError("This app must be run inside Messenger webview");
      return;
    }

    // Handle incoming messages from the parent frame
    const handleMessage = (event) => {
      if (!event.origin.includes('facebook.com')) {
        return;
      }

      console.log("Received message:", event);
    };

    window.addEventListener('message', handleMessage);
    
    // Start initialization if we're in the right frame
    if (window.name === 'facebook_ref' && window.MessengerExtensions) {
      // Add a small delay to ensure everything is ready
      setTimeout(() => {
        getSupportedFeatures();
        getUserId();
      }, 1000);
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [getSupportedFeatures, getUserId]);

  return (
    <div className="App">
      <header className="App-header">
        <div>
          {userId ? (
            <p>Your User ID: {userId}</p>
          ) : (
            <p>Error: {error || 'Trying to get User ID...'}</p>
          )}
          <button onClick={getUserId}>
            Get User ID
          </button>
          <button onClick={getSupportedFeatures} style={{ marginLeft: '10px' }}>
            Check Features
          </button>
        </div>
        <div className="debug-info">
          <p>MessengerExtensions available: {window.MessengerExtensions ? 'Yes' : 'No'}</p>
          <p>Window name: {window.name}</p>
          <p>URL parameters: {window.location.search}</p>
          <p>Origin: {window.location.origin}</p>
          <p>Referrer: {document.referrer}</p>
          <p>Is Facebook iFrame: {window !== window.top ? 'Yes' : 'No'}</p>
          <p>Protocol: {window.location.protocol}</p>
          <p>SDK Ready: {sdkReady ? 'Yes' : 'No'}</p>
          <p>Supported Features: {features ? JSON.stringify(features) : 'Not checked yet'}</p>
        </div>
      </header>
    </div>
  );
}

export default App;