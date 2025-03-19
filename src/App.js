import React, { useEffect, useState } from 'react';
import './App.css';
import { MESSENGER_CONFIG } from './config';

function App() {
  const [psid, setPsid] = useState(null);
  const [error, setError] = useState(null);
  const APP_ID = '415798671014705';

  useEffect(() => {
    console.log('Component mounted, checking for MessengerExtensions...');
    
    // Define handler for when SDK is ready
    window.onMessengerExtensionsReady = function() {
      console.log('Messenger Extensions SDK is ready');
      // Check if MessengerExtensions is available
      if (window.MessengerExtensions) {
        console.log('MessengerExtensions found, getting context...');
        window.MessengerExtensions.getContext(APP_ID, 
          function success(thread_context) {
            console.log("Got thread context:", thread_context);
            if (thread_context.psid) {
              console.log("Found PSID:", thread_context.psid);
              setPsid(thread_context.psid);
            } else {
              console.log("No PSID in context:", thread_context);
              setError('PSID not found in context. Make sure you have the correct permissions.');
            }
          },
          function error(err) {
            console.error("getContext error details:", err);
            setError(`Error getting PSID: ${err.message || 'Unknown error'}. Make sure you are accessing through Messenger with messenger_extensions=true in URL.`);
          }
        );
      } else {
        console.error('MessengerExtensions not found in window object');
        setError('Messenger Extensions SDK not available. Please access through Messenger with messenger_extensions=true in URL.');
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
      console.log('Component unmounting, cleaning up...');
      window.onMessengerExtensionsReady = null;
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Messenger WebView</h1>
        {error ? (
          <div className="error">
            <p>{error}</p>
            <small>App ID: {APP_ID}</small>
            <p className="debug-info">
              MessengerExtensions available: {window.MessengerExtensions ? 'Yes' : 'No'}<br/>
              Window name: {window.name}<br/>
              URL parameters: {window.location.search}
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
              URL parameters: {window.location.search}
            </p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App; 