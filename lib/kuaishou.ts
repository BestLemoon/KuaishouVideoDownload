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
 * 使用ASCII码减1规则解密字符串
 */
function decryptString(encrypted: string): string {
  return encrypted.split('').map(char => String.fromCharCode(char.charCodeAt(0) - 1)).join('');
}

/**
 * 验证key是否包含正确的解密内容
 */
function validateKeyContent(key: string): boolean {
  try {
    const decrypted = decryptString(key);
    console.log('  Decrypted key content preview:', decrypted.substring(0, 100) + '...');

    // 检查解密后的内容是否包含 "photo.single.info" 路径
    const hasTargetPath = decrypted.includes('photo.single.info');
    console.log(`  Contains "photo.single.info": ${hasTargetPath ? '✓' : '✗'}`);

    return hasTargetPath;
  } catch (error) {
    console.error('Error validating key content:', error);
    return false;
  }
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
 * 从快手URL获取视频信息
 */
async function getVideoInfoFromKuaishou(url: string): Promise<VideoInfo | null> {
  try {
    // 使用iOS Safari的User-Agent发送HTTP请求
    const response = await fetch(url, {
      headers: {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'cache-control': 'no-cache',
        'pragma': 'no-cache',
        'sec-ch-ua': '"Safari";v="17", "WebKit";v="605", "Mobile";v="15E148"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"iOS"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch from Kuaishou:', response.status);
      return null;
    }

    const html = await response.text();
    
    // 使用正则表达式提取初始化数据
    let match = html.match(/window\.INIT_STATE\s*=\s*({.*?})\s*<\/script>/);
    if (!match) {
      // 尝试其他可能的模式
      const altMatch = html.match(/window\.INIT_STATE\s*=\s*({.*?});/);
      if (!altMatch) {
        console.error('No INIT_STATE found in HTML');
        return null;
      }
      match = altMatch;
    }

    let initData;
    try {
      initData = JSON.parse(match[1]);
    } catch (error) {
      console.error('Failed to parse INIT_STATE JSON:', error);
      return null;
    }

    // 获取所有keys并基于关键词匹配找到正确的key
    const keys = Object.keys(initData);
    console.log('INIT_STATE keys:', keys);
    console.log('Total keys count:', keys.length);

    // 定义匹配规则：寻找同时包含三个混淆字符串的key
    const targetPatterns = ['qipup', 'tjohmf', 'jogp']; // 对应解密后的 "photo", "single", "info"

    // 遍历所有key寻找匹配的key
    let encryptedKey: string | null = null;
    console.log('Searching for key with patterns:', targetPatterns);

    for (const key of keys) {
      console.log('Checking key:', key);

      // 检查key是否同时包含所有三个特征字符串
      const hasAllPatterns = targetPatterns.every(pattern => {
        const hasPattern = key.includes(pattern);
        console.log(`  Pattern "${pattern}": ${hasPattern ? '✓' : '✗'}`);
        return hasPattern;
      });

      if (hasAllPatterns) {
        console.log('Key contains all patterns, validating content...');
        // 进一步验证解密后的内容是否包含正确的路径
        if (validateKeyContent(key)) {
          encryptedKey = key;
          console.log('✓ Found and validated matching key:', encryptedKey);
          break;
        } else {
          console.log('✗ Key contains patterns but validation failed:', key);
        }
      }
    }

    // 如果没有找到匹配的key，回退到原来的第四个key逻辑
    if (!encryptedKey) {
      console.log('No key found with target patterns, falling back to 4th key');
      if (keys.length < 4) {
        console.log('Not enough keys in INIT_STATE, expected at least 4 keys');
        console.log('Available keys in INIT_STATE:', keys);
        return null;
      }
      encryptedKey = keys[3];
      console.log('Using fallback key at index 3:', encryptedKey);
    }

    const encryptedData = initData[encryptedKey];

    let videoData;
    try {
      // 如果数据已经是对象，直接使用
      if (typeof encryptedData === 'object') {
        videoData = encryptedData;
      } else {
        // 如果是字符串，尝试解析
        videoData = JSON.parse(encryptedData);
      }
    } catch (error) {
      console.error('Failed to parse encrypted data:', error);
      return null;
    }

    // 提取媒体信息
    const photo = videoData?.photo;
    if (!photo) {
      console.error('No photo data found');
      return null;
    }

    // 提取视频链接
    const videos: VideoInfo['videos'] = [];
    const mainMvUrls = photo.mainMvUrls;
    
    if (mainMvUrls && Array.isArray(mainMvUrls)) {
      mainMvUrls.forEach((videoItem: any, index: number) => {
        if (videoItem?.url) {
          // 根据索引确定质量
          const quality = index === 0 ? 'HD' : 'SD';
          const resolution = index === 0 ? '720p' : '480p'; // 默认分辨率
          
          videos.push({
            url: videoItem.url,
            quality,
            resolution
          });
        }
      });
    }

    if (videos.length === 0) {
      console.error('No valid videos found');
      return null;
    }

    // 提取封面图片
    let thumbnail = '';
    const coverUrls = photo.coverUrls;
    if (coverUrls && Array.isArray(coverUrls) && coverUrls[0]?.url) {
      thumbnail = coverUrls[0].url;
    }

    // 提取视频标题
    const text = photo.caption || '';

    // 按质量排序（HD优先）
    videos.sort((a, b) => {
      if (a.quality === 'HD' && b.quality !== 'HD') return -1;
      if (a.quality !== 'HD' && b.quality === 'HD') return 1;
      return 0;
    });

    return {
      videos,
      text,
      thumbnail
    };
  } catch (error) {
    console.error('Error fetching from Kuaishou:', error);
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
