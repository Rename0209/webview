import React, { useEffect, useState } from 'react';
import './App.css';
import { MESSENGER_CONFIG } from './config';

function App() {
  const [psid, setPsid] = useState(null);
  const [error, setError] = useState(null);
  const APP_ID = '415798671014705';

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
          // If we can't check permissions, try asking for them directly
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
          let permissions = permission_response.permissions; // list of all permissions granted
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
        ['user_profile', 'user_messaging'] // Request both standard permissions
      );
    }
  };

  const getContext = () => {
    if (window.MessengerExtensions) {
      try {
        window.MessengerExtensions.getContext(APP_ID,
          function success(thread_context) {
            console.log("Got thread context:", thread_context);
            if (thread_context.psid) {
              console.log("Found PSID:", thread_context.psid);
              setPsid(thread_context.psid);
            } else {
              console.log("No PSID in context:", thread_context);
              setError('PSID not found in context. Please ensure you have the correct permissions.');
              // Check permissions before requesting again
              checkPermissions();
            }
          },
          function error(err) {
            console.error("getContext error details:", err);
            let errorMessage = 'Error getting PSID: ';
            if (err.code === -32603) {
              errorMessage += 'Internal error. Please ensure:\n';
              errorMessage += '1. You are opening this through a Messenger button\n';
              errorMessage += '2. Your domain (webview-lzgr.onrender.com) is whitelisted\n';
              errorMessage += '3. The button is configured with messenger_extensions: true';
              // Check permissions on internal error
              checkPermissions();
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
    }
  };

  useEffect(() => {
    console.log('Component mounted, checking for MessengerExtensions...');
    
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
              Is Facebook frame: {Boolean(window.location.search.includes('fb_iframe_origin'))}
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
              Is Facebook frame: {Boolean(window.location.search.includes('fb_iframe_origin'))}
            </p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App; 