-- 更新现有的 credits 表，添加新字段
ALTER TABLE credits ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE credits ADD COLUMN IF NOT EXISTS video_resolution VARCHAR(20);
ALTER TABLE credits ADD COLUMN IF NOT EXISTS video_url TEXT;

-- 更新现有的 orders 表，添加缺失的字段（如果它们不存在的话）
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS interval VARCHAR(50) DEFAULT 'one-time';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'created';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency VARCHAR(50) DEFAULT 'USD';

-- 创建下载历史表
CREATE TABLE IF NOT EXISTS download_history (
    id SERIAL PRIMARY KEY,
    download_no VARCHAR(255) UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now(),
    user_uuid VARCHAR(255) NOT NULL,
    video_url TEXT NOT NULL,
    original_tweet_url TEXT,
    video_resolution VARCHAR(20),
    video_quality VARCHAR(50),
    file_name VARCHAR(255),
    file_size BIGINT,
    credits_consumed INT NOT NULL DEFAULT 1,
    download_status VARCHAR(50) DEFAULT 'completed', -- completed, failed
    username VARCHAR(255), -- Twitter用户名
    status_id VARCHAR(255), -- Tweet状态ID
    description TEXT -- 视频描述或推文内容
);

-- 添加缺失的字段到 download_history 表
ALTER TABLE download_history ADD COLUMN IF NOT EXISTS platform VARCHAR(50); -- 平台标识：twitter, kuaishou等
ALTER TABLE download_history ADD COLUMN IF NOT EXISTS url TEXT; -- 通用的原始URL字段
ALTER TABLE download_history ADD COLUMN IF NOT EXISTS video_id VARCHAR(255); -- 通用视频ID字段

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_download_history_user_uuid ON download_history(user_uuid);
CREATE INDEX IF NOT EXISTS idx_download_history_created_at ON download_history(created_at);
CREATE INDEX IF NOT EXISTS idx_download_history_status ON download_history(download_status);
CREATE INDEX IF NOT EXISTS idx_download_history_platform ON download_history(platform);
CREATE INDEX IF NOT EXISTS idx_download_history_video_id ON download_history(video_id);

-- 为现有表创建缺失的索引
CREATE INDEX IF NOT EXISTS idx_credits_user_uuid ON credits(user_uuid);
CREATE INDEX IF NOT EXISTS idx_credits_created_at ON credits(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_user_uuid ON orders(user_uuid);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status); 