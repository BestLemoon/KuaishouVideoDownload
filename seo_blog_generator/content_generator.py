import json
import re
import os
import time
import google.generativeai as genai
from config import GEMINI_API_KEY, GEMINI_MODEL, SITEMAP_PATH

class ContentGenerator:
    def __init__(self):
        self.api_key = GEMINI_API_KEY
        if not self.api_key:
            raise ValueError("❌ GEMINI_API_KEY 未设置")
        
        # 配置 Gemini API
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(GEMINI_MODEL)
        
        self.sitemap_content = self._read_sitemap()
        self.system_prompt = self._get_system_prompt()
        
        print("✅ Gemini API 初始化成功")
    
    def generate_topic_suggestions(self, theme="", language="English", count=5):
        """生成文章题目建议"""
        try:
            topic_prompt = f"""你是一位资深的SEO内容策划师，专注于 TwitterDown（Twitter视频下载器）相关内容创作。

## 任务
请为 TwitterDown 生成 {count} 个高质量的SEO博客文章题目建议。

## 主题方向
{theme if theme else "围绕Twitter视频下载、社交媒体内容管理、视频保存技巧等相关话题"}

## 目标受众
- Content Creators（内容创作者）
- Social Media Managers（社交媒体经理）
- Marketers（营销人员）
- Researchers（研究人员）
- Individual Users（个人用户）

## 现有内容（避免重复）
{chr(10).join([f"- {url.split('/')[-1]}" for url in self.sitemap_content['existing_posts'][:10]])}

## 要求
- 标题应该吸引点击，解决用户痛点
- 符合SEO最佳实践，包含相关关键词
- 每个标题控制在60字符以内
- 适合 {language} 语言用户
- 避免与现有内容重复
- 题目应该实用、有价值

## 输出格式
请直接输出 {count} 个题目，每行一个，不需要编号：

题目1
题目2
题目3
...

请开始生成：

(内部注释，确保独特性: {time.time()})"""

            print(f"🎯 正在生成{count}个{language}题目建议...")
            
            response = self.model.generate_content(
                topic_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.8,
                    top_k=40,
                    top_p=0.9,
                    
                )
            )
            
            if not response.candidates:
                prompt_feedback = response.prompt_feedback if hasattr(response, 'prompt_feedback') else "N/A"
                raise ValueError(f"API返回了空的候选列表。反馈: {prompt_feedback}")

            candidate = response.candidates[0]
            
            # Finish reason 1 is STOP, which is good. Others are errors.
            if candidate.finish_reason != 1:
                 raise ValueError(f"内容生成提前终止, 原因: {candidate.finish_reason.name} ({candidate.finish_reason.value}). 安全评级: {candidate.safety_ratings}")

            if not response.text:
                raise ValueError("API返回内容为空，即使成功终止。")
            
            # 解析题目
            topics = []
            lines = response.text.strip().split('\n')
            for line in lines:
                line = line.strip()
                if line and not line.startswith('#') and not line.startswith('-'):
                    # 清理可能的编号
                    topic = re.sub(r'^\d+\.?\s*', '', line)
                    topic = re.sub(r'^[•\-\*]\s*', '', topic)
                    if topic:
                        topics.append(topic)
            
            # 确保返回指定数量的题目
            topics = topics[:count]
            
            print(f"✅ 成功生成{len(topics)}个题目建议")
            return topics
            
        except Exception as e:
            print(f"❌ 题目生成失败: {e}")
            # 返回默认题目作为备选
            return self.get_default_topics(count, language)

    def get_default_topics(self, count, language="English"):
        """返回默认的备选题目"""
        default_topics_zh = [
            "Twitter视频下载完整指南：最佳工具和方法推荐",
            "如何批量保存Twitter视频：提升工作效率的秘诀",
            "社交媒体内容管理：Twitter视频归档最佳实践",
            "Twitter视频下载常见问题解决方案大全",
            "移动端下载Twitter视频：iOS和Android完整教程"
        ]
        default_topics_en = [
            "The Complete Guide to Downloading Twitter Videos: Best Tools and Methods",
            "How to Bulk Save Twitter Videos: Secrets to Boost Your Workflow",
            "Social Media Content Management: Best Practices for Archiving Twitter Videos",
            "Common Problems and Solutions for Downloading Twitter Videos",
            "How to Download Twitter Videos on Mobile: A Complete iOS and Android Tutorial"
        ]
        
        if "chinese" in language.lower() or "中文" in language:
            return default_topics_zh[:count]
        else:
            return default_topics_en[:count]
    
    def _read_sitemap(self):
        """读取 sitemap.xml 内容"""
        try:
            sitemap_file = os.path.join(os.path.dirname(__file__), SITEMAP_PATH)
            if os.path.exists(sitemap_file):
                with open(sitemap_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # 提取现有的博客文章链接
                existing_posts = []
                lines = content.split('\n')
                for line in lines:
                    if '/posts/' in line and '<loc>' in line:
                        url = line.strip().replace('<loc>', '').replace('</loc>', '')
                        existing_posts.append(url)
                
                return {
                    'full_content': content,
                    'existing_posts': existing_posts,
                    'total_urls': len([l for l in lines if '<loc>' in l])
                }
            else:
                print("⚠️ sitemap.xml 文件未找到")
                return {'full_content': '', 'existing_posts': [], 'total_urls': 0}
        except Exception as e:
            print(f"⚠️ 读取 sitemap.xml 失败: {e}")
            return {'full_content': '', 'existing_posts': [], 'total_urls': 0}
    
    def _get_system_prompt(self):
        """获取详细的系统提示词"""
        return """## 角色（Role）

你是一位资深的SEO文章创作者，在内容创作领域摸爬滚打了多年，深谙读者心理，拥有丰富的内容创作经验。你擅长根据我提供的标题进行创作，通过极具感染力的内容来吸引和打动用户。

## 关于 TwitterDown

TwitterDown 是一个专业的 Twitter 视频下载器服务，提供快速、可靠的高质量视频下载功能。主要特性包括：
- 免费 Twitter 视频下载
- 高质量视频下载（HD、Full HD、4K）
- 无需注册
- 快速安全的下载体验
- 支持视频、GIF 和图片
- 跨平台支持（移动端、桌面端、平板）
- 无水印下载
- 支持多种格式（MP4、MP3）
- 为开发者提供 API 访问

## 目标受众

- **Content Creators** - 需要保存和重用Twitter视频内容
- **Social Media Managers** - 管理和归档社交媒体内容  
- **Marketers** - 分析和复用竞争对手的视频内容
- **Researchers** - 收集和研究社交媒体视频数据
- **Individual Users** - 个人用户保存喜欢的Twitter视频

## 网站结构信息

根据当前 sitemap，TwitterDown 具有以下结构：
- 主要页面：首页、多语言定价页面（en, zh, es, fr, de, ja, ko, ar）
- 博客部分：/posts/ 支持不同语言
- 现有博客文章：{existing_posts_count} 篇文章
- 支持语言：英语、中文、西班牙语、法语、德语、日语、韩语、阿拉伯语

现有博客文章：
{existing_posts_list}

请确保你的内容补充现有内容，不重复主题，考虑到相关现有页面的内链机会。

## 写作要求

### 文章结构
文章结构应自然流畅，避免明显的模板痕迹：
- 可以从故事、问题、现象或个人感悟任意角度切入
- 不必严格遵循"开篇-主体-结尾"的固定模式
- 允许适当跳跃或转折，像人类自然思考那样展开
- 格式：使用一级，二级和三级标题进行分层，段落间空行，保持Markdown格式

### 语言与风格
- 写作时保持自然随性，像在与朋友聊天或分享经验那样表达
- 避免过于规整的表达方式，让文字有生命力
- 展现真实的思考过程
- 撰写的视角根据文章的内容需要进行自然切换
- 真实性/可信度高，引用具体的人物和事实，明确来源

### 链接要求
- 每篇文章必须包含 3-5 个外部链接
- 包括内链（链接到我们现有的页面）和外链（链接到权威的相关资源）
- 不要编造链接，确保所有链接真实有效
- 自然地融入链接，避免生硬插入

### 限制
- 禁止出现任何机构名称、医院名称、学校名称、产品名称、电话、地址等具体信息
- 禁止出现有序序号或排序文字
- 禁止出现特定的过渡词和表达方式
- 禁止任何括号及说明性标记
- 段落结尾不使用任何标点符号

**输出格式要求：**
使用以下分隔符格式：

===TITLE_START===
[SEO优化的标题，最多60个字符]
===TITLE_END===

===SLUG_START===
[URL友好的slug]
===SLUG_END===

===DESCRIPTION_START===
[元描述，150-160字符，吸引人的摘要]
===DESCRIPTION_END===

===CONTENT_START===
[完整的文章内容，Markdown格式，包含适当的标题、列表和结构，以及3-5个链接]
===CONTENT_END===""".format(
            existing_posts_count=len(self.sitemap_content['existing_posts']),
            existing_posts_list='\n'.join([f"- {url}" for url in self.sitemap_content['existing_posts'][:10]])
        )

    def _call_gemini_api(self, prompt, language="English"):
        """使用 Gemini SDK 调用 API"""
        try:
            # 构建完整的提示词
            full_prompt = f"""{self.system_prompt}

**Language:** Please write the content in {language}.

**Topic:** {prompt}

**重要提醒：** 你必须严格按照要求生成1000字的文章，包含3-5个真实的外部链接，使用分隔符格式输出。文章应该自然流畅，避免AI痕迹。

Please generate a comprehensive, SEO-optimized article about this topic following the guidelines above."""
            
            print(f"🤖 正在生成{language}内容...")
            
            # 使用 Gemini SDK 生成内容
            response = self.model.generate_content(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    top_k=40,
                    top_p=0.95,
                    max_output_tokens=4096,
                )
            )
            
            try:
                # 检查是否有有效响应
                _ = response.text
            except Exception as e:
                print(f"❌ 内容生成失败: {e}")
                if response.prompt_feedback:
                    print(f"   - Prompt Feedback: {response.prompt_feedback}")
                raise ValueError("The response text could not be accessed. This might be due to safety settings or other issues.")

            if not response.text:
                raise Exception("API 返回内容为空")
            
            print(f"✅ {language}内容生成成功")
            print(f"📄 返回内容长度: {len(response.text)} 字符")
            return response.text
            
        except Exception as e:
            raise Exception(f"Gemini API 调用失败: {e}")
    
    def parse_content(self, raw_content):
        """解析 Gemini 返回的内容，提取 title, description, content"""
        try:
            content = raw_content.strip()
            
            # 使用分隔符格式解析
            title = self._extract_delimiter_content(content, "===TITLE_START===", "===TITLE_END===")
            slug = self._extract_delimiter_content(content, "===SLUG_START===", "===SLUG_END===")
            description = self._extract_delimiter_content(content, "===DESCRIPTION_START===", "===DESCRIPTION_END===")
            article_content = self._extract_delimiter_content(content, "===CONTENT_START===", "===CONTENT_END===")
            
            if title and description and article_content:
                print("✅ 分隔符格式解析成功")
                return {
                    "title": title.strip(),
                    "slug": slug.strip() if slug else "",
                    "description": description.strip(),
                    "content": article_content.strip()
                }
            
            # 备用解析：尝试 JSON 格式（兼容性）
            print("🔄 尝试 JSON 格式解析...")
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            
            if json_start != -1 and json_end > json_start:
                json_content = content[json_start:json_end]
                try:
                    content_data = json.loads(json_content)
                    if all(key in content_data for key in ["title", "description", "content"]):
                        print("✅ JSON 格式解析成功（备用）")
                        return {
                            "title": content_data["title"].strip(),
                            "slug": content_data.get("slug", "").strip(),
                            "description": content_data["description"].strip(),
                            "content": content_data["content"].strip()
                        }
                except json.JSONDecodeError:
                    pass
            
            # 最后的备用解析：从 markdown 中提取
            print("🔄 使用 markdown 解析方法...")
            lines = content.split('\n')
            title = ""
            description = ""
            content_lines = []
            
            for line in lines:
                line_stripped = line.strip()
                if line_stripped.startswith('# ') and not title:
                    title = line_stripped[2:]
                elif line_stripped.startswith('## ') and not description:
                    # 如果第一个二级标题作为描述的一部分
                    description = f"Learn about {line_stripped[3:].lower()}"
                else:
                    content_lines.append(line)
            
            final_content = '\n'.join(content_lines).strip()
            
            return {
                "title": title or "Generated Article",
                "slug": "",
                "description": description or f"Comprehensive guide about {title.lower()}" if title else "AI Generated Article about Twitter video downloading",
                "content": final_content or content
            }
            
        except Exception as e:
            print(f"❌ 内容解析异常: {e}")
            return {
                "title": "Generated Article",
                "slug": "",
                "description": "AI Generated Article about Twitter video downloading",
                "content": raw_content
            }
    
    def _extract_delimiter_content(self, content, start_delimiter, end_delimiter):
        """从分隔符中提取内容"""
        try:
            start_idx = content.find(start_delimiter)
            end_idx = content.find(end_delimiter)
            
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                start_idx += len(start_delimiter)
                extracted = content[start_idx:end_idx].strip()
                return extracted
            return ""
        except Exception:
            return ""
    
    def _extract_json_value(self, line):
        """从JSON行中提取值"""
        try:
            # 查找冒号后的值
            if ':' in line:
                value_part = line.split(':', 1)[1].strip()
                # 移除引号和逗号
                value_part = value_part.strip('"').strip("'").rstrip(',').strip()
                return value_part
        except:
            pass
        return ""
    
    def generate_article(self, topic, language="English"):
        """生成文章"""
        try:
            # 调用 API 生成内容
            raw_content = self._call_gemini_api(topic, language)
            
            # 解析内容
            parsed_content = self.parse_content(raw_content)
            
            print(f"📝 文章生成完成:")
            print(f"   标题: {parsed_content['title']}")
            print(f"   描述: {parsed_content['description'][:100]}...")
            
            return parsed_content
            
        except Exception as e:
            print(f"❌ 文章生成失败: {e}")
            raise