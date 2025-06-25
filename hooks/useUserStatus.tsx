"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { cachedApiCall, debounce } from '@/lib/api-utils';

export interface UserStatus {
  isLoggedIn: boolean;
  isPremium: boolean;
  canUseFree: boolean;
}

const DEFAULT_USER_STATUS: UserStatus = {
  isLoggedIn: false,
  isPremium: false,
  canUseFree: true
};

// 全局状态管理
let globalUserStatus: UserStatus | null = null;
let globalStatusListeners: Set<(status: UserStatus) => void> = new Set();

/**
 * 用户状态管理Hook
 * 提供缓存、防抖、去重等优化功能
 */
export function useUserStatus() {
  const [userStatus, setUserStatus] = useState<UserStatus | null>(globalUserStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // 订阅全局状态变化
  useEffect(() => {
    const listener = (status: UserStatus) => {
      if (mountedRef.current) {
        setUserStatus(status);
      }
    };
    
    globalStatusListeners.add(listener);
    
    return () => {
      globalStatusListeners.delete(listener);
      mountedRef.current = false;
    };
  }, []);

  // 更新全局状态
  const updateGlobalStatus = useCallback((status: UserStatus) => {
    globalUserStatus = status;
    globalStatusListeners.forEach(listener => listener(status));
  }, []);

  // 获取用户状态的核心函数
  const fetchUserStatusCore = useCallback(async (): Promise<UserStatus> => {
    console.log('[Hook] useUserStatus - 开始获取用户状态');

    // 首先尝试主要的API
    try {
      const response = await fetch('/api/user-status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('[Hook] useUserStatus - 主API响应状态:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('[Hook] useUserStatus - 主API响应数据:', result);

        if (result.code === 0) {
          console.log('[Hook] useUserStatus - 主API成功获取用户状态:', result.data);
          return result.data;
        }
      }

      // 主API失败，抛出错误进入catch块
      throw new Error(`主API失败: ${response.status}`);

    } catch (mainApiError) {
      console.warn('[Hook] useUserStatus - 主API失败，尝试简化API:', mainApiError);

      // 尝试简化版API作为fallback
      try {
        const fallbackResponse = await fetch('/api/user-status-simple', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('[Hook] useUserStatus - 简化API响应状态:', fallbackResponse.status);

        if (fallbackResponse.ok) {
          const fallbackResult = await fallbackResponse.json();
          console.log('[Hook] useUserStatus - 简化API响应数据:', fallbackResult);

          if (fallbackResult.code === 0) {
            console.log('[Hook] useUserStatus - 简化API成功获取用户状态:', fallbackResult.data);
            return fallbackResult.data;
          }
        }

        throw new Error(`简化API也失败: ${fallbackResponse.status}`);

      } catch (fallbackError) {
        console.error('[Hook] useUserStatus - 所有API都失败:', fallbackError);
        throw new Error('无法获取用户状态：主API和简化API都失败');
      }
    }
  }, []);

  // 带缓存的获取用户状态
  const fetchUserStatus = useCallback(async (forceRefresh: boolean = false): Promise<UserStatus> => {
    if (!mountedRef.current) return DEFAULT_USER_STATUS;

    setIsLoading(true);
    setError(null);

    try {
      const cacheKey = 'user_status';
      const ttl = 5 * 60 * 1000; // 5分钟缓存
      
      let status: UserStatus;
      
      if (forceRefresh) {
        // 强制刷新时清除缓存
        const { clearCache } = await import('@/lib/api-utils');
        clearCache(cacheKey);
        status = await fetchUserStatusCore();
      } else {
        // 使用缓存
        status = await cachedApiCall(cacheKey, fetchUserStatusCore, ttl);
      }

      updateGlobalStatus(status);
      return status;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Hook] useUserStatus - 获取用户状态失败:', errorMessage);
      console.error('[Hook] useUserStatus - 错误详情:', err);

      // 只在开发环境设置错误状态，生产环境静默处理
      if (process.env.NODE_ENV === 'development') {
        setError(errorMessage);
      } else {
        // 生产环境下清除错误状态，避免用户看到错误信息
        setError(null);
      }

      // 返回默认状态而不是抛出错误，确保应用继续运行
      console.log('[Hook] useUserStatus - 使用默认状态作为fallback');
      const defaultStatus = DEFAULT_USER_STATUS;
      updateGlobalStatus(defaultStatus);
      return defaultStatus;
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [fetchUserStatusCore, updateGlobalStatus]);

  // 防抖的刷新函数
  const debouncedRefresh = useCallback(
    debounce(() => {
      fetchUserStatus(false);
    }, 1000), // 1秒防抖
    [fetchUserStatus]
  );

  // 初始化加载
  useEffect(() => {
    if (!globalUserStatus) {
      console.log('[Hook] useUserStatus - 初始化加载用户状态');
      fetchUserStatus(false).catch((error) => {
        console.error('[Hook] useUserStatus - 初始化加载失败:', error);
        // 确保即使失败也设置默认状态
        updateGlobalStatus(DEFAULT_USER_STATUS);
      });
    }
  }, [fetchUserStatus, updateGlobalStatus]);

  // 强制刷新（清除缓存）
  const refresh = useCallback(() => {
    return fetchUserStatus(true);
  }, [fetchUserStatus]);

  // 防抖刷新
  const debouncedRefreshWrapper = useCallback(() => {
    debouncedRefresh();
  }, [debouncedRefresh]);

  return {
    userStatus: userStatus || DEFAULT_USER_STATUS,
    isLoading,
    error,
    refresh,
    debouncedRefresh: debouncedRefreshWrapper,
    // 便捷的状态检查
    isLoggedIn: userStatus?.isLoggedIn || false,
    isPremium: userStatus?.isPremium || false,
    canUseFree: userStatus?.canUseFree || true,
  };
}

/**
 * 清除用户状态缓存（用于登出等场景）
 */
export function clearUserStatusCache() {
  globalUserStatus = null;
  import('@/lib/api-utils').then(({ clearCache }) => {
    clearCache('user_status');
  });
}

/**
 * 手动设置用户状态（用于登录后立即更新状态）
 */
export function setUserStatus(status: UserStatus) {
  globalUserStatus = status;
  globalStatusListeners.forEach(listener => listener(status));
}
