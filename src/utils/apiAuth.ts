import axios from "axios";

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
      console.error(
        "Error getting session data from localStorage in request interceptor:",
        error
      );
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
      console.warn(
        `⚠️ ${error.response?.status} Unauthorized/Forbidden error - navigating to login`
      );

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
      window.location.href = "/";
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
        console.error(
          "Error getting session data from localStorage in custom request interceptor:",
          error
        );
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
        console.warn(
          `⚠️ ${error.response?.status} Unauthorized/Forbidden error - navigating to login`
        );

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
        window.location.href = "/";
      }
      return Promise.reject(error);
    }
  );

  return axiosInstance;
};

// Standardized logout function
export const performLogout = async (
  studentId: string,
  isInactivityLogout: boolean = false,
  forceLogout: boolean = false
) => {
  let url = `${process.env.REACT_APP_BACKEND_URL}api/logout/${studentId}`;

  // Add path parameters based on logout type
  if (isInactivityLogout) {
    url += "/SESSION_TIMEOUT";
  } else if (forceLogout) {
    url += "/FORCE_LOGOUT";
  } else {
    url += "/"; // Normal logout (button click)
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
          Authorization: `Bearer ${accessToken}`,
        },
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
};

// Helper function to get the default API client with authorization
export const getApiClient = () => {
  return apiClient;
};

// Function to reset backend API timer when any backend API is called
export const resetBackendApiTimer = () => {
  if (typeof window !== "undefined" && (window as any).resetBackendApiTimer) {
    (window as any).resetBackendApiTimer();
  }
};

// Add interceptor to automatically reset backend API timer for all backend API calls
const originalGet = apiClient.get;
const originalPost = apiClient.post;
const originalPut = apiClient.put;
const originalPatch = apiClient.patch;
const originalDelete = apiClient.delete;

// Intercept all HTTP methods to reset backend API timer
const createInterceptor = (originalMethod: any) => {
  return function (this: any, ...args: any[]) {
    const url = args[0];
    // Check if the URL is from REACT_APP_BACKEND_URL
    if (
      url &&
      typeof url === "string" &&
      url.includes(process.env.REACT_APP_BACKEND_URL || "")
    ) {
      resetBackendApiTimer();
    }
    return originalMethod.apply(this, args);
  };
};

// Apply interceptors
apiClient.get = createInterceptor(originalGet);
apiClient.post = createInterceptor(originalPost);
apiClient.put = createInterceptor(originalPut);
apiClient.patch = createInterceptor(originalPatch);
apiClient.delete = createInterceptor(originalDelete);

export default apiClient;
