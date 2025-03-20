// Utility functions for Messenger Platform

export const checkMessengerSDK = () => {
  return new Promise((resolve) => {
    if (window.MessengerExtensions) {
      // Check if Messenger Extensions are properly loaded
      window.MessengerExtensions.getContext('415798671014705',  // Facebook App ID
        function success(context) {
          resolve({
            available: true,
            context: context,
            error: null
          });
        },
        function error(err) {
          resolve({
            available: false,
            context: null,
            error: err
          });
        }
      );
    } else {
      resolve({
        available: false,
        context: null,
        error: 'MessengerExtensions not available'
      });
    }
  });
};

export const configureWebView = () => {
  // Remove mobile-specific constraints
  if (window.MessengerExtensions) {
    window.MessengerExtensions.requestCloseBrowser(
      function success() {
        console.log("Webview closed");
      },
      function error(err) {
        console.error("Failed to close webview", err);
      }
    );
  }
};

// Initialize Messenger extensions
export const initializeMessenger = async () => {
  try {
    const sdkStatus = await checkMessengerSDK();
    if (!sdkStatus.available) {
      console.error('Messenger Extensions are not available:', sdkStatus.error);
      return false;
    }

    // Set up any additional configurations here
    window.extAsyncInit = function() {
      // Messenger Extensions JS SDK is done loading
      console.log('Messenger Extensions initialized');
    };

    return true;
  } catch (error) {
    console.error('Failed to initialize Messenger:', error);
    return false;
  }
}; 