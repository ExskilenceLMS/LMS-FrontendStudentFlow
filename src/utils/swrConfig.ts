import useSWR, { SWRConfiguration } from 'swr';
import { getApiClient } from './apiAuth';

const API_TTL_CONFIG = {
  '/api/studentdashboard/summary/': 5 * 60 * 1000, // 5 mins
  '/api/studentdashboard/mycourses/': 60 * 60 * 1000, // 1 hour
  '/api/studentdashboard/weeklyprogress/': 2 * 60 * 1000, // 2 mins
  '/api/studentdashboard/hourspent/': 5 * 60 * 1000, // 5 mins
  '/api/studentdashboard/upcomming/sessions/': 60 * 60 * 1000, // 1 hour
  '/api/studentdashboard/upcomming/events/': 3 * 60 * 60 * 1000, // 3 hours
  '/api/studentdashboard/event/calender/': 24 * 60 * 60 * 1000, // 1 day
  '/api/studentdashboard/activity/': 2 * 60 * 1000,
  '/api/studentdashboard/calendar/': 2 * 60 * 1000,
  '/api/studentdashboard/devicesessions/': 2 * 60 * 1000,
  '/api/student/testdetails/': 60 * 60 * 1000, // 1 hour
  '/api/student/test/': 60 * 60 * 1000,
  '/api/student/test/instruction/': 60 * 60 * 1000, // 1 hour
  '/api/student/test/section/': 60 * 60 * 1000, // 1 hour
  '/api/student/subject/': 30 * 60 * 1000, // 30 minutes
  '/api/student/lessons/': 30 * 60 * 1000,
  '/api/student/practicecoding/tables/': 24 * 60 * 60 * 1000, // 1 day
  'default': 5 * 60 * 1000
};

const fetcher = async (url: string) => {
  const response = await getApiClient().get(url);
  return response.data;
};

const getTTLForAPI = (url: string): number => {
  for (const [pattern, ttl] of Object.entries(API_TTL_CONFIG)) {
    if (url.includes(pattern)) {
      return ttl;
    }
  }
  return API_TTL_CONFIG.default;
};

// localStorage provider for SWR persistence
const localStorageProvider = () => {
  const map = new Map<string, any>();
  
  // Load from localStorage on mount
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('swr-cache');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        for (const [key, value] of Object.entries(parsed)) {
          map.set(key, value);
        }
      } catch (error) {
        console.error('Error parsing SWR cache from localStorage:', error);
      }
    }
  }

  return {
    get: (key: string) => {
      const value = map.get(key);
      if (value && value.timestamp) {
        // Check if data is still valid (not expired)
        const now = Date.now();
        if (now - value.timestamp < value.ttl) {
          return value.data;
        } else {
          // Remove expired data
          map.delete(key);
          return undefined;
        }
      }
      return value;
    },
    set: (key: string, value: any) => {
      const ttl = getTTLForAPI(key);
      map.set(key, {
        data: value,
        timestamp: Date.now(),
        ttl: ttl
      });
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        try {
          const serialized = JSON.stringify(Object.fromEntries(map));
          localStorage.setItem('swr-cache', serialized);
        } catch (error) {
          console.error('Error saving SWR cache to localStorage:', error);
        }
      }
    },
    delete: (key: string) => {
      map.delete(key);
      // Update localStorage
      if (typeof window !== 'undefined') {
        try {
          const serialized = JSON.stringify(Object.fromEntries(map));
          localStorage.setItem('swr-cache', serialized);
        } catch (error) {
          console.error('Error updating SWR cache in localStorage:', error);
        }
      }
    },
    keys: () => {
      return map.keys();
    }
  };
};

export const getSWRConfig = (url: string): SWRConfiguration => {
  const ttl = getTTLForAPI(url);
  const isTablesAPI = url.includes('/api/student/practicecoding/tables/');
  
  return {
    refreshInterval: ttl,
    revalidateOnFocus: isTablesAPI ? true : false, // Always revalidate tables on focus
    revalidateOnReconnect: true,
    dedupingInterval: ttl,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
    revalidateOnMount: true, // Always revalidate on mount
    revalidateIfStale: true, // Always revalidate if stale
    provider: isTablesAPI ? localStorageProvider : undefined, // Only tables API uses localStorage
  };
};

export const useAPISWR = <T>(url: string | null) => {
  const config = url ? getSWRConfig(url) : {};
  return useSWR<T>(url, fetcher, config);
};

export const clearAPICache = (pattern: string) => { console.log(`Cache cleared for pattern: ${pattern}`); };
export const clearAllCache = () => { console.log('All cache cleared'); };
export { useSWR };
export default fetcher; 