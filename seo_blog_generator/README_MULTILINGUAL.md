# 多语言关键词驱动SEO博客生成器

## 概述

这是一个基于Google Search Console关键词的多语言SEO博客生成器。它能够自动识别关键词的语言，并为不同语言生成对应的优化文章。

## 功能特性

### 🌍 多语言支持
- **英语 (en)** - English
- **中文简体 (zh)** - Chinese (Simplified)  
- **中文繁体 (zh-tw)** - Chinese (Traditional)
- **韩语 (ko)** - Korean
- **日语 (ja)** - Japanese
- **法语 (fr)** - French
- **西班牙语 (es)** - Spanish
- **阿拉伯语 (ar)** - Arabic
- **德语 (de)** - German

### 🔍 智能语言检测
- 基于字符集识别（拉丁文、汉字、韩文、阿拉伯文等）
- 关键词匹配验证
- 支持混合语言关键词

### 📝 自动文章生成
- 针对每种语言生成相应的文章主题
- 基于关键词构建SEO优化内容
- 自动保存到对应的locale数据库

### ⚙️ 灵活的运行模式
- **交互式模式**: 手动控制生成过程
- **自动化模式**: 定时批量生成
- **命令行模式**: 脚本化集成

## 安装依赖

```bash
# 在seo_blog_generator目录下
pip install schedule unicodedata
```

## 使用方法

### 1. 准备关键词文件

在`seo_blog_generator`目录下创建`keywords_gsc.txt`文件，每行一个关键词：

```
# GSC关键词文件示例
download twitter video
트위터 동영상 다운로드
推特视频下载
twitter-video erstellen kostenlos
تحميل فيديو تويتر
```

### 2. 基本使用

#### 方式一: 通过主程序使用

```bash
cd seo_blog_generator
python main.py
# 选择菜单选项 6: 🌍 多语言关键词驱动生成
```

#### 方式二: 直接使用多语言生成器

```bash
cd seo_blog_generator
python multilingual_keyword_generator.py
```

#### 方式三: 使用自动化生成器

```bash
cd seo_blog_generator
python auto_multilingual_generator.py
```

### 3. 命令行参数

```bash
# 分析模式 - 仅分析关键词分布
python multilingual_keyword_generator.py --mode analyze

# 每日生成模式 - 每种语言生成3篇文章
python multilingual_keyword_generator.py --mode daily --articles-per-language 3

# 重点生成模式 - 仅针对指定语言
python multilingual_keyword_generator.py --mode focused --target-languages en zh ko

# 自动化守护进程
python auto_multilingual_generator.py --mode daemon

# 立即执行一次任务
python auto_multilingual_generator.py --mode once --task daily
```

## 配置选项

### 自动化配置文件 (auto_generator_config.json)

```json
{
  "keywords_file": "keywords_gsc.txt",
  "schedule": {
    "daily": {
      "enabled": true,
      "time": "09:00",
      "articles_per_language": 2
    },
    "weekly": {
      "enabled": true,
      "day": "monday", 
      "time": "10:00",
      "articles_per_language": 5,
      "target_languages": ["en", "zh", "ko"]
    }
  },
  "priorities": {
    "high_priority_languages": ["en", "zh"],
    "low_priority_languages": ["ar", "fr", "es"]
  }
}
```

## 工作流程

### 1. 关键词分析阶段
```
📂 读取GSC关键词文件
    ↓
🔍 语言检测和分类
    ↓
📊 生成语言分布统计
    ↓
🌐 过滤支持的语言
```

### 2. 文章生成阶段
```
🎯 为每种语言选择关键词
    ↓
💡 生成文章主题模板
    ↓
📝 调用AI生成文章内容
    ↓
💾 保存到对应locale数据库
    ↓
🔗 更新sitemap
```

## 测试功能

```bash
# 运行测试脚本
python test_multilingual.py
```

测试内容包括：
- 语言检测功能验证
- 关键词文件分析
- 干运行模式（不实际生成文章）

## 示例输出

```
🌍 多语言关键词生成器初始化完成
📂 关键词文件: keywords_gsc.txt
🗣️ 支持的语言: English, Chinese (Simplified), Korean, German, Arabic

📊 分析关键词文件: keywords_gsc.txt
📝 总计加载关键词: 117 个

🌐 语言分布统计:
   English (en):
      数量: 85 个 (72.6%)
      示例: download twitter video, free twitter downloader, online twitter video downloader
   Korean (ko):
      数量: 15 个 (12.8%)  
      示例: 트위터 다운로드, 트위터 동영상, 트위터 비디오 툴
   German (de):
      数量: 10 个 (8.5%)
      示例: twitter-video erstellen, twitter-video kostenlos erstellen, twitter-video vorlage kostenlos
   Arabic (ar):
      数量: 7 个 (6.0%)
      示例: تحميل فيديو تويتر, حفظ فيديو تويتر, تحميل من تويتر
```

## 最佳实践

### 1. 关键词文件准备
- 确保关键词来自真实的搜索数据（GSC）
- 定期更新关键词文件
- 移除无效或重复的关键词

### 2. 生成策略
- 从高流量语言开始（如英语、中文）
- 每种语言每天生成2-3篇文章，避免过量
- 根据网站流量分布调整语言优先级

### 3. 质量控制
- 定期检查生成的文章质量
- 根据效果调整关键词选择策略
- 监控各语言文章的SEO表现

### 4. 自动化部署
- 使用守护进程模式实现自动化
- 设置合理的生成间隔避免API限制
- 配置日志监控生成状态

## 故障排除

### 常见问题

1. **关键词文件读取失败**
   - 检查文件路径和编码（应为UTF-8）
   - 确保文件存在且有读取权限

2. **语言检测不准确**
   - 检查关键词是否包含足够的语言特征
   - 可以手动调整language_patterns配置

3. **文章生成失败**
   - 检查API密钥配置
   - 验证数据库连接
   - 确认网络连接正常

4. **某些语言未被识别**
   - 检查该语言是否在supported_locales中
   - 验证i18n配置是否包含该语言

## 扩展开发

### 添加新语言支持

1. 在`language_detector.py`中添加语言配置：
```python
self.supported_locales['new_lang'] = 'Language Name'
self.language_patterns['new_lang'] = {
    'script': 'script_type',
    'keywords': ['keyword1', 'keyword2', ...]
}
```

2. 在`multilingual_keyword_generator.py`中添加主题模板：
```python
topic_templates['new_lang'] = [
    "Template 1 for {keyword}",
    "Template 2 for {keyword}",
    ...
]
```

3. 确保网站i18n配置支持该语言

## 技术架构

```
language_detector.py           # 语言检测和关键词分组
multilingual_keyword_generator.py  # 多语言文章生成逻辑  
auto_multilingual_generator.py     # 自动化和调度
main.py                           # 集成到主程序
```

## 许可证

本项目采用MIT许可证，详见LICENSE文件。 