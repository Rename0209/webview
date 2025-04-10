export const validateSession = async (token, timestamp, timeoutMinutes = 20) => {
  if (!token || !timestamp || isNaN(timestamp)) {
    return false;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime < timestamp) {
    return false;
  }

  const timeDiff = currentTime - timestamp;
  const timeDiffMinutes = Math.floor(timeDiff / 60);

  return timeDiffMinutes < timeoutMinutes;
};

export const checkSessionExpiration = async (token, timestamp) => {
  try {
    const response = await fetch(`${process.env.REACT_APP_REDIS_SERVER_URL}/session/${token}/${timestamp}`);
    if (!response.ok) {
      throw new Error('Failed to check session expiration');
    }
    const data = await response.json();
    return data; // Return the entire response object containing isExpired and timestamp
  } catch (error) {
    console.error('Session expiration check error:', error);
    return { isExpired: true }; // Return object with isExpired true on error
  }
};

export const fetchExistingAddress = async (token) => {
  try {
    const response = await fetch(`${process.env.REACT_APP_MONGODB_SERVER_URL}/api/address/${token}`);
    if (!response.ok) {
      throw new Error('Failed to fetch address data');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    return null;
  }
};

export const submitAddress = async (formData) => {
  try {
    const response = await fetch(`${process.env.REACT_APP_MONGODB_SERVER_URL}/api/address`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      throw new Error('Failed to submit address data');
    }

    const responseData = await response.json();
    return responseData;
  } catch (error) {
    throw error;
  }
};

export const updateSession = async (token, timestamp) => {
  try {
    await fetch(`${process.env.REACT_APP_REDIS_SERVER_URL}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        timestamp
      })
    });
  } catch (error) {
    throw error;
  }
}; 