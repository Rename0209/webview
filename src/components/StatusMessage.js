import React from 'react';

const StatusMessage = ({ type }) => {
  const messages = {
    loading: (
      <div className="loading-screen">
        <div className="loading-content"></div>
      </div>
    ),
    expired: (
      <div className="form-container">
        <div className="timeout-warning">
          Your session has expired. Please try again.
        </div>
      </div>
    ),
    success: (
      <div className="form-container">
        <div className="success-message">
          Address already confirmed. Thank you!
        </div>
      </div>
    )
  };

  return messages[type] || null;
};

export default StatusMessage; 