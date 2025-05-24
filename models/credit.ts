import { Credit } from "@/types/credit";
import { getSupabaseClient } from "@/models/db";

// 积分交易类型
export type CreditTransactionType = 'charge' | 'consume' | 'gift'

// 积分记录接口（扩展原有的 Credit 接口）
export interface CreditRecord extends Credit {
  id?: number
  description?: string
  video_resolution?: string
  video_url?: string
}

// 下载历史记录接口
export interface DownloadHistory {
  id?: number
  download_no: string
  created_at?: string
  user_uuid: string
  video_url: string
  original_tweet_url?: string
  video_resolution?: string
  video_quality?: string
  file_name?: string
  file_size?: number
  credits_consumed: number
  download_status?: string
  username?: string
  status_id?: string
  description?: string
}

// 用户积分余额接口
export interface UserCreditBalance {
  user_uuid: string
  total_credits: number
  available_credits: number
  expired_credits: number
}

/**
 * 生成交易流水号
 */
export function generateTransNo(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 10000)
  return `CREDIT_${timestamp}_${random.toString().padStart(4, '0')}`
}

/**
 * 生成下载流水号
 */
export function generateDownloadNo(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 10000)
  return `DOWNLOAD_${timestamp}_${random.toString().padStart(4, '0')}`
}

// 原有功能保持不变
export async function insertCredit(credit: Credit) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("credits").insert(credit);

  if (error) {
    throw error;
  }

  return data;
}

export async function findCreditByTransNo(
  trans_no: string
): Promise<Credit | undefined> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("credits")
    .select("*")
    .eq("trans_no", trans_no)
    .limit(1)
    .single();

  if (error) {
    return undefined;
  }

  return data;
}

export async function findCreditByOrderNo(
  order_no: string
): Promise<Credit | undefined> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("credits")
    .select("*")
    .eq("order_no", order_no)
    .limit(1)
    .single();

  if (error) {
    return undefined;
  }

  return data;
}

export async function getUserValidCredits(
  user_uuid: string
): Promise<Credit[] | undefined> {
  const now = new Date().toISOString();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("credits")
    .select("*")
    .eq("user_uuid", user_uuid)
    .gte("expired_at", now)
    .order("expired_at", { ascending: true });

  if (error) {
    return undefined;
  }

  return data;
}

export async function getCreditsByUserUuid(
  user_uuid: string,
  page: number = 1,
  limit: number = 50
): Promise<Credit[] | undefined> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("credits")
    .select("*")
    .eq("user_uuid", user_uuid)
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) {
    return undefined;
  }

  return data;
}

/**
 * 创建积分记录
 */
export async function createCreditRecord(record: Omit<CreditRecord, 'id' | 'created_at'>): Promise<boolean> {
  try {
    const client = getSupabaseClient()
    
    const { trans_no, user_uuid, trans_type, credits, order_no, expired_at, description, video_resolution, video_url } = record
    
    const { error } = await client
      .from('credits')
      .insert({
        trans_no,
        created_at: new Date().toISOString(),
        user_uuid,
        trans_type,
        credits,
        order_no,
        expired_at,
        description,
        video_resolution,
        video_url
      })
    
    if (error) {
      console.error('Failed to create credit record:', error)
      return false
    }
    
    console.log(`Credit record created: ${trans_no}, ${user_uuid}, ${trans_type}, ${credits}`)
    return true
  } catch (error) {
    console.error('Failed to create credit record:', error)
    return false
  }
}

/**
 * 获取用户积分余额
 */
export async function getUserCreditBalance(user_uuid: string): Promise<UserCreditBalance> {
  try {
    const client = getSupabaseClient()
    
    // 查询积分记录
    const { data: records, error } = await client
      .from('credits')
      .select('credits, expired_at')
      .eq('user_uuid', user_uuid)
    
    if (error) {
      console.error('Failed to get user credit balance:', error)
      return {
        user_uuid,
        total_credits: 0,
        available_credits: 0,
        expired_credits: 0
      }
    }
    
    if (!records) {
      return {
        user_uuid,
        total_credits: 0,
        available_credits: 0,
        expired_credits: 0
      }
    }
    
    const now = new Date()
    let total_credits = 0
    let available_credits = 0
    let expired_credits = 0
    
    records.forEach(record => {
      total_credits += record.credits
      
      if (!record.expired_at || new Date(record.expired_at) > now) {
        available_credits += record.credits
      } else {
        expired_credits += record.credits
      }
    })
    
    return {
      user_uuid,
      total_credits,
      available_credits: Math.max(0, available_credits), // 确保不为负数
      expired_credits
    }
  } catch (error) {
    console.error('Failed to get user credit balance:', error)
    return {
      user_uuid,
      total_credits: 0,
      available_credits: 0,
      expired_credits: 0
    }
  }
}

/**
 * 检查用户是否有足够积分
 */
export async function checkUserCredits(user_uuid: string, required_credits: number): Promise<boolean> {
  const balance = await getUserCreditBalance(user_uuid)
  return balance.available_credits >= required_credits
}

/**
 * 消费积分
 */
