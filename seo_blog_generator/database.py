import uuid
from datetime import datetime
import re
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, POST_STATUS

class DatabaseManager:
    def __init__(self):
        self.supabase: Client = None
        self.connect()
    
    def connect(self):
        """连接到 Supabase"""
        try:
            if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
                raise ValueError("❌ Supabase 配置信息缺失")
            
            self.supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
            print("✅ Supabase 连接成功")
        except Exception as e:
            print(f"❌ Supabase 连接失败: {e}")
            raise
    
    def insert_post(self, title, slug, description, content, locale, cover_url=None, author_name=None, author_avatar_url=None):
        """插入新文章到 posts 表"""
        try:
            post_uuid = str(uuid.uuid4())
            now = datetime.utcnow().isoformat()
            
            post_data = {
                "uuid": post_uuid,
                "slug": slug,
                "title": title,
                "description": description,
                "content": content,
                "created_at": now,
                "updated_at": now,
                "status": POST_STATUS["ONLINE"],
                "cover_url": cover_url,
                "author_name": author_name,
                "author_avatar_url": author_avatar_url,
                "locale": locale
            }
            
            result = self.supabase.table("posts").insert(post_data).execute()
            
            if result.data:
                print(f"✅ 文章插入成功: {title}")
                return result.data[0]
            else:
                raise Exception("插入返回数据为空")
                
        except Exception as e:
            print(f"❌ 文章插入失败: {e}")
            raise
    
    def find_post_by_slug(self, slug, locale):
        """通过 slug 和 locale 查找文章"""
        try:
            result = self.supabase.table("posts").select("*").eq("slug", slug).eq("locale", locale).limit(1).execute()
            
            if result.data:
                return result.data[0]
            return None
            
        except Exception as e:
            print(f"❌ 查询文章失败: {e}")
            return None
    
    def get_all_posts(self, locale=None):
        """获取所有文章，可按语言过滤"""
        try:
            query = self.supabase.table("posts").select("*").eq("status", POST_STATUS["ONLINE"]).order("created_at", desc=True)
            
            if locale:
                query = query.eq("locale", locale)
            
            result = query.execute()
            return result.data if result.data else []
            
        except Exception as e:
            print(f"❌ 获取文章列表失败: {e}")
            return []
    
    def get_all_post_slugs(self):
        """获取所有已上线文章的 slug 和 locale"""
        try:
            result = self.supabase.table("posts").select("slug, locale").eq("status", POST_STATUS["ONLINE"]).execute()
            return result.data if result.data else []
        except Exception as e:
            print(f"❌ 获取所有 slug 失败: {e}")
            return []
    
    def generate_unique_slug(self, title, locale):
        """生成唯一的 slug"""
        # 基础 slug 生成
        slug = re.sub(r'[^\w\s-]', '', title.lower())
        slug = re.sub(r'[-\s]+', '-', slug).strip('-')
        
        original_slug = slug
        counter = 1
        
        # 检查 slug 是否已存在
        while self.find_post_by_slug(slug, locale):
            slug = f"{original_slug}-{counter}"
            counter += 1
        
        return slug
    
    def close(self):
        """关闭连接（Supabase SDK 自动管理连接）"""
        print("✅ Supabase 连接资源已释放") 