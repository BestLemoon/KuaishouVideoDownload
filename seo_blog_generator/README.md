# SEO 博客自动生成器

这是一个为 TwitterDown 网站自动生成 SEO 优化博客文章的 Python 工具。

## 🌟 功能特点

- 🤖 **AI 内容生成**: 使用 Gemini API 生成高质量 SEO 内容
- 🌍 **多语言支持**: 支持中文和英文文章生成
- 🎨 **自动配图**: 从 Unsplash 获取相关封面图片
- 🗄️ **数据库集成**: 直接写入 Supabase 数据库
- 🗺️ **SEO 优化**: 自动更新 sitemap.xml
- 🚀 **一键部署**: 集成 Vercel 部署功能

## 📋 前置要求

- Python 3.7+
- Node.js (用于 Vercel 部署)
- Vercel CLI
- 必要的 API 密钥

## 🚀 快速开始

### 1. 安装依赖

```bash
cd seo_blog_generator
pip install -r requirements.txt
```

### 2. 配置环境变量

创建 `.env` 文件并添加以下配置：

```env
# Gemini API 密钥 (必须)
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase 配置 (必须)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Unsplash API 密钥 (可选，不设置则使用默认封面)
UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here
```

### 3. 运行程序

#### 交互式模式
```bash
python main.py
```

#### 命令行模式
```bash
# 生成题目建议
python main.py topics "视频下载技巧"

# 生成双语文章
python main.py "如何下载 Twitter 视频"
```

## 📖 使用说明

### 交互式模式菜单

1. **生成文章题目建议**: AI 智能生成多个吸引人的题目供选择
2. **生成单篇文章**: 指定语言生成单篇文章
3. **生成双语文章**: 同时生成中英文版本
4. **批量生成文章**: 一次生成多篇文章
5. **验证 sitemap**: 检查 sitemap.xml 格式
6. **部署到 Vercel**: 自动部署到生产环境
7. **查看文章列表**: 显示已生成的文章

### 文章生成流程

1. 🎯 **智能题目建议**: AI 分析现有内容，生成创新题目
2. 🤖 **内容创作**: 使用您自定义的详细 prompt 生成高质量内容
3. 🔗 **外链集成**: 自动在文章中添加 3-5 个相关的内外链
4. 📝 **内容解析**: 提取标题、slug、描述和正文内容
5. 🎨 **封面获取**: 从 Unsplash 获取相关封面图片
6. 💾 **数据保存**: 写入 Supabase 数据库
7. 🗺️ **SEO 优化**: 自动更新 sitemap.xml
8. 🚀 **一键部署**: 可选部署到 Vercel 生产环境

## 🔧 配置说明

### 默认配置
- **封面图片**: `https://www.twitterdown.com/imgs/TwitterDownAPICover.png`
- **作者名称**: `TwitterDown`
- **作者头像**: `https://www.twitterdown.com/logo.png`
- **文章状态**: `online`

### API 配置
- **Gemini API**: 使用官方 google-generativeai SDK，默认 gemini-1.5-flash-latest 模型
- **Unsplash**: 搜索 "twitter" 关键词
- **数据库**: Supabase 官方 Python SDK

## 📁 文件结构

```
seo_blog_generator/
├── main.py              # 主程序入口
├── config.py            # 配置文件
├── database.py          # 数据库操作
├── content_generator.py # 内容生成
├── image_downloader.py  # 图片下载
├── sitemap_updater.py   # Sitemap 更新
├── requirements.txt     # 依赖包
└── README.md           # 使用说明
```

## 🎯 SEO 优化特性

### 内容优化
- 自然语言写作，避免关键词堆砌
- 1000-2000 字的深度内容
- 清晰的标题层级结构
- 实用的步骤说明和 FAQ

### 技术优化
- 自动生成 meta description
- SEO 友好的 URL slug
- 自动更新 sitemap.xml
- 结构化的内容格式

## 🛠️ 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY
   - 确认网络连接正常

2. **Gemini API 调用失败**
   - 验证 GEMINI_API_KEY 是否正确
   - 检查 API 额度是否充足

3. **Vercel 部署失败**
   - 确认已安装 Vercel CLI
   - 检查是否在项目根目录

### 日志说明
- ✅ 成功操作
- ❌ 错误信息
- ⚠️ 警告信息
- 🤖 AI 生成进度
- 🚀 部署相关

## 📊 性能建议

- 批量生成时建议间隔 2 秒，避免 API 限制
- 单次运行建议不超过 20 篇文章
- 定期检查 sitemap.xml 格式正确性

## 🔄 更新记录

- v1.2.0: 智能题目生成和高级 prompt 集成
  - 🎯 新增 AI 题目建议功能，智能生成吸引人的标题
  - 📝 集成用户自定义的 1000+ 字详细 prompt
  - 🔗 自动添加 3-5 个外部链接（内链+外链）
  - 🎨 支持自然随性的写作风格，避免 AI 痕迹
  - 🚀 两步生成流程：先选题目，再生成内容
- v1.1.0: 使用官方 SDK 重构
  - 使用 google-generativeai SDK 替代 curl 调用
  - 使用 Supabase Python SDK 替代直接 PostgreSQL 连接
  - 优化分隔符格式解析，避免 JSON 转义问题
  - 集成 sitemap 内容到 AI 提示词
- v1.0.0: 初始版本，支持中英文文章生成

## 📝 注意事项

1. 请确保 API 密钥的安全性，不要提交到版本控制
2. 生成的内容建议人工审核后再发布
3. 遵守各 API 服务的使用条款和限制
4. 定期备份数据库数据

## 📞 技术支持

如有问题，请检查：
1. 环境变量配置是否正确
2. 网络连接是否正常
3. API 密钥是否有效
4. 依赖包是否正确安装 