import React, { useEffect, useState } from 'react';
import './App.css';
import { MESSENGER_CONFIG } from './config';

function App() {
  const [psid, setPsid] = useState(null);
  const [error, setError] = useState(null);
  const { APP_ID } = MESSENGER_CONFIG;

  const checkPermissions = () => {
    if (window.MessengerExtensions) {
      window.MessengerExtensions.getGrantedPermissions(
        function(permission_response) {
          console.log("Current permissions:", permission_response.permissions);
          const hasUserProfile = permission_response.permissions.includes('user_profile');
          if (!hasUserProfile) {
            console.log("user_profile permission not found, requesting...");
            askPermission();
          } else {
            console.log("user_profile permission already granted");
            getContext();
          }
        },
        function(error) {
          console.error("Error checking permissions:", error);
          askPermission();
        }
      );
    }
  };

  const askPermission = () => {
    if (window.MessengerExtensions) {
      window.MessengerExtensions.askPermission(
        function(permission_response) {
          console.log("Permission response:", permission_response);
          let permissions = permission_response.permissions;
          let isGranted = permission_response.isGranted;
          
          if (isGranted) {
            console.log("Permissions granted:", permissions);
            getContext();
          } else {
            console.log("Permissions denied:", permissions);
            setError('Permissions not granted. Please allow access to continue.');
          }
        },
        function(error) {
          console.error("Error asking permission:", error);
          setError('Error requesting permissions: ' + (error.message || 'Unknown error'));
        },
        APP_ID,
        ['user_profile', 'user_messaging']
      );
    }
  };

  const getContext = () => {
    if (!window.MessengerExtensions) {
      console.error('MessengerExtensions not available');
      return;
    }

    // Try to parse the signed request if available
    const urlParams = new URLSearchParams(window.location.search);
    const signedRequest = urlParams.get('signed_request');
    if (signedRequest) {
      console.log("Found signed_request in URL");
    }

    try {
      console.log("Attempting to get context with APP_ID:", APP_ID);
      window.MessengerExtensions.getContext(
        APP_ID,
        function success(thread_context) {
          console.log("Got thread context:", thread_context);
          if (thread_context.psid) {
            console.log("Found PSID:", thread_context.psid);
            setPsid(thread_context.psid);
          } else {
            console.log("No PSID in context:", thread_context);
            // Try alternative method using signed request
            if (signedRequest) {
              console.log("Attempting to use signed_request");
              // You might need to implement signed request handling here
            } else {
              setError('PSID not found in context. Please ensure you have the correct permissions.');
              checkPermissions();
            }
          }
        },
        function error(err) {
          console.error("getContext error details:", err);
          let errorMessage = 'Error getting PSID: ';
          if (err.code === -32603) {
            console.log("Received -32603 error, checking environment...");
            const fbFrame = window.location.search.includes('fb_iframe_origin');
            const inMessenger = window.name === 'messenger_ref' || window.name === 'facebook_ref';
            
            errorMessage += `Internal error (-32603).\n`;
            errorMessage += `Debug Info:\n`;
            errorMessage += `- In Facebook Frame: ${fbFrame}\n`;
            errorMessage += `- In Messenger: ${inMessenger}\n`;
            errorMessage += `- Window Name: ${window.name}\n`;
            errorMessage += `\nPlease ensure:\n`;
            errorMessage += `1. You are opening this through a Messenger button\n`;
            errorMessage += `2. Your domain (${window.location.origin}) is whitelisted\n`;
            errorMessage += `3. The button has messenger_extensions: true\n`;
            errorMessage += `4. You are using HTTPS\n`;
            
            // Try to reinitialize if in iframe
            if (fbFrame && !window.name.includes('messenger')) {
              window.name = 'messenger_ref';
              console.log("Set window.name to messenger_ref, retrying...");
              setTimeout(checkPermissions, 1000);
            }
          } else {
            errorMessage += err.message || 'Unknown error';
          }
          setError(errorMessage);
        }
      );
    } catch (e) {
      console.error('Error calling getContext:', e);
      setError('Failed to call getContext: ' + e.message);
    }
  };

  useEffect(() => {
    console.log('Component mounted, checking for MessengerExtensions...');
    console.log('Window name:', window.name);
    console.log('URL:', window.location.href);
    console.log('Referrer:', document.referrer);
    
    // Check if we're in the correct context
    const isMessengerPlatform = window.name === 'messenger_ref' || 
                               window.name === 'facebook_ref' ||
                               /messenger/i.test(window.name) ||
                               document.referrer.includes('facebook.com') ||
                               window.location.search.includes('fb_iframe_origin');
    
    if (!isMessengerPlatform) {
      setError('This page must be opened through Facebook Messenger.');
      return;
    }

    // Define handler for when SDK is ready
    window.onMessengerExtensionsReady = function() {
      console.log('Messenger Extensions SDK is ready');
      if (window.MessengerExtensions) {
        console.log('MessengerExtensions found, checking permissions...');
        checkPermissions();
      } else {
        console.error('MessengerExtensions not found in window object');
        setError('Messenger Extensions SDK not available. Please access through a Messenger button.');
      }
    };

    // If SDK is already loaded, call the handler directly
    if (window.MessengerExtensions) {
      console.log('MessengerExtensions already available, calling handler...');
      window.onMessengerExtensionsReady();
    } else {
      console.log('Waiting for MessengerExtensions to load...');
    }

    // Cleanup
    return () => {
      window.onMessengerExtensionsReady = null;
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Messenger WebView</h1>
        {error ? (
          <div className="error">
            <p style={{ whiteSpace: 'pre-line' }}>{error}</p>
            <small>App ID: {APP_ID}</small>
            <button 
              onClick={checkPermissions}
              style={{ 
                margin: '10px 0',
                padding: '8px 16px',
                backgroundColor: '#0084ff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Check & Request Permissions
            </button>
            <p className="debug-info">
              MessengerExtensions available: {window.MessengerExtensions ? 'Yes' : 'No'}<br/>
              Window name: {window.name}<br/>
              URL parameters: {window.location.search}<br/>
              Origin: {window.location.origin}<br/>
              Referrer: {document.referrer}<br/>
              Is Facebook frame: {Boolean(window.location.search.includes('fb_iframe_origin'))}<br/>
              Protocol: {window.location.protocol}
            </p>
          </div>
        ) : psid ? (
          <div>
            <h2>Your PSID:</h2>
            <p>{psid}</p>
            <small>App ID: {APP_ID}</small>
          </div>
        ) : (
          <div>
            <p>Loading PSID...</p>
            <small>App ID: {APP_ID}</small>
            <p className="debug-info">
              MessengerExtensions available: {window.MessengerExtensions ? 'Yes' : 'No'}<br/>
              Window name: {window.name}<br/>
              URL parameters: {window.location.search}<br/>
              Origin: {window.location.origin}<br/>
              Referrer: {document.referrer}<br/>
              Is Facebook frame: {Boolean(window.location.search.includes('fb_iframe_origin'))}<br/>
              Protocol: {window.location.protocol}
            </p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App; 