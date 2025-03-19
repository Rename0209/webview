import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [psid, setPsid] = useState(null);

  useEffect(() => {
    // Check if we're in a Messenger WebView
    if (window.MessengerExtensions) {
      // Request the user's PSID
      window.MessengerExtensions.getContext('facebook', function success(thread_context) {
        setPsid(thread_context.psid);
      }, function error(err) {
        console.error('Error getting PSID:', err);
      });
    }
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Messenger WebView</h1>
        {psid ? (
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