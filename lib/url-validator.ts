/**
 * URL验证工具函数
 */

/**
 * 验证Twitter/X URL格式
 */
export function isValidTwitterUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // 匹配 Twitter/X URL 格式
  const twitterUrlPattern = /^https?:\/\/(?:www\.)?(twitter\.com|x\.com)\/([^\/]+)\/status\/(\d+)(?:\?.*)?$/i;
  return twitterUrlPattern.test(url.trim());
}

/**
 * 验证多个Twitter/X URL
 */
export function validateTwitterUrls(urls: string[]): {
  valid: string[];
  invalid: string[];
  errors: { url: string; error: string }[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];
  const errors: { url: string; error: string }[] = [];

  urls.forEach(url => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      return; // 跳过空行
    }

    if (isValidTwitterUrl(trimmedUrl)) {
      valid.push(trimmedUrl);
    } else {
      invalid.push(trimmedUrl);
      errors.push({
        url: trimmedUrl,
        error: 'Invalid Twitter/X URL format'
      });
    }
  });

  return { valid, invalid, errors };
}

/**
 * 从Twitter URL中提取信息
 */
export function extractTwitterInfo(url: string): {
  username: string | null;
  statusId: string | null;
} {
  const match = url.match(/(?:twitter\.com|x\.com)\/([^\/]+)\/status\/(\d+)/i);
  
  return {
    username: match ? match[1] : null,
    statusId: match ? match[2] : null
  };
}

/**
 * 清理和标准化Twitter URL
 */
export function normalizeTwitterUrl(url: string): string {
  const trimmed = url.trim();
  
  // 如果没有协议，添加https
  if (trimmed.match(/^(twitter\.com|x\.com)/i)) {
    return `https://${trimmed}`;
  }
  
  return trimmed;
} 