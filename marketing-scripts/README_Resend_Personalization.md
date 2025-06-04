# Resend个性化变量升级

## 🎯 更新内容

已将邮件模板升级为使用Resend官方的个性化变量，提供更好的个性化体验和自动化功能。

## 🆕 新的个性化变量

### 1. 联系人姓名
```html
<!-- 旧版本 -->
{{USER_NAME}}

<!-- 新版本 -->
{{{FIRST_NAME|朋友}}}
```

**优势：**
- 自动使用联系人的 `first_name` 字段
- 如果没有名字，自动显示 "朋友" 作为后备
- 无需手动替换变量

### 2. 邮箱地址
```html
<!-- 新增功能 -->
{{{EMAIL}}}
```

**用途：**
- 在页脚显示用户邮箱，增加透明度
- 帮助用户确认邮件发送对象

### 3. 网站链接
```html
<!-- 保持不变 -->
{{{WEBSITE_URL}}}
```

### 4. 自动取消订阅
```html
<!-- 旧版本 -->
<a href="{{UNSUBSCRIBE_URL}}">取消订阅</a>

<!-- 新版本 -->
<a href="{{{RESEND_UNSUBSCRIBE_URL}}}">取消订阅</a>
```

**优势：**
- Resend自动生成符合法规的取消订阅链接
- 自动处理取消订阅请求，无需编写代码
- 符合GDPR、CAN-SPAM等法规要求

## 📧 更新的模板文件

### Gmail兼容版本
- `pro-announcement-email-zh-gmail.html` ✅ 已更新

### 标准版本  
- `pro-announcement-email-zh.html` ⏳ 待更新

## 🔧 脚本更新

### 1. Broadcast发送脚本
**文件:** `send_pro_announcement_audience.py`

**变化：**
```python
# 旧版本 - 手动替换所有变量
variables = {
    'USER_NAME': '{{firstName}}',
    'WEBSITE_URL': CONFIG['WEBSITE_URL'],
    'UNSUBSCRIBE_URL': f"{CONFIG['WEBSITE_URL']}/unsubscribe"
}

# 新版本 - 只替换非个性化变量
variables = {
    'WEBSITE_URL': CONFIG['WEBSITE_URL']
}
# Resend自动处理 {{{FIRST_NAME|朋友}}}、{{{EMAIL}}}、{{{RESEND_UNSUBSCRIBE_URL}}}
```

### 2. 单邮件测试脚本
**文件:** `test_single_email.py`

**特殊处理：**
```python
# 因为测试邮件不是通过broadcast发送，需要手动替换个性化变量
test_variables = {
    '{{{FIRST_NAME|朋友}}}': name or '朋友',
    '{{{EMAIL}}}': email,
    '{{{RESEND_UNSUBSCRIBE_URL}}}': f"{CONFIG['WEBSITE_URL']}/unsubscribe"
}
```

## 🎨 模板变化示例

### 称呼个性化
```html
<!-- 之前 -->
<p>亲爱的 {{USER_NAME}}，</p>

<!-- 现在 -->  
<p>亲爱的 {{{FIRST_NAME|朋友}}}，</p>
```

**效果：**
- 有名字的用户：「亲爱的 张三，」
- 没有名字的用户：「亲爱的 朋友，」

### 页脚透明度
```html
<!-- 之前 -->
<p>您收到此邮件是因为您是TwitterDown的重要用户。</p>

<!-- 现在 -->
<p>您收到此邮件是因为您是TwitterDown的重要用户 ({{{EMAIL}}})。</p>
```

**效果：**
- 显示：「您收到此邮件是因为您是TwitterDown的重要用户 (user@example.com)。」

### 自动取消订阅
```html
<!-- 之前 -->
<a href="{{UNSUBSCRIBE_URL}}">取消订阅</a>

<!-- 现在 -->
<a href="{{{RESEND_UNSUBSCRIBE_URL}}}">取消订阅</a>
```

**优势：**
- 自动生成独特的取消订阅链接
- 一键取消订阅，无需确认页面
- 自动从audience中移除联系人

## 📊 个性化数据来源

当添加联系人到audience时，个性化数据来自：

```python
contact_params = {
    "email": user['email'],
    "first_name": name_parts[0],        # 对应 {{{FIRST_NAME}}}
    "last_name": ' '.join(name_parts[1:]),  # 对应 {{{LAST_NAME}}}
    "audience_id": CONFIG['AUDIENCE_ID'],
}
```

## 🧪 测试建议

### 1. 测试不同的姓名情况
```bash
# 测试有名字的用户
python test_single_email.py
# 输入用户名：张三

# 测试没有名字的用户  
python test_single_email.py
# 用户名留空
```

### 2. 验证个性化效果
- [ ] 有名字时显示真实姓名
- [ ] 没有名字时显示"朋友"
- [ ] 邮箱地址正确显示
- [ ] 取消订阅链接有效

## 🔄 向后兼容

- 旧的`{{WEBSITE_URL}}`变量仍然有效
- 新脚本会优先使用Gmail兼容模板
- 如果Gmail版本不存在，会回退到标准版本

## ⚡ 性能优势

1. **更少的服务器处理**
   - Resend在发送时处理个性化
   - 减少脚本的变量替换工作

2. **更好的法规遵循**
   - 自动处理取消订阅
   - 符合邮件营销法规

3. **更准确的个性化**
   - 基于实际联系人数据
   - 自动处理缺失字段 