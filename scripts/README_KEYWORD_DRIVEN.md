# 关键词驱动文章生成脚本使用指南

## 概述

`auto_generate_articles.py` 已升级为关键词驱动版本，采用先进的SEO策略生成高质量文章。

## 主要功能

### 🎯 关键词驱动工作流程
1. **AI种子关键词生成** - 生成8个高价值种子关键词
2. **Google自动完成扩展** - 每个种子词扩展6个相关建议
3. **智能分类生成** - 按内容策略分类生成文章题目
4. **关键词优化写作** - 在文章中自然融入相关关键词

### 📚 文章分类策略

#### 🔍 搜索型关键词文章（每日3篇）
- 针对长尾关键词和用户搜索意图
- 如："How to download Twitter videos on iPhone"
- 解决具体用户问题

#### 📘 教程型/列表型文章（每日1篇）
- 增加分享率，适合内部链接
- 如："Top 5 Twitter Video Downloaders 2025"
- 比较、排行、完整指南类型

#### 🌍 双语对照内容（每日2篇）
- 一键生成中英文版本
- 适配中英文流量，提升页面密度
- 同一主题的双语版本

#### 🧪 A/B测试型关键词（每日1篇）
- 试验冷门关键词，观察意外流量
- 探索性、新颖角度的内容

## 使用方法

### 基础用法

```bash
# 默认执行关键词驱动双语生成
python auto_generate_articles.py

# 或者明确指定关键词模式
python auto_generate_articles.py keywords
```

### 语言特定生成

```bash
# 仅生成中文内容
python auto_generate_articles.py keywords chinese
python auto_generate_articles.py keywords zh
python auto_generate_articles.py keywords 中文

# 仅生成英文内容
python auto_generate_articles.py keywords english
python auto_generate_articles.py keywords en
python auto_generate_articles.py keywords 英文

# 生成双语内容（默认）
python auto_generate_articles.py keywords both
```

### 测试功能

```bash
# 运行测试脚本验证功能
python test_keyword_generation.py
```

## 环境要求

### 必需的环境变量
```bash
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_key
UNSPLASH_ACCESS_KEY=your_unsplash_key  # 可选
NEXT_PUBLIC_WEB_URL=https://twitterdown.com
```

### Python依赖
```bash
pip install google-generativeai supabase requests
```

## 输出示例

### 执行流程
```
🚀 开始执行每日关键词驱动文章生成任务
============================================================

🇨🇳 开始中文关键词驱动生成...

🎯 开始Chinese (Simplified)关键词驱动的内容生成流程...

📊 步骤1: 生成Chinese (Simplified)种子关键词
🔑 Chinese (Simplified)种子关键词:
   1. twitter视频下载
   2. 推特视频保存
   3. 社交媒体视频下载
   4. twitter下载器
   5. 视频下载工具
   6. twitter保存

🔍 步骤2: 扩展Chinese (Simplified)关键词
🔍 获取'twitter视频下载'的Google自动完成建议...
✅ 获取到5个自动完成建议
...

📈 Chinese (Simplified)扩展后的关键词集合:
   🌱 twitter视频下载: 5个建议
   🌱 推特视频保存: 5个建议
   总计: 6个种子关键词 → 30个扩展关键词

📝 步骤3: 生成Chinese (Simplified)分类文章题目
📚 Chinese (Simplified)生成的分类文章题目:
   📂 search_keywords: 3个题目
   📂 tutorial_lists: 1个题目
   📂 bilingual_content: 2个题目
   📂 ab_test_keywords: 1个题目

🚀 步骤4: 开始生成Chinese (Simplified)文章...
```

### 日志记录
脚本会自动在数据库中记录执行日志，包括：
- 执行日期
- 各语言成功/失败统计
- 生成方法标识（keyword_driven）

## 优势特点

### 🎯 SEO优化
- 基于真实搜索数据的关键词策略
- Google自动完成API提供热门搜索建议
- 自然关键词融入，避免过度优化

### 🌍 双语支持
- 智能中英文内容生成
- 语言特定的关键词策略
- 适配不同地区的搜索习惯

### 📊 数据驱动
- 详细的执行统计和日志
- 可追踪的文章分类和关键词来源
- 支持A/B测试和效果分析

### 🔄 可扩展性
- 模块化设计，易于添加新功能
- 支持不同的内容策略
- 灵活的关键词扩展机制

## 注意事项

1. **API限制**: Google自动完成API有频率限制，脚本已加入延迟处理
2. **网络依赖**: 需要稳定的网络连接访问Google API和Gemini API
3. **内容质量**: 建议定期检查生成内容的质量和相关性
4. **关键词更新**: 可考虑定期更新种子关键词策略

## 故障排除

### 常见问题

1. **Google API失败**: 检查网络连接，脚本会自动使用默认关键词
2. **Gemini API错误**: 确认API密钥正确，检查API配额
3. **数据库连接问题**: 验证Supabase配置和网络连接

### 日志查看
脚本会在控制台输出详细的执行日志，包括每个步骤的成功/失败状态。 