// Utility functions for Messenger Platform

export const checkMessengerSDK = () => {
  return new Promise((resolve) => {
    if (!window.MessengerExtensions) {
      console.warn('MessengerExtensions not available in window object');
      resolve({
        available: false,
        context: null,
        error: 'MessengerExtensions not available'
      });
      return;
    }

    // First check if we're running in Messenger
    if (window.name !== "messenger_ref" && window.name !== "facebook_ref") {
      resolve({
        available: false,
        context: null,
        error: 'Not running in Messenger webview'
      });
      return;
    }

    // Check if Messenger Extensions are properly loaded
    window.MessengerExtensions.getSupportedFeatures((feature_list) => {
      console.log("Supported features:", feature_list);
      
      window.MessengerExtensions.getContext('415798671014705',  // Facebook App ID
        function success(context) {
          console.log('Messenger context:', context);
          resolve({
            available: true,
            context: context,
            error: null
          });
        },
        function error(err) {
          console.error('Failed to get Messenger context:', err);
          resolve({
            available: false,
            context: null,
            error: err
          });
        }
      );
    });
  });
};

export const closeWebView = () => {
  return new Promise((resolve, reject) => {
    if (!window.MessengerExtensions) {
      reject(new Error('MessengerExtensions not available'));
      return;
    }

    window.MessengerExtensions.requestCloseBrowser(
      function success() {
        console.log("Webview closed successfully");
        resolve();
      },
      function error(err) {
        console.error("Failed to close webview:", err);
        reject(err);
      }
    );
  });
};

// Initialize Messenger extensions
export const initializeMessenger = () => {
  return new Promise((resolve) => {
    const checkSDK = async () => {
      try {
        const sdkStatus = await checkMessengerSDK();
        if (sdkStatus.available) {
          console.log('Messenger SDK initialized successfully');
          resolve(true);
        } else {
          console.error('Messenger SDK not available:', sdkStatus.error);
          resolve(false);
        }
      } catch (error) {
        console.error('Failed to initialize Messenger:', error);
        resolve(false);
      }
    };

    // If SDK is already loaded, check immediately
    if (window.MessengerExtensions) {
      checkSDK();
    } else {
      // Wait for SDK to load
      window.addEventListener('MessengerSDKLoaded', checkSDK);
      // Set a timeout in case SDK fails to load
      setTimeout(() => {
        console.error('Messenger SDK load timeout');
        resolve(false);
      }, 5000);
    }
  });
}; 