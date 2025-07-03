/**
 * URL验证工具函数
 */

/**
 * 验证快手 URL格式
 */
export function isValidKuaishouUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Only match domain: kuaishou.com or kwai.com, ignore the rest
  // Supported domains:
  // - https://www.kuaishou.com/...
  // - https://kuaishou.com/...
  // - https://www.kwai.com/...
  // - https://kwai.com/...
  const kuaishouDomainPattern = /^https?:\/\/(?:www\.)?(kuaishou\.com|kwai\.com)(\/|$)/i;
  return kuaishouDomainPattern.test(url.trim());
}

/**
 * 验证多个快手 URL
 */
export function validateKuaishouUrls(urls: string[]): {
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

    if (isValidKuaishouUrl(trimmedUrl)) {
      valid.push(trimmedUrl);
    } else {
      invalid.push(trimmedUrl);
      errors.push({
        url: trimmedUrl,
        error: 'Invalid Kuaishou URL format'
      });
    }
  });

  return { valid, invalid, errors };
}

/**
 * 从快手 URL中提取信息
 */
export function extractKuaishouInfo(url: string): {
  videoId: string | null;
  domain: string | null;
} {
  const match = url.match(/(?:kuaishou\.com|kwai\.com|v\.kuaishou\.com)\/(?:short-video\/)?([a-zA-Z0-9_-]+)/i);
  const domainMatch = url.match(/https?:\/\/(?:www\.)?(kuaishou\.com|kwai\.com|v\.kuaishou\.com)/i);

  return {
    videoId: match ? match[1] : null,
    domain: domainMatch ? domainMatch[1] : null
  };
}

/**
 * 清理和标准化快手 URL
 */
export function normalizeKuaishouUrl(url: string): string {
  const trimmed = url.trim();

  // 如果没有协议，添加https
  if (trimmed.match(/^(kuaishou\.com|kwai\.com|v\.kuaishou\.com)/i)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

// 保持向后兼容性的别名函数
export const isValidTwitterUrl = isValidKuaishouUrl;
export const validateTwitterUrls = validateKuaishouUrls;
export const extractTwitterInfo = extractKuaishouInfo;
export const normalizeTwitterUrl = normalizeKuaishouUrl;