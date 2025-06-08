import os
from dotenv import load_dotenv

load_dotenv()

# 默认配置
DEFAULT_COVER_URL = "https://www.twitterdown.com/imgs/TwitterDownAPICover.png"
DEFAULT_AUTHOR_NAME = "TwitterDown"
DEFAULT_AUTHOR_AVATAR_URL = "https://www.twitterdown.com/logo.png"

# API 配置
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY", "")

# 数据库配置
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# 网站配置
SITE_URL = "https://TwitterDown.com"
SITEMAP_PATH = "../public/sitemap.xml"

# Gemini 模型配置
GEMINI_MODEL = "gemini-2.5-flash-preview-05-20"

# 支持的语言
SUPPORTED_LANGUAGES = {
    "en": "English",
    "zh": "Chinese (Simplified)"
}

# 文章状态
POST_STATUS = {
    "CREATED": "created",
    "ONLINE": "online",
    "OFFLINE": "offline",
    "DELETED": "deleted"
} 