# GitHub Actions 测试指南

## 📋 测试清单

### ✅ 1. 环境变量设置
在 GitHub 仓库的 Settings > Secrets and variables > Actions 中确认以下变量已设置：

- [ ] `GEMINI_API_KEY` - Google Gemini API 密钥
- [ ] `SUPABASE_URL` - Supabase 项目 URL
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服务角色密钥
- [ ] `UNSPLASH_ACCESS_KEY` - Unsplash 访问密钥
- [ ] `NEXT_PUBLIC_WEB_URL` - 网站域名

### ✅ 2. 仓库权限设置
在 Settings > Actions > General 中确认：

- [ ] Workflow permissions 设置为 "Read and write permissions"
- [ ] 勾选 "Allow GitHub Actions to create and approve pull requests"

### ✅ 3. 手动测试 Workflows

#### 测试文章生成：
1. 进入 Actions 标签页
2. 选择 "Auto Generate Blog Articles" workflow
3. 点击 "Run workflow"
4. 等待执行完成，检查日志

#### 测试 Sitemap 更新：
1. 进入 Actions 标签页
2. 选择 "Update Sitemap" workflow  
3. 点击 "Run workflow"
4. 等待执行完成，检查是否有新的 commit

### ✅ 4. 验证结果

#### 检查文章生成：
```sql
-- 在 Supabase 中执行
SELECT 
  title, 
  locale, 
  created_at, 
  author_name 
FROM posts 
ORDER BY created_at DESC 
LIMIT 20;
```

#### 检查执行日志：
```sql
-- 在 Supabase 中执行
SELECT * FROM auto_generation_logs 
ORDER BY created_at DESC 
LIMIT 5;
```

#### 检查 Sitemap 文件：
- 查看仓库中的 `public/sitemap.xml` 文件
- 确认包含新生成的文章 URL
- 验证文件格式正确

### ✅ 5. 验证自动部署
1. 确认 sitemap 更新后有新的 commit
2. 检查 Vercel 是否自动触发了部署
3. 访问网站确认 sitemap 已更新

## 🔧 故障排除

### 常见错误及解决方案：

#### 1. "Error: Process completed with exit code 1"
**可能原因：**
- 环境变量未设置或错误
- API 密钥无效
- 网络连接问题

**解决方案：**
- 检查所有 GitHub Secrets 的值
- 验证 API 密钥的有效性
- 查看详细的错误日志

#### 2. "Permission denied" 错误
**可能原因：**
- GitHub Actions 没有写入权限
- 仓库权限设置不正确

**解决方案：**
- 确认 Workflow permissions 设置正确
- 检查 GITHUB_TOKEN 权限

#### 3. Sitemap 更新但没有 commit
**可能原因：**
- sitemap 内容没有实际变化
- Git 配置问题

**解决方案：**
- 检查 sitemap 生成的内容
- 查看 "Check for sitemap changes" 步骤的输出

#### 4. Vercel 部署未触发
**可能原因：**
- Vercel 项目未连接到 GitHub
- 部署设置问题

**解决方案：**
- 确认 Vercel 项目连接到正确的仓库
- 检查 Vercel 的 Git 集成设置

## 📊 监控建议

### 每日检查：
1. 查看 GitHub Actions 执行状态
2. 确认新文章已生成
3. 验证 sitemap 已更新

### 每周检查：
1. 审查生成文章的质量
2. 检查执行日志中的错误
3. 监控 API 使用量

### 每月检查：
1. 更新 API 密钥（如需要）
2. 检查系统性能
3. 优化生成策略

## 🚀 手动备份方案

如果 GitHub Actions 出现问题，可以通过前端界面手动操作：

1. 访问 `/admin/seo-blog-generator`
2. 使用"手动触发每日生成"功能
3. 手动更新 sitemap
4. 联系技术支持解决 Actions 问题

## 📞 支持联系

遇到无法解决的问题时：
1. 收集错误日志和截图
2. 记录重现步骤
3. 提供环境变量配置（不包含敏感信息）
4. 提交技术支持请求 