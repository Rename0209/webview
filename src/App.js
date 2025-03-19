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

  const getUserContext = useCallback(async () => {
    console.log("Getting user context...");
    try {
      // Try using getUserContext instead of getContext
      const context = await callSDKMethod('getUserContext', APP_ID, 'MESSENGER');
      console.log("User context success:", context);
      setPsid(context.psid);
    } catch (error) {
      console.error("User context error:", error);
      // If getUserContext fails, try the legacy method
      try {
        console.log("Trying legacy context method...");
        const legacyContext = await callSDKMethod('getContext', APP_ID);
        console.log("Legacy context success:", legacyContext);
        setPsid(legacyContext.psid);
      } catch (legacyError) {
        console.error("Legacy context error:", legacyError);
        if (legacyError.code === -32603) {
          console.log("Received RPC error, checking permissions...");
          await checkPermissions();
        } else {
          setError(`Failed to get context: ${JSON.stringify(legacyError)}`);
        }
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
        await getUserContext();
      }
    } catch (error) {
      console.error("Permission check failed:", error);
      await askPermission();
    }
  }, [callSDKMethod, getUserContext]);

  const askPermission = useCallback(async () => {
    console.log("Requesting user_profile permission...");
    try {
      const success = await callSDKMethod('askPermission', 'user_profile');
      console.log("Permission granted:", success);
      await getUserContext();
    } catch (error) {
      console.error("Permission request failed:", error);
      setError(`Permission request failed: ${JSON.stringify(error)}`);
    }
  }, [callSDKMethod, getUserContext]);

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
          <p>Your PSID: {psid}</p>
        ) : (
          <div>
            <p>Error getting PSID: {error || 'Unknown error'}</p>
            <button onClick={checkPermissions}>
              Check & Request Permissions
            </button>
          </div>
        )}
        <div className="debug-info">
          <p>MessengerExtensions available: {window.MessengerExtensions ? 'Yes' : 'No'}</p>
          <p>MessengerExtensions.init available: {window.MessengerExtensions && typeof window.MessengerExtensions.init === 'function' ? 'Yes' : 'No'}</p>
          <p>MessengerExtensions.getContext available: {window.MessengerExtensions && typeof window.MessengerExtensions.getContext === 'function' ? 'Yes' : 'No'}</p>
          <p>MessengerExtensions.getUserContext available: {window.MessengerExtensions && typeof window.MessengerExtensions.getUserContext === 'function' ? 'Yes' : 'No'}</p>
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