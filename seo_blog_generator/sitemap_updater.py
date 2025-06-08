import xml.etree.ElementTree as ET
from datetime import datetime
from config import SITEMAP_PATH, SITE_URL
import os
from database import DatabaseManager

class SitemapUpdater:
    def __init__(self):
        self.sitemap_path = SITEMAP_PATH
        self.site_url = SITE_URL
        self.namespace = {"": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    
    def read_sitemap(self):
        """读取现有的 sitemap.xml 文件"""
        try:
            if os.path.exists(self.sitemap_path):
                tree = ET.parse(self.sitemap_path)
                root = tree.getroot()
                return tree, root
            else:
                print("❌ sitemap.xml 文件不存在")
                return None, None
        except Exception as e:
            print(f"❌ 读取 sitemap.xml 失败: {e}")
            return None, None
    
    def get_existing_urls(self, root):
        """获取现有的所有 URL"""
        urls = set()
        for url_elem in root.findall(".//url", self.namespace):
            loc_elem = url_elem.find("loc", self.namespace)
            if loc_elem is not None:
                urls.add(loc_elem.text)
        return urls
    
    def add_blog_post_url(self, slug, locale="en"):
        """添加新的博客文章 URL 到 sitemap"""
        try:
            tree, root = self.read_sitemap()
            if tree is None or root is None:
                return False
            
            # 构建新的 URL
            if locale == "en":
                new_url = f"{self.site_url}/posts/{slug}"
            else:
                new_url = f"{self.site_url}/{locale}/posts/{slug}"
            
            # 检查 URL 是否已存在
            existing_urls = self.get_existing_urls(root)
            if new_url in existing_urls:
                print(f"⚠️ URL 已存在于 sitemap 中: {new_url}")
                return True
            
            # 创建新的 URL 元素
            url_elem = ET.Element("url")
            
            loc_elem = ET.SubElement(url_elem, "loc")
            loc_elem.text = new_url
            
            lastmod_elem = ET.SubElement(url_elem, "lastmod")
            lastmod_elem.text = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S+00:00")
            
            changefreq_elem = ET.SubElement(url_elem, "changefreq")
            changefreq_elem.text = "daily"
            
            priority_elem = ET.SubElement(url_elem, "priority")
            priority_elem.text = "0.7"
            
            # 将新 URL 添加到 sitemap
            root.append(url_elem)
            
            # 保存更新后的 sitemap
            self.save_sitemap(tree)
            
            print(f"✅ 已添加到 sitemap: {new_url}")
            return True
            
        except Exception as e:
            print(f"❌ 更新 sitemap 失败: {e}")
            return False
    
    def update_sitemap_from_db(self):
        """从数据库获取所有 slug 更新 sitemap"""
        try:
            print("🚀 开始从数据库更新 sitemap...")
            
            # 1. 获取数据库中的所有 slug
            db_manager = DatabaseManager()
            posts = db_manager.get_all_post_slugs()
            db_manager.close()
            
            if not posts:
                print("ℹ️ 数据库中没有找到已发布的文章。")
                return True
            
            # 2. 读取现有的 sitemap
            tree, root = self.read_sitemap()
            if tree is None or root is None:
                return False
            
            existing_urls = self.get_existing_urls(root)
            added_count = 0
            
            # 3. 遍历数据库中的文章并更新 sitemap
            for post in posts:
                slug = post.get("slug")
                locale = post.get("locale", "en") # 默认为 "en"
                
                if not slug:
                    continue

                if locale == "en":
                    new_url = f"{self.site_url}/posts/{slug}"
                else:
                    new_url = f"{self.site_url}/{locale}/posts/{slug}"
                
                if new_url not in existing_urls:
                    # 创建新的 URL 元素
                    url_elem = ET.Element("url")
                    
                    loc_elem = ET.SubElement(url_elem, "loc")
                    loc_elem.text = new_url
                    
                    lastmod_elem = ET.SubElement(url_elem, "lastmod")
                    lastmod_elem.text = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S+00:00")
                    
                    changefreq_elem = ET.SubElement(url_elem, "changefreq")
                    changefreq_elem.text = "daily"
                    
                    priority_elem = ET.SubElement(url_elem, "priority")
                    priority_elem.text = "0.7"
                    
                    root.append(url_elem)
                    added_count += 1
                    print(f"  -> 添加新 URL: {new_url}")

            if added_count > 0:
                self.save_sitemap(tree)
                print(f"✅ 成功添加 {added_count} 个新 URL 到 sitemap。")
            else:
                print("✅ sitemap 已是最新，无需更新。")

            return True

        except Exception as e:
            print(f"❌ 从数据库更新 sitemap 失败: {e}")
            return False
    
    def save_sitemap(self, tree):
        """保存 sitemap 到文件"""
        try:
            # 添加 XML 声明
            ET.register_namespace("", "http://www.sitemaps.org/schemas/sitemap/0.9")
            
            # 写入文件
            tree.write(self.sitemap_path, encoding="utf-8", xml_declaration=True)
            
            # 格式化文件（可选：美化 XML 格式）
            self.format_sitemap()
            
            print(f"✅ sitemap 已更新: {self.sitemap_path}")
            return True
            
        except Exception as e:
            print(f"❌ 保存 sitemap 失败: {e}")
            return False
    
    def format_sitemap(self):
        """格式化 sitemap.xml 文件以提高可读性"""
        try:
            with open(self.sitemap_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 简单的格式化：添加换行和缩进
            content = content.replace('><', '>\n<')
            content = content.replace('<url>', '  <url>')
            content = content.replace('</url>', '  </url>')
            content = content.replace('<loc>', '    <loc>')
            content = content.replace('<lastmod>', '    <lastmod>')
            content = content.replace('<changefreq>', '    <changefreq>')
            content = content.replace('<priority>', '    <priority>')
            
            with open(self.sitemap_path, 'w', encoding='utf-8') as f:
                f.write(content)
                
        except Exception as e:
            print(f"⚠️ 格式化 sitemap 失败: {e}")
    
    def validate_sitemap(self):
        """验证 sitemap 格式是否正确"""
        try:
            tree, root = self.read_sitemap()
            if tree is None:
                return False
            
            # 检查根元素
            if root.tag != "{http://www.sitemaps.org/schemas/sitemap/0.9}urlset":
                print("❌ sitemap 根元素格式错误")
                return False
            
            # 检查 URL 元素
            url_count = 0
            for url_elem in root.findall(".//url", self.namespace):
                url_count += 1
                loc_elem = url_elem.find("loc", self.namespace)
                if loc_elem is None or not loc_elem.text:
                    print(f"❌ 发现无效的 URL 元素 (第 {url_count} 个)")
                    return False
            
            print(f"✅ sitemap 验证通过，共 {url_count} 个 URL")
            return True
            
        except Exception as e:
            print(f"❌ sitemap 验证失败: {e}")
            return False 