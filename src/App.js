import React, { useEffect, useState } from 'react';
import './App.css';
import { MESSENGER_CONFIG } from './config';

function App() {
  const [psid, setPsid] = useState(null);
  const [error, setError] = useState(null);
  const APP_ID = '415798671014705';

  useEffect(() => {
    console.log('Component mounted, checking for MessengerExtensions...');
    
    // Check if we're in the correct context
    const isMessengerPlatform = window.name === 'messenger_ref' || 
                               window.name === 'facebook_ref' ||
                               /messenger/i.test(window.name);
    
    if (!isMessengerPlatform) {
      setError('This page must be opened through Facebook Messenger.');
      return;
    }

    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.get('messenger_extensions')) {
      setError('Missing messenger_extensions=true in URL parameters.');
      return;
    }

    // Define handler for when SDK is ready
    window.onMessengerExtensionsReady = function() {
      console.log('Messenger Extensions SDK is ready');
      if (window.MessengerExtensions) {
        console.log('MessengerExtensions found, getting context...');
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
              }
            },
            function error(err) {
              console.error("getContext error details:", err);
              let errorMessage = 'Error getting PSID: ';
              if (err.code === -32603) {
                errorMessage += 'Internal error. Please ensure:\n';
                errorMessage += '1. You are opening this through Messenger\n';
                errorMessage += '2. Your domain is whitelisted in the app settings\n';
                errorMessage += '3. You have messenger_extensions=true in the URL';
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
      } else {
        console.error('MessengerExtensions not found in window object');
        setError('Messenger Extensions SDK not available. Please access through Messenger.');
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
            <p className="debug-info">
              MessengerExtensions available: {window.MessengerExtensions ? 'Yes' : 'No'}<br/>
              Window name: {window.name}<br/>
              URL parameters: {window.location.search}<br/>
              Origin: {window.location.origin}<br/>
              Referrer: {document.referrer}
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
              Referrer: {document.referrer}
            </p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App; 