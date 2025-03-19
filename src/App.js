import React, { useEffect, useState } from 'react';
import './App.css';
import { MESSENGER_CONFIG } from './config';

function App() {
  const [psid, setPsid] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Wait for SDK to be ready
    window.extAsyncInit = function() {
      // Check if MessengerExtensions is available
      if (window.MessengerExtensions) {
        window.MessengerExtensions.getContext('415798671014705', 
          function success(thread_context) {
            // success
            console.log("Success! Got user context:", thread_context);
            setPsid(thread_context.psid);
          },
          function error(err) {
            // error
            console.error("Failed to get context:", err);
            setError('Failed to get PSID. Please make sure you are accessing this through Messenger.');
          }
        );
      } else {
        setError('Messenger Extensions SDK not available. Please access this through Messenger.');
      }
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Messenger WebView</h1>
        {error ? (
          <div className="error">
            <p>{error}</p>
          </div>
        ) : psid ? (
          <div>
            <h2>Your PSID:</h2>
            <p>{psid}</p>
          </div>
        ) : (
          <p>Loading PSID...</p>
        )}
      </header>
    </div>
  );
}

export default App; 