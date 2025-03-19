import React, { useEffect, useState } from 'react';
import './App.css';
import { MESSENGER_CONFIG } from './config';

function App() {
  const [psid, setPsid] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Define handler for when SDK is ready
    window.onMessengerExtensionsReady = function() {
      console.log('Messenger Extensions SDK is ready');
      // Check if MessengerExtensions is available
      if (window.MessengerExtensions) {
        window.MessengerExtensions.getContext('621815067674939', 
          function success(thread_context) {
            console.log("Lấy thành công PSID:", thread_context.psid);
            setPsid(thread_context.psid);
          },
          function error(err) {
            console.error("Lỗi khi lấy PSID:", err);
            setError('Không thể lấy được PSID. Vui lòng đảm bảo bạn đang truy cập qua Messenger.');
          }
        );
      } else {
        setError('Messenger Extensions SDK không khả dụng. Vui lòng truy cập qua Messenger.');
      }
    };

    // If SDK is already loaded, call the handler directly
    if (window.MessengerExtensions) {
      window.onMessengerExtensionsReady();
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