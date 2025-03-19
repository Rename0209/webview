import React, { useEffect, useState, useCallback } from 'react';
import './App.css';
import { MESSENGER_CONFIG } from './config';

function App() {
  const [psid, setPsid] = useState(null);
  const [error, setError] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const { APP_ID } = MESSENGER_CONFIG;

  const waitForMessengerExtensions = useCallback(() => {
    return new Promise((resolve) => {
      const checkSDK = () => {
        if (window.MessengerExtensions) {
          resolve(true);
        } else {
          setTimeout(checkSDK, 100);
        }
      };
      checkSDK();
    });
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

  const getContext = useCallback(async () => {
    console.log("Getting context...");
    try {
      const context = await callSDKMethod('getContext', APP_ID);
      console.log("Context success:", context);
      setPsid(context.psid);
    } catch (error) {
      console.error("Context error:", error);
      if (error.code === -32603) {
        console.log("Received RPC error, checking permissions...");
        await checkPermissions();
      } else {
        setError(`Failed to get context: ${JSON.stringify(error)}`);
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
        await getContext();
      }
    } catch (error) {
      console.error("Permission check failed:", error);
      await askPermission();
    }
  }, [callSDKMethod, getContext]);

  const askPermission = useCallback(async () => {
    console.log("Requesting user_profile permission...");
    try {
      const success = await callSDKMethod('askPermission', 'user_profile');
      console.log("Permission granted:", success);
      await getContext();
    } catch (error) {
      console.error("Permission request failed:", error);
      setError(`Permission request failed: ${JSON.stringify(error)}`);
    }
  }, [callSDKMethod, getContext]);

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
        // Wait for SDK to be available
        await waitForMessengerExtensions();
        console.log("MessengerExtensions found, initializing...");

        // Initialize with proper error handling
        const initResult = await new Promise((resolve, reject) => {
          if (typeof window.MessengerExtensions.init !== 'function') {
            console.error("init is not a function, trying alternative initialization");
            // Try alternative initialization
            if (window.MessengerExtensions && window.MessengerExtensions.getContext) {
              resolve(true);
            } else {
              reject(new Error("MessengerExtensions.init not available"));
            }
          } else {
            window.MessengerExtensions.init(APP_ID, resolve, reject);
          }
        });

        console.log("Init result:", initResult);
        setSdkReady(true);

        // Check initial permissions
        await checkPermissions();
      } catch (e) {
        console.error("Initialization failed:", e);
        setError(`Initialization failed: ${e.message}`);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Start initialization immediately if we're in the right frame
    if (window.name === 'facebook_ref') {
      initMessenger();
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [APP_ID, checkPermissions, waitForMessengerExtensions]);

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