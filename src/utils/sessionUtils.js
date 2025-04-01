export const TIMEOUT_MINUTES = 20;

export const validateSession = (timestamp) => {
  if (!timestamp || isNaN(timestamp)) {
    console.error('Invalid timestamp:', timestamp);
    return false;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime < timestamp) {
    console.error('Timestamp is in the future');
    return false;
  }

  const timeDiffMinutes = Math.floor((currentTime - timestamp) / 60);
  console.log('Time validation:', {
    currentTime,
    timestamp,
    timeDiffMinutes,
    isValid: timeDiffMinutes < TIMEOUT_MINUTES
  });

  return timeDiffMinutes < TIMEOUT_MINUTES;
};

export const checkSessionExpiration = async (token, timestamp) => {
  try {
    const response = await fetch(`${process.env.REACT_APP_REDIS_SERVER_URL}/session/${token}/${timestamp}`);
    const data = await response.json();
    if (data && data.timestamp) {
      sessionStorage.setItem('redisTimestamp', data.timestamp);
      console.log('Redis timestamp in sessionStorage:', sessionStorage.getItem('redisTimestamp'));
    }
    return data.isExpired;
  } catch (error) {
    console.error('Error checking session expiration:', error);
    return true;
  }
};

export const validateRedisTimestamp = () => {
  const storedTimestamp = sessionStorage.getItem('redisTimestamp');
  if (storedTimestamp) {
    const currentTime = Math.floor(Date.now() / 1000);
    const redisTime = parseInt(storedTimestamp);
    
    console.log('Time validation on submit:', {
      currentTime,
      redisTimestamp: redisTime,
      isExpired: currentTime >= redisTime
    });

    return currentTime < redisTime;
  }
  return false;
}; 