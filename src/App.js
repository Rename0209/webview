import React, { useEffect, useState, useCallback } from 'react';
import './App.css';
import { MESSENGER_CONFIG } from './config';

function App() {
  const [psid, setPsid] = useState(null);
  const [error, setError] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const { APP_ID } = MESSENGER_CONFIG;

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

  const getContextInfo = useCallback(async () => {
    console.log("Getting context info...");
    try {
      // Try getting context directly without any permissions
      const context = await callSDKMethod('getContext', APP_ID);
      console.log("Context success:", context);
      if (context && context.psid) {
        setPsid(context.psid);
      } else {
        setError("Context received but no PSID found");
      }
    } catch (error) {
      console.error("getContext error:", error);
      setError(`Failed to get context: ${JSON.stringify(error)}`);
      
      // Only check permissions if we get a specific error
      if (error.code === -32603) {
        console.log("Received RPC error, checking permissions...");
        await checkPermissions();
      }
    }
  }, [APP_ID, callSDKMethod]);

  const checkPermissions = useCallback(async () => {
    console.log("Checking permissions...");
    try {
      const response = await callSDKMethod('getGrantedPermissions');
      console.log("Current permissions:", response);
      if (!response.permissions.includes('user_profile')) {
        await askPermission();
      } else {
        await getContextInfo();
      }
    } catch (error) {
      console.error("Permission check failed:", error);
      await askPermission();
    }
  }, [callSDKMethod, getContextInfo]);

  const askPermission = useCallback(async () => {
    console.log("Requesting user_profile permission...");
    try {
      const success = await callSDKMethod('askPermission', 'user_profile');
      console.log("Permission granted:", success);
      await getContextInfo();
    } catch (error) {
      console.error("Permission request failed:", error);
      setError(`Permission request failed: ${JSON.stringify(error)}`);
    }
  }, [callSDKMethod, getContextInfo]);

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

    const initMessenger = async () => {
      try {
        console.log("MessengerExtensions found, checking methods...");
        
        // Check available methods
        const methods = Object.keys(window.MessengerExtensions || {});
        console.log("Available methods:", methods);

        // Try getting context first without any initialization
        await getContextInfo();
        
        // Set SDK as ready
        setSdkReady(true);
      } catch (e) {
        console.error("Initialization failed:", e);
        setError(`Initialization failed: ${e.message}`);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Start initialization immediately if we're in the right frame
    if (window.name === 'facebook_ref' && window.MessengerExtensions) {
      // Add a small delay to ensure everything is ready
      setTimeout(initMessenger, 500);
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [APP_ID, getContextInfo]);

  return (
    <div className="App">
      <header className="App-header">
        {psid ? (
          <p>Your PSID: {psid}</p>
        ) : (
          <div>
            <p>Error getting PSID: {error || 'Unknown error'}</p>
            <button onClick={getContextInfo}>
              Try Get Context
            </button>
            <button onClick={checkPermissions} style={{ marginLeft: '10px' }}>
              Check Permissions
            </button>
          </div>
        )}
        <div className="debug-info">
          <p>MessengerExtensions available: {window.MessengerExtensions ? 'Yes' : 'No'}</p>
          <p>MessengerExtensions.getContext available: {window.MessengerExtensions && typeof window.MessengerExtensions.getContext === 'function' ? 'Yes' : 'No'}</p>
          <p>MessengerExtensions.getGrantedPermissions available: {window.MessengerExtensions && typeof window.MessengerExtensions.getGrantedPermissions === 'function' ? 'Yes' : 'No'}</p>
          <p>Available methods: {window.MessengerExtensions ? Object.keys(window.MessengerExtensions).join(', ') : 'None'}</p>
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