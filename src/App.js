import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Get token from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    
    if (tokenParam) {
      console.log("Token found in URL:", tokenParam);
      setToken(tokenParam);
    } else {
      console.log("No token found in URL parameters");
      setError("No token found in URL parameters");
    }
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <div>
          {token ? (
            <div>
              <p>Token: {token}</p>
              <p style={{ fontSize: '0.8em', color: '#666' }}>
                This token will be decrypted later to get the PSID
              </p>
            </div>
          ) : (
            <p style={{ color: 'red' }}>Error: {error || 'No token available'}</p>
          )}
        </div>
        <div className="debug-info">
          <p>URL parameters: {window.location.search}</p>
          <p>Origin: {window.location.origin}</p>
          <p>Referrer: {document.referrer}</p>
          <p>User Agent: {window.navigator.userAgent}</p>
        </div>
      </header>
    </div>
  );
}

export default App;