import requests
import random
from config import UNSPLASH_ACCESS_KEY, DEFAULT_COVER_URL

class ImageDownloader:
    def __init__(self):
        self.access_key = UNSPLASH_ACCESS_KEY
        self.base_url = "https://api.unsplash.com"
    
    def get_twitter_cover_image(self):
        """从 Unsplash 获取 Twitter 相关的封面图片"""
        if not self.access_key:
            print("⚠️ Unsplash API 密钥未设置，使用默认封面图片")
            return DEFAULT_COVER_URL
        
        try:
            # 搜索 Twitter 相关图片
            search_url = f"{self.base_url}/search/photos"
            params = {
                "query": "twitter",
                "per_page": 30,
                "orientation": "landscape",
                "content_filter": "high"
            }
            headers = {
                "Authorization": f"Client-ID {self.access_key}"
            }
            
            response = requests.get(search_url, params=params, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])
                
                if results:
                    # 随机选择一张图片
                    image = random.choice(results)
                    image_url = image["urls"]["regular"]
                    
                    print(f"✅ 获取到 Unsplash 图片: {image_url}")
                    return image_url
                else:
                    print("⚠️ 未找到相关图片，使用默认封面")
                    return DEFAULT_COVER_URL
            else:
                print(f"⚠️ Unsplash API 请求失败 ({response.status_code})，使用默认封面")
                return DEFAULT_COVER_URL
                
        except requests.exceptions.Timeout:
            print("⚠️ Unsplash API 请求超时，使用默认封面")
            return DEFAULT_COVER_URL
        except Exception as e:
            print(f"⚠️ 获取图片失败: {e}，使用默认封面")
            return DEFAULT_COVER_URL
    
    def validate_image_url(self, image_url):
        """验证图片链接是否可访问"""
        try:
            response = requests.head(image_url, timeout=10)
            if response.status_code == 200:
                print(f"✅ 图片链接验证成功: {image_url}")
                return True
            else:
                print(f"⚠️ 图片链接验证失败 ({response.status_code}): {image_url}")
                return False
        except Exception as e:
            print(f"⚠️ 图片链接验证异常: {e}")
            return False
    
    def download_and_save_image(self, image_url, file_path):
        """下载图片并保存到本地（可选功能，当前项目不使用）"""
        try:
            response = requests.get(image_url, timeout=30)
            if response.status_code == 200:
                with open(file_path, 'wb') as f:
                    f.write(response.content)
                print(f"✅ 图片已保存到: {file_path}")
                return True
            else:
                print(f"❌ 图片下载失败 ({response.status_code})")
                return False
        except Exception as e:
            print(f"❌ 图片保存失败: {e}")
            return False 