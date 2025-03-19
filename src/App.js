import React, { useEffect, useState, useCallback } from 'react';
import './App.css';
import { MESSENGER_CONFIG } from './config';

function App() {
  const [context, setContext] = useState(null);
  const [error, setError] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [features, setFeatures] = useState(null);
  const { APP_ID } = MESSENGER_CONFIG;

  const getContext = useCallback(() => {
    if (!window.MessengerExtensions) {
      setError("MessengerExtensions not available");
      return;
    }

    window.MessengerExtensions.getContext(
      APP_ID,
      (thread_context) => {
        console.log("Context result:", thread_context);
        setContext(thread_context);
        setError(null);
      },
      (err) => {
        console.error("Context error:", err);
        setError(err.message || JSON.stringify(err));
      }
    );
  }, [APP_ID]);

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
        getContext();
      }, 1000);
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [getSupportedFeatures, getContext]);

  return (
    <div className="App">
      <header className="App-header">
        <div>
          {context ? (
            <div>
              <p>Thread Type: {context.thread_type}</p>
              <p>Thread ID: {context.tid}</p>
              <p>PSID: {context.psid}</p>
            </div>
          ) : (
            <p>Error: {error || 'Trying to get context...'}</p>
          )}
          <button onClick={getContext}>
            Get Context
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
          {context && (
            <p>Full Context: {JSON.stringify(context, null, 2)}</p>
          )}
        </div>
      </header>
    </div>
  );
}

export default App;