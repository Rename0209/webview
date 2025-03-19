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

  const getUserInfo = useCallback(async () => {
    console.log("Getting user info...");
    try {
      // Try getting user ID directly
      const userId = await callSDKMethod('getUserID');
      console.log("User ID success:", userId);
      setPsid(userId);
    } catch (error) {
      console.error("getUserID error:", error);
      setError(`Failed to get user ID: ${JSON.stringify(error)}`);
      
      // If getUserID fails, check permissions
      if (error.code === -32603) {
        console.log("Received RPC error, checking permissions...");
        await checkPermissions();
      }
    }
  }, [callSDKMethod]);

  const checkPermissions = useCallback(async () => {
    console.log("Checking permissions...");
    try {
      const response = await callSDKMethod('getGrantedPermissions');
      console.log("Current permissions:", response);
      if (!response.permissions.includes('user_profile')) {
        await askPermission();
      } else {
        await getUserInfo();
      }
    } catch (error) {
      console.error("Permission check failed:", error);
      await askPermission();
    }
  }, [callSDKMethod, getUserInfo]);

  const askPermission = useCallback(async () => {
    console.log("Requesting user_profile permission...");
    try {
      const success = await callSDKMethod('askPermission', 'user_profile');
      console.log("Permission granted:", success);
      await getUserInfo();
    } catch (error) {
      console.error("Permission request failed:", error);
      setError(`Permission request failed: ${JSON.stringify(error)}`);
    }
  }, [callSDKMethod, getUserInfo]);

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
        console.log("Received RPC message:", event.data.substring('MESSENGER_EXTENSIONS_RPC:'.length));
      }
    };

    const initMessenger = async () => {
      try {
        console.log("MessengerExtensions found, checking methods...");
        
        // Check available methods
        const methods = Object.keys(window.MessengerExtensions || {});
        console.log("Available methods:", methods);

        // Set SDK as ready since init is not needed/available
        setSdkReady(true);

        // Start with permission check
        await checkPermissions();
      } catch (e) {
        console.error("Initialization failed:", e);
        setError(`Initialization failed: ${e.message}`);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Start initialization immediately if we're in the right frame
    if (window.name === 'facebook_ref' && window.MessengerExtensions) {
      initMessenger();
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [APP_ID, checkPermissions]);

  return (
    <div className="App">
      <header className="App-header">
        {psid ? (
          <p>Your User ID: {psid}</p>
        ) : (
          <div>
            <p>Error getting User ID: {error || 'Unknown error'}</p>
            <button onClick={checkPermissions}>
              Check & Request Permissions
            </button>
          </div>
        )}
        <div className="debug-info">
          <p>MessengerExtensions available: {window.MessengerExtensions ? 'Yes' : 'No'}</p>
          <p>MessengerExtensions.getUserID available: {window.MessengerExtensions && typeof window.MessengerExtensions.getUserID === 'function' ? 'Yes' : 'No'}</p>
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