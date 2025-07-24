import axios from 'axios';
import { apiCache, createCachedApi, generateCacheKey } from './apiCache';

// Create axios instance with default configuration
const apiClient = axios.create();

// Add request interceptor to include bearer token and update activity time
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const accessToken = localStorage.getItem("LMS_access_token");
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    } catch (error: any) {
      console.error("Error getting session data from localStorage in request interceptor:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token expiration and update activity time
apiClient.interceptors.response.use(
  (response) => {
    // Update last activity time only if response status is 200
    if (response.status === 200) {
      // Update last activity time in localStorage
      try {
        localStorage.setItem("LMS_lastActivityTime", Date.now().toString());
      } catch (error) {
        console.error("Error updating last activity time:", error);
      }
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired, invalid, or forbidden - navigate to login page
      console.warn(`⚠️ ${error.response?.status} Unauthorized/Forbidden error - navigating to login`);
      
      // Clear session data
      sessionStorage.clear();
      localStorage.removeItem("LMS_access_token");
      localStorage.removeItem("LMS_StudentId");
      localStorage.removeItem("LMS_CourseId");
      localStorage.removeItem("LMS_BatchId");
      localStorage.removeItem("LMS_Email");
      localStorage.removeItem("LMS_Name");
      localStorage.removeItem("LMS_Picture");
      localStorage.removeItem("LMS_timestamp");
      localStorage.removeItem("LMS_lastActivityTime");
      
      // Navigate to login page
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Function to wrap axios with activity tracking
export const createAxiosWithActivityTracking = () => {
  const axiosInstance = axios.create();
  
  axiosInstance.interceptors.request.use(
    async (config) => {
      try {
        const accessToken = localStorage.getItem("LMS_access_token");
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
      } catch (error: any) {
        console.error("Error getting session data from localStorage in custom request interceptor:", error);
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  axiosInstance.interceptors.response.use(
    (response) => {
      // Update last activity time only if response status is 200
      if (response.status === 200) {
        // Update last activity time in localStorage
        try {
          localStorage.setItem("LMS_lastActivityTime", Date.now().toString());
        } catch (error) {
          console.error("Error updating last activity time:", error);
        }
      }
      return response;
    },
    (error) => {
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Token expired, invalid, or forbidden - navigate to login page
        console.warn(`⚠️ ${error.response?.status} Unauthorized/Forbidden error - navigating to login`);
        
        // Clear session data
        sessionStorage.clear();
        localStorage.removeItem("LMS_access_token");
        localStorage.removeItem("LMS_StudentId");
        localStorage.removeItem("LMS_CourseId");
        localStorage.removeItem("LMS_BatchId");
        localStorage.removeItem("LMS_Email");
        localStorage.removeItem("LMS_Name");
        localStorage.removeItem("LMS_Picture");
        localStorage.removeItem("LMS_timestamp");
        localStorage.removeItem("LMS_lastActivityTime");
        
        // Navigate to login page
        window.location.href = '/';
      }
      return Promise.reject(error);
    }
  );
  
  return axiosInstance;
};

// Cached API client for dashboard APIs
export const getCachedApiClient = () => {
  const axiosInstance = createAxiosWithActivityTracking();
  
  return {
    get: async (url: string, config?: any) => {
      const cacheKey = generateCacheKey(url, config?.params);
      
      // Cache all dashboard APIs
      if (!url.includes('/api/studentdashboard/') && !url.includes('/api/student/dashboard/') && !url.includes('/api/dashboard/')) {
        return axiosInstance.get(url, config);
      }
      
      // Check cache first
      const cachedData = apiCache.get(cacheKey);
      if (cachedData !== null) {
        console.log(`📦 Cache hit for dashboard API: ${cacheKey}`);
        return { data: cachedData };
      }
      
      // Fetch from API
      console.log(`🌐 Dashboard API call for: ${cacheKey}`);
      try {
        const response = await axiosInstance.get(url, config);
        apiCache.set(cacheKey, response.data);
        return response;
      } catch (error) {
        console.error(`❌ Dashboard API error for ${cacheKey}:`, error);
        throw error;
      }
    },
    
    post: async (url: string, data?: any, config?: any) => {
      // POST requests are not cached
      return axiosInstance.post(url, data, config);
    },
    
    put: async (url: string, data?: any, config?: any) => {
      // PUT requests are not cached
      return axiosInstance.put(url, data, config);
    },
    
    patch: async (url: string, data?: any, config?: any) => {
      // PATCH requests are not cached
      return axiosInstance.patch(url, data, config);
    },
    
    delete: async (url: string, config?: any) => {
      // DELETE requests are not cached
      return axiosInstance.delete(url, config);
    }
  };
};

// Standardized logout function
export const performLogout = async (studentId: string, isInactivityLogout: boolean = false, forceLogout: boolean = false) => {
  let url = `${process.env.REACT_APP_BACKEND_URL}api/logout/${studentId}`;
  
  // Add path parameters based on logout type
  if (isInactivityLogout) {
    url += '/SESSION_TIMEOUT';
  } else if (forceLogout) {
    url += '/FORCE_LOGOUT';
  } else {
    url += '/'; // Normal logout (button click)
  }
  
  // Get access token from localStorage before clearing session data
  let accessToken = null;
  try {
    accessToken = localStorage.getItem("LMS_access_token");
  } catch (error) {
    console.error("Error getting session data from localStorage:", error);
  }
  
  // Make API call first (if we have access token)
  if (accessToken) {
    try {
      await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
    } catch (error) {
      console.error("Logout API error:", error);
      // API call failed, but we'll still clear session data
    }
  } else {
    console.warn("No access token available for logout API call");
  }
  
  // Clear session data after API call (or if no token available)
  sessionStorage.clear();
  
  // Clear localStorage session data
  try {
    localStorage.removeItem("LMS_access_token");
    localStorage.removeItem("LMS_StudentId");
    localStorage.removeItem("LMS_CourseId");
    localStorage.removeItem("LMS_BatchId");
    localStorage.removeItem("LMS_Email");
    localStorage.removeItem("LMS_Name");
    localStorage.removeItem("LMS_Picture");
    localStorage.removeItem("LMS_timestamp");
    localStorage.removeItem("LMS_lastActivityTime");
  } catch (error) {
    console.error("Error clearing localStorage session:", error);
  }
  
  // Clear all API cache on logout
  apiCache.clear();
};

// Function to get the API client
export const getApiClient = () => {
  return apiClient;
};

// Export the original apiClient for backward compatibility
export default apiClient; 