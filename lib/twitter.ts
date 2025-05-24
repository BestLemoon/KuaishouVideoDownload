import * as cheerio from 'cheerio';

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
 * 从分辨率字符串中提取高度并格式化为 "1080p" 格式
 */
function formatResolution(resolution: string): string {
  // 处理 "1920x1080" 格式
  if (resolution.includes('x')) {
    const [_, height] = resolution.split('x');
    return `${height}p`;
  }
  
  // 如果已经是 "1080p" 格式
  if (resolution.endsWith('p')) {
    return resolution;
  }
  
  return resolution;
}

/**
 * 解析 savetwitter.net 的加密链接
 */
async function decryptSaveTwitterUrl(encryptedUrl: string): Promise<string | null> {
  try {
    // 从 URL 中提取 token
    const url = new URL(encryptedUrl);
    const token = url.searchParams.get('token');
    if (!token) return null;

    // 解析 token（不需要验证签名）
    const [headerB64, payloadB64] = token.split('.');
    
    // 解码 payload
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
    
    // 返回原始 URL
    return payload.url as string;
  } catch (error) {
    console.error('Error decrypting URL:', error);
    return null;
  }
}

/**
 * 从 twitsave.com 获取视频信息
 */
async function getVideoInfoFromTwitSave(url: string): Promise<VideoInfo | null> {
  try {
    const response = await fetch(`https://twitsave.com/info?url=${encodeURIComponent(url)}`, {
      headers: {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'no-cache',
        'pragma': 'no-cache',
        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch from twitsave.com:', response.status);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 获取缩略图
    const thumbnail = $('video').attr('poster') || $('img.w-full.h-full.object-cover').attr('src');

    // 获取视频链接
    const videos: VideoInfo['videos'] = [];
    
    // 处理每个下载链接
    $('a[href^="https://twitsave.com/download?file="]').each((_, element) => {
      const encryptedUrl = $(element).attr('href');
      if (!encryptedUrl) return;

      try {
        // 从 URL 中提取并解码 base64
        const base64Url = encryptedUrl.split('file=')[1];
        const originalUrl = Buffer.from(base64Url, 'base64').toString();

        // 从原始 URL 中提取分辨率信息
        const resolutionMatch = originalUrl.match(/\/(\d+x\d+)\//);
        if (!resolutionMatch) return;

        // 验证 URL 格式
        if (!originalUrl.startsWith('https://video.twimg.com/')) return;

        // 清理 URL（移除末尾的乱码）
        const cleanUrl = originalUrl.split('?')[0] + '?tag=16';

        const resolution = formatResolution(resolutionMatch[1]);
        const quality = parseInt(resolution) >= 720 ? 'HD' : 'SD';
        
        videos.push({
          url: cleanUrl,
          resolution,
          quality
        });
      } catch (error) {
        console.error('Error processing video URL:', error);
      }
    });

    // 验证每个视频 URL 是否可访问
    const validVideos = await Promise.all(
      videos.map(async (video) => {
        try {
          const response = await fetch(video.url, { method: 'HEAD' });
          return response.ok ? video : null;
        } catch {
          return null;
        }
      })
    );

    // 过滤掉无效的视频
    const filteredVideos = validVideos.filter((v): v is VideoInfo['videos'][0] => v !== null);

    if (filteredVideos.length === 0) {
      console.error('No valid videos found in twitsave.com response');
      return null;
    }

    // 获取视频标题
    let text = '';
    
    // 尝试多个可能的标题选择器
    const selectors = [
      'div.leading-tight p.m-2',
      'div.text-slate-800 p',
      'h2.font-medium.text-gray-900',
      'div.leading-tight'
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length > 0) {
        text = element.text().trim();
        if (text) break;
      }
    }

    // 按分辨率排序（从高到低）
    filteredVideos.sort((a, b) => {
      const heightA = parseInt(a.resolution.replace('p', ''));
      const heightB = parseInt(b.resolution.replace('p', ''));
      return heightB - heightA;
    });

    return {
      videos: filteredVideos,
      text,
      thumbnail
    };
  } catch (error) {
    console.error('Error fetching from twitsave.com:', error);
    return null;
  }
}

/**
 * 从 savetwitter.net 获取视频信息
 */
async function getVideoInfoFromSaveTwitter(url: string): Promise<VideoInfo | null> {
  try {
    const response = await fetch('https://savetwitter.net/api/ajaxSearch', {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'no-cache',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'origin': 'https://savetwitter.net',
        'pragma': 'no-cache',
        'referer': 'https://savetwitter.net/en',
        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'x-requested-with': 'XMLHttpRequest'
      },
      body: new URLSearchParams({
        'q': url,
        'lang': 'en'
      })
    });

    if (!response.ok) {
      console.error('Failed to fetch from savetwitter.net:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (!data.data || data.status !== 'ok') {
      console.error('Invalid response from savetwitter.net:', data);
      return null;
    }

    // 使用 cheerio 解析 HTML
    const $ = cheerio.load(data.data);

    // 获取缩略图
    const thumbnail = $('img').first().attr('src');

    // 获取视频链接
    const videos: VideoInfo['videos'] = [];
    
    // 处理每个下载链接
    for (const element of $('a.tw-button-dl').toArray()) {
      const encryptedUrl = $(element).attr('href');
      if (!encryptedUrl || !encryptedUrl.includes('token=')) continue;

      // 解密获取原始视频 URL
      const originalUrl = await decryptSaveTwitterUrl(encryptedUrl);
      if (!originalUrl) continue;

      // 从原始 URL 中提取分辨率信息
      const resolutionMatch = originalUrl.match(/\/(\d+x\d+)\//);
      if (!resolutionMatch) continue;

      const resolution = formatResolution(resolutionMatch[1]);
      const quality = parseInt(resolution) >= 720 ? 'HD' : 'SD';
      
      videos.push({
        url: originalUrl,
        resolution,
        quality
      });
    }

    if (videos.length === 0) {
      console.error('No videos found in response');
      return null;
    }

    // 获取视频标题
    let text = '';
    const h3Text = $('h3').first().text().trim();
    if (h3Text) {
      text = h3Text;
    }

    // 如果没有找到标题，尝试其他元素
    if (!text) {
      const contentText = $('.content').first().text().trim();
      if (contentText) {
        text = contentText;
      }
    }

    // 按分辨率排序（从高到低）
    videos.sort((a, b) => {
      const heightA = parseInt(a.resolution.replace('p', ''));
      const heightB = parseInt(b.resolution.replace('p', ''));
      return heightB - heightA;
    });

    return {
      videos,
      text,
      thumbnail
    };
  } catch (error) {
    console.error('Error fetching from savetwitter.net:', error);
    return null;
  }
}

/**
 * 获取视频信息
 */
export async function getVideoInfo(url: string): Promise<VideoInfo | { error: string }> {
  try {
    // 首先尝试 savetwitter.net
    console.log('Trying savetwitter.net...');
    const result = await getVideoInfoFromSaveTwitter(url);
    if (result) {
      return result;
    }

    // 如果 savetwitter.net 失败，尝试 twitsave.com
    console.log('Trying twitsave.com as fallback...');
    const twitSaveResult = await getVideoInfoFromTwitSave(url);
    if (twitSaveResult) {
      return twitSaveResult;
    }

    return { error: 'Failed to fetch video info from all sources' };
  } catch (error) {
    console.error('Error getting video info:', error);
    return { error: 'Failed to fetch video info' };
  }
} 