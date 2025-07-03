import CryptoJS from 'crypto-js';

interface VideoInfo {
  videos: {
    url: string;
    quality: string;
    resolution: string;
  }[];
  text?: string;
  thumbnail?: string;
}

/**
 * 生成API签名
 */
function generateSign(homepage_url: string, secret: string = 'ce544ff3c4c8'): { sign: string; timestamp: string } {
  // 生成当前时间戳（毫秒）
  const timestamp = Date.now().toString();
  // 拼接成原始字符串
  const raw_string = timestamp + homepage_url + secret;
  // 计算 MD5 值
  const sign = CryptoJS.MD5(raw_string).toString();
  console.log('签名生成:', { timestamp, homepage_url, secret, raw_string, sign });
  return { sign, timestamp };
}

/**
 * Cookie管理类，类似Python的requests.Session
 */
class HttpSession {
  private cookies: Map<string, string> = new Map();

  /**
   * 解析Set-Cookie头并存储cookie
   */
  private parseCookies(response: Response) {
    // 获取所有Set-Cookie头
    const setCookieHeaders = response.headers.getSetCookie?.() || [];

    setCookieHeaders.forEach(cookieString => {
      const parts = cookieString.split(';')[0].split('=');
      if (parts.length === 2) {
        this.cookies.set(parts[0].trim(), parts[1].trim());
      }
    });

    // 如果getSetCookie不可用，尝试传统方法
    if (setCookieHeaders.length === 0) {
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        const parts = setCookie.split(';')[0].split('=');
        if (parts.length === 2) {
          this.cookies.set(parts[0].trim(), parts[1].trim());
        }
      }
    }
  }

  /**
   * 获取Cookie字符串
   */
  private getCookieString(): string {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  /**
   * 发起请求并自动管理cookie
   */
  async request(url: string, options: RequestInit = {}): Promise<Response> {
    // 添加现有cookie到请求头
    const headers = new Headers(options.headers);
    const cookieString = this.getCookieString();
    if (cookieString) {
      headers.set('Cookie', cookieString);
    }

    // 发起请求
    const response = await fetch(url, {
      ...options,
      headers
    });

    // 解析并存储新的cookie
    this.parseCookies(response);

    return response;
  }
}

/**
 * 发起API请求 - 完全按照Python代码逻辑实现
 */
async function makeApiRequest(homepage_url: string): Promise<Response> {
  try {
    // 创建session
    const session = new HttpSession();

    // 第一个请求：获取cookie - 完全按照Python代码的headers
    const initialHeaders = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'DNT': '1',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"'
    };

    console.log('第一步：获取cookie...');
    const initialResponse = await session.request('https://api.spapi.cn/', {
      method: 'GET',
      headers: initialHeaders
    });

    console.log('第一步响应状态:', initialResponse.status);
    console.log('第一步响应头:', Object.fromEntries(initialResponse.headers.entries()));

    if (!initialResponse.ok) {
      throw new Error(`Initial request failed: ${initialResponse.status}`);
    }

    // 生成签名
    const { sign, timestamp } = generateSign(homepage_url);

    // 第二个请求：使用session中的cookie进行API调用 - 完全按照Python代码的headers
    const api_url = `https://api.spapi.cn/api/parsing?otype=json&timestamp=${timestamp}&sign=${sign}`;
    const payload = `url=${encodeURIComponent(homepage_url)}`;
    const api_headers = {
      'DNT': '1',
      'Pragma': 'no-cache',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
    };

    console.log('第二步：发起API请求...', api_url);
    console.log('请求参数:', payload);
    console.log('签名信息:', { timestamp, sign });

    const apiResponse = await session.request(api_url, {
      method: 'POST',
      headers: api_headers,
      body: payload
    });

    console.log('API响应状态:', apiResponse.status);

    return apiResponse;
  } catch (error) {
    console.error('makeApiRequest error:', error);
    throw error;
  }
}

/**
 * 从快手URL获取视频信息
 */
async function getVideoInfoFromKuaishou(url: string): Promise<VideoInfo | null> {
  try {
    console.log('Processing Kuaishou URL with new API:', url);

    // 使用新的API调用方式
    const response = await makeApiRequest(url);

    if (!response.ok) {
      console.error('API request failed:', response.status);
      console.error('Response text:', await response.text());
      return null;
    }

    const result = await response.json();
    console.log('API response:', result);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    // 检查API响应格式
    if (result.status !== 101) {
      console.error('API returned error status:', result.status, 'message:', result.msg || 'Unknown error');
      console.error('Full response:', JSON.stringify(result, null, 2));

      // 如果API返回102状态码，说明可能需要等待或者API有问题
      if (result.status === 102) {
        console.log('API返回102状态码，可能是反爬虫机制或API暂时不可用');
        // 这里可以添加重试逻辑或者使用备用方案
      }

      return null;
    }

    if (!result.data) {
      console.error('API response missing data field');
      return null;
    }

    const { data } = result;

    // 构建视频信息
    const videos: VideoInfo['videos'] = [];

    // 新API只返回一个视频链接
    if (data.video) {
      videos.push({
        url: data.video,
        quality: 'HD', // 默认为高清
        resolution: '720p' // 默认分辨率
      });
    }

    if (videos.length === 0) {
      console.error('No video URL found in API response');
      return null;
    }

    return {
      videos,
      text: data.title || '',
      thumbnail: data.image || ''
    };
  } catch (error) {
    console.error('Error fetching from Kuaishou API:', error);
    return null;
  }
}

/**
 * 获取视频信息
 */
export async function getVideoInfo(url: string): Promise<VideoInfo | { error: string }> {
  try {
    console.log('Processing Kuaishou URL:', url);
    const result = await getVideoInfoFromKuaishou(url);
    if (result) {
      return result;
    }

    return { error: 'Failed to fetch video info from Kuaishou' };
  } catch (error) {
    console.error('Error getting video info:', error);
    return { error: 'Failed to fetch video info' };
  }
}
