import { SignJWT, jwtVerify } from 'jose'

// 确保 JWT_SECRET_KEY 存在
if (!process.env.JWT_SECRET_KEY) {
  throw new Error('JWT_SECRET_KEY is not defined in environment variables')
}

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET_KEY)

// Token 配置
const TOKEN_CONFIG = {
  expirationTime: '1h',    // Token 过期时间
  algorithm: 'HS256',      // 加密算法
  issuer: 'twitter-video-downloader',  // Token 发行者
  tokenType: 'access'      // Token 类型
} as const

export async function encryptVideoUrl(videoInfo: {
  url: string;
  resolution: string;
  quality: string;
}) {
  try {
    const token = await new SignJWT({
      url: videoInfo.url,
      resolution: videoInfo.resolution,
      quality: videoInfo.quality,
    })
      .setProtectedHeader({ alg: TOKEN_CONFIG.algorithm })
      .setIssuedAt()
      .setExpirationTime(TOKEN_CONFIG.expirationTime)
      .setIssuer(TOKEN_CONFIG.issuer)
      .setSubject(videoInfo.url)
      .sign(SECRET_KEY)
    
    return token
  } catch (error) {
    console.error('Error encrypting video URL:', error)
    throw new Error('Failed to encrypt video URL')
  }
}

export async function decryptVideoUrl(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      issuer: TOKEN_CONFIG.issuer,
      algorithms: [TOKEN_CONFIG.algorithm],
    })

    // 验证 payload 结构
    if (!payload.url || typeof payload.url !== 'string' ||
        !payload.resolution || typeof payload.resolution !== 'string' ||
        !payload.quality || typeof payload.quality !== 'string') {
      throw new Error('Invalid token payload structure')
    }

    return {
      url: payload.url,
      resolution: payload.resolution,
      quality: payload.quality,
    }
  } catch (error) {
    console.error('Error decrypting video URL:', error)
    if (error instanceof Error) {
      throw new Error(`Invalid or expired token: ${error.message}`)
    }
    throw new Error('Invalid or expired token')
  }
}

export async function encryptBatchData(batchData: any) {
  try {
    const token = await new SignJWT({
      data: batchData,
      type: 'batch_results'
    })
      .setProtectedHeader({ alg: TOKEN_CONFIG.algorithm })
      .setIssuedAt()
      .setExpirationTime('2h') // 批量结果token有效期2小时
      .setIssuer(TOKEN_CONFIG.issuer)
      .setSubject('batch_download_results')
      .sign(SECRET_KEY)
    
    return token
  } catch (error) {
    console.error('Error encrypting batch data:', error)
    throw new Error('Failed to encrypt batch data')
  }
}

export async function decryptBatchData(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      issuer: TOKEN_CONFIG.issuer,
      algorithms: [TOKEN_CONFIG.algorithm],
    })

    // 验证 payload 结构
    if (!payload.data || payload.type !== 'batch_results') {
      throw new Error('Invalid batch data token structure')
    }

    return payload.data
  } catch (error) {
    console.error('Error decrypting batch data:', error)
    if (error instanceof Error) {
      throw new Error(`Invalid or expired batch token: ${error.message}`)
    }
    throw new Error('Invalid or expired batch token')
  }
} 