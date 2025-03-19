import React, { useEffect, useState, useCallback } from 'react';
import './App.css';
import { MESSENGER_CONFIG } from './config';

function App() {
  const [psid, setPsid] = useState(null);
  const [error, setError] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [features, setFeatures] = useState(null);
  const [context, setContext] = useState(null);
  const { APP_ID } = MESSENGER_CONFIG;

  // Parse signed request from URL
  const getSignedRequestFromURL = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const signedRequest = urlParams.get('signed_request');
    if (signedRequest) {
      try {
        // The signed request is base64 encoded
        const parts = signedRequest.split('.');
        if (parts.length === 2) {
          const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const decodedData = JSON.parse(atob(payload));
          console.log("Decoded signed request:", decodedData);
          if (decodedData.psid) {
            return decodedData.psid;
          }
        }
      } catch (e) {
        console.error("Error parsing signed request:", e);
      }
    }
    return null;
  }, []);

  // Wrap SDK calls to ensure proper binding
  const callSDKMethod = useCallback((methodName, ...args) => {
    return new Promise((resolve, reject) => {
      if (!window.MessengerExtensions || !window.MessengerExtensions[methodName]) {
        reject(new Error(`${methodName} not available`));
        return;
      }

      try {
        window.MessengerExtensions[methodName](...args, 
          (result) => resolve(result),
          (error) => reject(error)
        );
      } catch (e) {
        reject(e);
      }
    });
  }, []);

  const getSupportedFeatures = useCallback(async () => {
    try {
      const supportedFeatures = await callSDKMethod('getSupportedFeatures');
      console.log("Supported features:", supportedFeatures);
      setFeatures(supportedFeatures);
      return supportedFeatures;
    } catch (error) {
      console.error("Error getting supported features:", error);
      return null;
    }
  }, [callSDKMethod]);

  const checkPermissions = useCallback(async () => {
    console.log("Checking permissions...");
    try {
      const response = await callSDKMethod('getGrantedPermissions');
      console.log("Current permissions:", response);
      if (!response.permissions.includes('user_profile')) {
        await askPermission();
      }
    } catch (error) {
      console.error("Permission check failed:", error);
      await askPermission();
    }
  }, [callSDKMethod]);

  const askPermission = useCallback(async () => {
    console.log("Requesting user_profile permission...");
    try {
      const success = await callSDKMethod('askPermission', 'user_profile');
      console.log("Permission granted:", success);
    } catch (error) {
      console.error("Permission request failed:", error);
      setError(`Permission request failed: ${JSON.stringify(error)}`);
    }
  }, [callSDKMethod]);

  const getContext = () => {
    if (!window.MessengerExtensions) {
      setError("MessengerExtensions not available");
      return;
    }

    window.MessengerExtensions.getContext(
      APP_ID,
      (result) => {
        console.log("Context result:", result);
        setContext(result);
        setError(null);
      },
      (err) => {
        console.error("Context error:", err);
        setError(err.message || JSON.stringify(err));
      }
    );
  };

  const initMessenger = async () => {
    try {
      console.log("MessengerExtensions found, checking methods...");
      
      // Check available methods
      const methods = Object.keys(window.MessengerExtensions || {});
      console.log("Available methods:", methods);

      // Try multiple approaches to get PSID
      let psidFound = null;

      // 1. Try signed request first
      psidFound = getSignedRequestFromURL();
      if (psidFound) {
        console.log("Found PSID in signed request:", psidFound);
        setPsid(psidFound);
        return;
      }

      // 2. Try getting context
      getContext();
      
      // Get supported features for debugging
      await getSupportedFeatures();
      
      // Check permissions as fallback
      await checkPermissions();
      
      // Set SDK as ready
      setSdkReady(true);

      if (!psidFound) {
        setError("Could not retrieve PSID through any available method");
      }
    } catch (e) {
      console.error("Initialization failed:", e);
      setError(`Initialization failed: ${e.message}`);
    }
  };

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
      console.log("Received message:", event);
      
      // Verify origin contains facebook.com
      if (!event.origin.includes('facebook.com')) {
        console.log("Ignoring message from non-Facebook origin:", event.origin);
        return;
      }

      // Check if it's a Messenger Extensions RPC message
      if (typeof event.data === 'string' && event.data.startsWith('MESSENGER_EXTENSIONS_RPC:')) {
        const message = event.data.substring('MESSENGER_EXTENSIONS_RPC:'.length);
        console.log("Received RPC message:", message);
        try {
          const rpcData = JSON.parse(message);
          console.log("Parsed RPC data:", rpcData);
        } catch (e) {
          console.error("Failed to parse RPC message:", e);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Start initialization immediately if we're in the right frame
    if (window.name === 'facebook_ref' && window.MessengerExtensions) {
      // Add a small delay to ensure everything is ready
      setTimeout(initMessenger, 500);
    }

    // Wait a bit for MessengerExtensions to be ready
    setTimeout(() => {
      if (window.MessengerExtensions) {
        getContext();
      }
    }, 1000);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [APP_ID, checkPermissions, getSupportedFeatures, getSignedRequestFromURL]);

  return (
    <div className="App">
      <header className="App-header">
        {psid ? (
          <p>Your PSID: {psid}</p>
        ) : (
          <div>
            <p>Error getting PSID: {error || 'Unknown error'}</p>
            <button onClick={getSupportedFeatures}>
              Check Supported Features
            </button>
            <button onClick={checkPermissions} style={{ marginLeft: '10px' }}>
              Check Permissions
            </button>
          </div>
        )}
        <div className="debug-info">
          <p>MessengerExtensions available: {window.MessengerExtensions ? 'Yes' : 'No'}</p>
          <p>MessengerExtensions.getSupportedFeatures available: {window.MessengerExtensions && typeof window.MessengerExtensions.getSupportedFeatures === 'function' ? 'Yes' : 'No'}</p>
          <p>MessengerExtensions.getGrantedPermissions available: {window.MessengerExtensions && typeof window.MessengerExtensions.getGrantedPermissions === 'function' ? 'Yes' : 'No'}</p>
          <p>Available methods: {window.MessengerExtensions ? Object.keys(window.MessengerExtensions).join(', ') : 'None'}</p>
          <p>Supported features: {features ? JSON.stringify(features) : 'Not checked yet'}</p>
          <p>Window name: {window.name}</p>
          <p>URL parameters: {window.location.search}</p>
          <p>Origin: {window.location.origin}</p>
          <p>Referrer: {document.referrer}</p>
          <p>Is Facebook iFrame: {window !== window.top ? 'Yes' : 'No'}</p>
          <p>Protocol: {window.location.protocol}</p>
          <p>SDK Ready: {sdkReady ? 'Yes' : 'No'}</p>
        </div>
      </header>
    </div>
  );
}

export default App;