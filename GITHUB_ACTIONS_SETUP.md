# GitHub Actions 自动化博客生成系统设置指南

## 概述

本项目已从 Vercel cron job 迁移到 GitHub Actions，实现了更稳定的自动化博客文章生成和 sitemap 管理。

## 系统架构

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   GitHub Actions   │───▶│     生成文章        │───▶│    更新 Sitemap     │
│   (每日 UTC 02:00)  │    │   (直接到数据库)    │    │   (推送到仓库)      │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
                                                                    │
                                                                    ▼
                           ┌─────────────────────┐    ┌─────────────────────┐
                           │    前端界面         │    │     Vercel 部署     │
                           │   (手动操作)        │    │    (自动触发)       │
                           └─────────────────────┘    └─────────────────────┘
```

## 🚀 设置步骤

### 1. 设置 GitHub Secrets

在 GitHub 仓库的 Settings > Secrets and variables > Actions 中添加以下环境变量：

```bash
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
NEXT_PUBLIC_WEB_URL=https://your-domain.com
```

### 2. 启用 GitHub Actions

确保在仓库设置中启用了 GitHub Actions：
- 进入 Settings > Actions > General
- 选择 "Allow all actions and reusable workflows"

### 3. 设置仓库权限

为了让 GitHub Actions 能够推送 sitemap 更改：
- 进入 Settings > Actions > General
- 在 "Workflow permissions" 中选择 "Read and write permissions"
- 勾选 "Allow GitHub Actions to create and approve pull requests"

## 📋 Workflows 说明

### 1. 自动生成博客文章 (`.github/workflows/auto-generate-blog.yml`)

- **触发时间**: 每日 UTC 02:00 (北京时间 10:00)
- **功能**: 
  - 生成中文和英文各5篇文章
  - 自动从 Unsplash 获取封面图片
  - 智能时间分散：文章发布时间随机分散在1-3天内
  - 包含内链优化
  - 直接存储到 Supabase 数据库

### 2. 更新 Sitemap (`.github/workflows/update-sitemap.yml`)

- **触发时间**: 每日 UTC 03:00 (北京时间 11:00)
- **功能**:
  - 从数据库获取所有已发布文章
  - 生成完整的 sitemap.xml
  - 自动提交并推送到仓库
  - 触发 Vercel 自动部署

## 🎯 优势

### 相比 Vercel Cron Job 的优势：

1. **解决文件系统只读问题**: GitHub Actions 在独立环境中运行，可以正常写入文件
2. **更好的错误处理**: 详细的日志和错误报告
3. **成本效益**: GitHub Actions 对公共仓库免费
4. **更灵活的调度**: 支持复杂的调度策略
5. **版本控制**: sitemap 更改有完整的 Git 历史记录

### 功能特点：

- ✅ **智能内链**: 自动在新文章中添加指向现有文章的内链
- ✅ **时间分散**: 避免批量生成的特征，提高SEO效果
- ✅ **自动封面**: 从 Unsplash 自动获取高质量封面图片
- ✅ **双语支持**: 同时生成中文和英文文章
- ✅ **自动部署**: sitemap 更新后自动触发 Vercel 重新部署

## 🛠️ 手动操作

### 通过前端界面：
访问 `/admin/seo-blog-generator` 页面可以：
- 生成文章题目建议
- 生成单篇或双语文章
- 批量生成文章
- 验证和更新 sitemap
- 手动触发每日生成任务

### 通过 GitHub Actions：
- 进入 Actions 标签页
- 选择对应的 workflow
- 点击 "Run workflow" 手动触发

## 📊 监控和日志

### GitHub Actions 日志：
- 进入仓库的 Actions 标签页
- 查看每次运行的详细日志
- 监控成功/失败状态

### 数据库日志：
系统会在 `auto_generation_logs` 表中记录每次执行的详情：
```sql
SELECT * FROM auto_generation_logs ORDER BY created_at DESC;
```

## 🔧 故障排除

### 常见问题：

1. **文章生成失败**
   - 检查 Gemini API 密钥是否正确
   - 确认 API 配额是否充足
   - 查看 GitHub Actions 日志中的具体错误信息

2. **Sitemap 更新失败**
   - 检查 Supabase 连接配置
   - 确认仓库写入权限设置
   - 验证 sitemap.xml 文件格式

3. **Vercel 部署未触发**
   - 确认 Vercel 已连接到 GitHub 仓库
   - 检查 Vercel 的部署设置
   - 验证 sitemap 文件是否成功推送

### 调试步骤：

1. 检查 GitHub Actions 运行状态
2. 查看详细的执行日志
3. 验证环境变量配置
4. 测试 API 连接状态

## 📝 定制化

### 修改生成频率：
编辑 `.github/workflows/auto-generate-blog.yml` 中的 cron 表达式：
```yaml
schedule:
  - cron: '0 2 * * *'  # 每日 UTC 02:00
```

### 调整文章数量：
修改 Python 脚本中的 `generate_topics("Chinese", 5)` 参数

### 更改时间分散策略：
调整 `random_hours_back = random.randint(1, 72)` 的参数范围

## 🔄 迁移状态

- ✅ 移除了 `vercel.json` 中的 crons 配置
- ✅ 删除了 `/api/seo-blog/deploy` 端点
- ✅ 创建了两个 GitHub Actions workflows
- ✅ 更新了前端界面说明
- ✅ 保留了所有手动操作功能

## 📞 技术支持

如果遇到问题，请：
1. 查看 GitHub Actions 的详细日志
2. 检查数据库中的错误记录
3. 验证所有环境变量配置
4. 参考本文档的故障排除部分 