export async function consumeCredits(
  user_uuid: string, 
  credits: number, 
  description: string,
  video_resolution?: string,
  video_url?: string
): Promise<{ success: boolean; messageKey?: string; message?: string; params?: Record<string, string | number>; balance?: UserCreditBalance }> {
  try {
    // 检查余额
    const balance = await getUserCreditBalance(user_uuid)
    if (balance.available_credits < credits) {
      return {
        success: false,
        messageKey: 'credits.insufficient',
        params: {
          available: balance.available_credits,
          required: credits
        }
      }
    }
    
    // 创建消费记录
    const trans_no = generateTransNo()
    const success = await createCreditRecord({
      trans_no,
      user_uuid,
      trans_type: 'consume',
      credits: -credits, // 负数表示扣除
      description,
      video_resolution,
      video_url
    })
    
    if (success) {
      const newBalance = await getUserCreditBalance(user_uuid)
      return {
        success: true,
        messageKey: 'credits.deduction_success',
        balance: newBalance
      }
    } else {
      return {
        success: false,
        messageKey: 'credits.deduction_failed'
      }
    }
  } catch (error) {
    console.error('Failed to consume credits:', error)
    return {
      success: false,
      messageKey: 'credits.deduction_error'
    }
  }
}

/**
 * 赠送积分（新用户）
 */
export async function giftCredits(
  user_uuid: string,
  credits: number,
  description: string,
  valid_months?: number
): Promise<boolean> {
  try {
    let expired_at: string | undefined
    if (valid_months) {
      const expireDate = new Date()
      expireDate.setMonth(expireDate.getMonth() + valid_months)
      expired_at = expireDate.toISOString()
    }
    
    const trans_no = generateTransNo()
    return await createCreditRecord({
      trans_no,
      user_uuid,
      trans_type: 'gift',
      credits,
      description,
      expired_at
    })
  } catch (error) {
    console.error('Failed to gift credits:', error)
    return false
  }
}

/**
 * 充值积分（购买）
 */
export async function chargeCredits(
  user_uuid: string,
  credits: number,
  order_no: string,
  description: string,
  valid_months?: number
): Promise<boolean> {
  try {
    let expired_at: string | undefined
    if (valid_months) {
      const expireDate = new Date()
      expireDate.setMonth(expireDate.getMonth() + valid_months)
      expired_at = expireDate.toISOString()
    }
    
    const trans_no = generateTransNo()
    return await createCreditRecord({
      trans_no,
      user_uuid,
      trans_type: 'charge',
      credits,
      order_no,
      description,
      expired_at
    })
  } catch (error) {
    console.error('Failed to charge credits:', error)
    return false
  }
}

/**
 * 获取用户积分交易记录
 */
export async function getUserCreditHistory(
  user_uuid: string,
  limit: number = 50,
  offset: number = 0
): Promise<CreditRecord[]> {
  try {
    const client = getSupabaseClient()
    
    const { data: records, error } = await client
      .from('credits')
      .select('*')
      .eq('user_uuid', user_uuid)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error('Failed to get user credit history:', error)
      return []
    }
    
    return records || []
  } catch (error) {
    console.error('Failed to get user credit history:', error)
    return []
  }
}

/**
 * 根据视频分辨率计算所需积分
 */
export function calculateRequiredCredits(resolution: string): number {
  // 高清视频（720p及以上）消耗2积分
  const resolutionNumber = parseInt(resolution.replace('p', ''))
  if (resolutionNumber >= 720) {
    return 2
  }
  // 其他清晰度消耗1积分
  return 1
}

/**
 * 创建下载历史记录
 */
export async function createDownloadHistory(record: Omit<DownloadHistory, 'id' | 'created_at'>): Promise<boolean> {
  try {
    const client = getSupabaseClient()
    
    const { error } = await client
      .from('download_history')
      .insert(record)
    
    if (error) {
      console.error('Failed to create download history:', error)
      return false
    }
    
    console.log(`Download history created: ${record.download_no}, ${record.user_uuid}`)
    return true
  } catch (error) {
    console.error('Failed to create download history:', error)
    return false
  }
}

/**
 * 获取用户下载历史
 */
export async function getUserDownloadHistory(
  user_uuid: string,
  limit: number = 50,
  offset: number = 0
): Promise<DownloadHistory[]> {
  try {
    const client = getSupabaseClient()
    
    const { data: records, error } = await client
      .from('download_history')
      .select('*')
      .eq('user_uuid', user_uuid)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error('Failed to get user download history:', error)
      return []
    }
    
    return records || []
  } catch (error) {
    console.error('Failed to get user download history:', error)
    return []
  }
}

/**
 * 获取用户下载统计
 */
export async function getUserDownloadStats(user_uuid: string): Promise<{
  total_downloads: number
  total_credits_consumed: number
  hd_downloads: number
  sd_downloads: number
}> {
  try {
    const client = getSupabaseClient()
    
    const { data: records, error } = await client
      .from('download_history')
      .select('video_resolution, credits_consumed')
      .eq('user_uuid', user_uuid)
      .eq('download_status', 'completed')
    
    if (error) {
      console.error('Failed to get user download stats:', error)
      return {
        total_downloads: 0,
        total_credits_consumed: 0,
        hd_downloads: 0,
        sd_downloads: 0
      }
    }
    
    if (!records) {
      return {
        total_downloads: 0,
        total_credits_consumed: 0,
        hd_downloads: 0,
        sd_downloads: 0
      }
    }
    
    const stats = {
      total_downloads: records.length,
      total_credits_consumed: records.reduce((sum, record) => sum + record.credits_consumed, 0),
      hd_downloads: 0,
      sd_downloads: 0
    }
    
    records.forEach(record => {
      if (record.video_resolution) {
        const resolution = parseInt(record.video_resolution.replace('p', ''))
        if (resolution >= 720) {
          stats.hd_downloads++
        } else {
          stats.sd_downloads++
        }
      }
    })
    
    return stats
  } catch (error) {
    console.error('Failed to get user download stats:', error)
    return {
      total_downloads: 0,
      total_credits_consumed: 0,
      hd_downloads: 0,
      sd_downloads: 0
    }
  }
}
