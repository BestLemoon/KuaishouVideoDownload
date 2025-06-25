/**
 * API调用优化工具
 * 提供防抖、缓存、去重等功能来减少不必要的API调用
 */

// 请求缓存接口
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

// 内存缓存存储
const memoryCache = new Map<string, CacheItem<any>>();

// 正在进行的请求存储（防止重复请求）
const pendingRequests = new Map<string, Promise<any>>();

/**
 * 防抖函数
 * @param func 要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * 节流函数
 * @param func 要节流的函数
 * @param delay 节流间隔（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

/**
 * 带缓存的API调用
 * @param key 缓存键
 * @param fetcher 获取数据的函数
 * @param ttl 缓存时间（毫秒），默认5分钟
 * @returns Promise<T>
 */
export async function cachedApiCall<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000 // 默认5分钟
): Promise<T> {
  const now = Date.now();
  
  // 检查内存缓存
  const cached = memoryCache.get(key);
  if (cached && now < cached.expiry) {
    return cached.data;
  }
  
  // 检查是否有正在进行的相同请求
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }
  
  // 创建新的请求
  const promise = fetcher().then((data) => {
    // 缓存结果
    memoryCache.set(key, {
      data,
      timestamp: now,
      expiry: now + ttl
    });
    
    // 清除pending状态
    pendingRequests.delete(key);
    
    return data;
  }).catch((error) => {
    // 请求失败时也要清除pending状态
    pendingRequests.delete(key);
    throw error;
  });
  
  // 记录正在进行的请求
  pendingRequests.set(key, promise);
  
  return promise;
}

/**
 * 清除指定缓存
 * @param key 缓存键，如果不提供则清除所有缓存
 */
export function clearCache(key?: string): void {
  if (key) {
    memoryCache.delete(key);
  } else {
    memoryCache.clear();
  }
}

/**
 * 清理过期缓存
 */
export function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, item] of memoryCache.entries()) {
    if (now >= item.expiry) {
      memoryCache.delete(key);
    }
  }
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats() {
  return {
    size: memoryCache.size,
    pendingRequests: pendingRequests.size,
    items: Array.from(memoryCache.entries()).map(([key, item]) => ({
      key,
      timestamp: item.timestamp,
      expiry: item.expiry,
      isExpired: Date.now() >= item.expiry
    }))
  };
}

/**
 * 带重试的API调用
 * @param fetcher 获取数据的函数
 * @param maxRetries 最大重试次数
 * @param retryDelay 重试延迟（毫秒）
 * @returns Promise<T>
 */
export async function retryApiCall<T>(
  fetcher: () => Promise<T>,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fetcher();
    } catch (error) {
      lastError = error as Error;
      
      if (i < maxRetries) {
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)));
      }
    }
  }
  
  throw lastError!;
}

/**
 * 防抖的API调用Hook（用于React组件）
 * @param apiCall API调用函数
 * @param delay 防抖延迟
 * @param deps 依赖项数组
 */
export function useDebouncedApiCall<T>(
  apiCall: () => Promise<T>,
  delay: number = 500,
  deps: any[] = []
) {
  const debouncedCall = debounce(apiCall, delay);
  
  return {
    call: debouncedCall,
    clearTimeout: () => {
      // 这里可以添加清除逻辑
    }
  };
}

// 定期清理过期缓存（每10分钟）
if (typeof window !== 'undefined') {
  setInterval(cleanExpiredCache, 10 * 60 * 1000);
}
