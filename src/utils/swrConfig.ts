import useSWR, { SWRConfiguration } from 'swr';
import { getApiClient } from './apiAuth';

// Custom fetcher for API calls with authentication
const fetcher = async (url: string) => {
  const response = await getApiClient().get(url);
  return response.data;
};

// Global SWR configuration for dashboard APIs
export const swrConfig: SWRConfiguration = {
  refreshInterval: 2 * 60 * 1000, // 2 minutes
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 2 * 60 * 1000, // 2 minutes
  errorRetryCount: 3,
  errorRetryInterval: 5000,
};

// Custom hook for dashboard APIs with SWR
export const useDashboardSWR = <T>(url: string | null) => {
  return useSWR<T>(
    url,
    fetcher,
    {
      ...swrConfig,
      // Only cache dashboard APIs
      isPaused: () => !url?.includes('/api/studentdashboard/'),
    }
  );
};

// Export the base useSWR for other use cases
export { useSWR };
export default fetcher; 