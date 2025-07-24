interface CacheItem {
  data: any;
  timestamp: number;
  ttl: number;
}

class ApiCache {
  private cache: Map<string, CacheItem> = new Map();
  private defaultTTL: number = 2 * 60 * 1000; // 2 minutes in milliseconds

  /**
   * Check if the URL is a dashboard API
   */
  private isDashboardApi(url: string): boolean {
    // Cache all dashboard APIs
    const dashboardPatterns = [
      '/api/studentdashboard/',
      '/api/student/dashboard/',
      '/api/dashboard/'
    ];
    return dashboardPatterns.some(pattern => url.includes(pattern));
  }

  /**
   * Get cached data if it exists and is not expired
   */
  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    const now = Date.now();
    const isExpired = now - item.timestamp > item.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Set data in cache with TTL (only for dashboard APIs)
   */
  set(key: string, data: any, ttl?: number): void {
    // Only cache dashboard APIs
    if (!this.isDashboardApi(key)) {
      return;
    }

    const cacheTTL = ttl || this.defaultTTL;
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: cacheTTL
    });
  }

  /**
   * Clear specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clean expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned ${cleanedCount} expired cache entries. Remaining: ${this.cache.size}`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create a singleton instance
export const apiCache = new ApiCache();

// Cleanup expired entries every 2 minutes
setInterval(() => {
  apiCache.cleanup();
}, 2 * 60 * 1000);

/**
 * Create a cached API function (only for dashboard APIs)
 */
export function createCachedApi<T>(
  apiFunction: () => Promise<T>,
  cacheKey: string,
  ttl?: number
): () => Promise<T> {
  return async (): Promise<T> => {
    // Only cache dashboard APIs
    if (!apiCache['isDashboardApi'](cacheKey)) {
      return await apiFunction();
    }

    // Check cache first
    const cachedData = apiCache.get(cacheKey);
    if (cachedData !== null) {
      console.log(`📦 Cache hit for dashboard API: ${cacheKey}`);
      return cachedData;
    }

    // Fetch from API
    console.log(`🌐 Dashboard API call for: ${cacheKey}`);
    try {
      const data = await apiFunction();
      apiCache.set(cacheKey, data, ttl);
      return data;
    } catch (error) {
      console.error(`❌ Dashboard API error for ${cacheKey}:`, error);
      throw error;
    }
  };
}

/**
 * Generate cache key from URL and parameters
 */
export function generateCacheKey(url: string, params?: Record<string, any>): string {
  if (!params) {
    return url;
  }
  
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  return `${url}?${sortedParams}`;
}

/**
 * Clear cache for specific patterns
 */
export function clearCacheByPattern(pattern: string): void {
  for (const key of apiCache['cache'].keys()) {
    if (key.includes(pattern)) {
      apiCache.delete(key);
    }
  }
}

/**
 * Clear mycourses cache
 */
export function clearMycoursesCache(): void {
  clearCacheByPattern('/api/studentdashboard/mycourses/');
}

/**
 * Clear all dashboard cache
 */
export function clearDashboardCache(): void {
  clearCacheByPattern('/api/studentdashboard/');
}

export default apiCache; 