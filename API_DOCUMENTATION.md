# TwitterDown API 开发文档

## 概述

TwitterDown API v1 提供程序化访问，用于从 Twitter/X 链接中提取视频信息。此 API 允许开发者将 Twitter 视频解析功能集成到他们的应用程序中。

## 基础 URL

```
https://twitterdown.com/api/v1
```

## 身份验证

所有 API 请求都需要使用 API 密钥进行身份验证。您必须在每个请求的 Authorization 头中包含您的 API 密钥。

### API 密钥格式

```
Authorization: Bearer YOUR_API_KEY
```

### 获取 API 密钥

1. 在 TwitterDown 上创建账户
2. 购买高级订阅
3. 导航到仪表板中的 API 密钥部分
4. 创建新的 API 密钥

**注意：** API 访问仅对高级用户开放。

## 速率限制

- **每分钟请求数：** 60
- **每小时请求数：** 1,000
- **每日请求数：** 10,000

所有响应中都包含速率限制头：
- `X-RateLimit-Limit`: 每个时间窗口的请求限制
- `X-RateLimit-Remaining`: 当前窗口中剩余的请求数
- `X-RateLimit-Reset`: 速率限制重置时的 Unix 时间戳

## 接口

### 1. 解析 Twitter 视频 URL

从 Twitter/X URL 中提取视频信息。

**接口地址：** `POST /twitter`

#### 请求

**请求头：**
```
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

**请求体：**
```json
{
  "url": "https://x.com/username/status/1234567890123456789"
}
```

**参数：**

| 参数名 | 类型   | 必需 | 描述                                   |
|--------|--------|------|----------------------------------------|
| `url`  | string | 是   | 包含视频的有效 Twitter/X 推文 URL      |

#### 响应

**成功响应 (200 OK)：**
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "thumbnail": "https://pbs.twimg.com/amplify_video_thumb/1234567890123456789/img/ExampleThumbnail.jpg",
    "videos": [
      {
        "resolution": "720p",
        "quality": "HD",
        "url": "https://video.twimg.com/amplify_video/1234567890123456789/vid/avc1/1280x720/ExampleVideoHD.mp4?tag=21"
      },
      {
        "resolution": "360p",
        "quality": "SD",
        "url": "https://video.twimg.com/amplify_video/1234567890123456789/vid/avc1/640x360/ExampleVideoSD.mp4?tag=21"
      },
      {
        "resolution": "270p",
        "quality": "SD",
        "url": "https://video.twimg.com/amplify_video/1234567890123456789/vid/avc1/480x270/ExampleVideoLow.mp4?tag=21"
      }
    ],
    "text": "这是一个示例推文内容，包含视频",
    "username": "username",
    "statusId": "1234567890123456789",
    "processed_at": "2024-01-01T12:00:00.000Z"
  }
}
```

**响应字段：**

| 字段名          | 类型     | 描述                                |
|----------------|----------|-------------------------------------|
| `code`         | integer  | 响应代码 (0 = 成功, -1 = 错误)      |
| `message`      | string   | 响应消息                             |
| `data`         | object   | 响应数据                             |
| `thumbnail`    | string   | 推文缩略图 URL (可为空)               |
| `videos`       | array    | 可用视频格式数组                      |
| `text`         | string   | 推文文本内容                         |
| `username`     | string   | Twitter 用户名                       |
| `statusId`     | string   | 推文状态 ID                          |
| `processed_at` | string   | 处理时间的 ISO 8601 时间戳            |

**视频对象字段：**

| 字段名       | 类型   | 描述                                   |
|-------------|--------|----------------------------------------|
| `resolution`| string | 视频分辨率 (例如："720p", "360p")       |
| `quality`   | string | 视频质量 (例如："HD", "SD")             |
| `url`       | string | 视频的直接下载 URL                      |

### 2. API 文档

获取 API 文档和使用信息。

**接口地址：** `GET /twitter`

#### 响应

返回 JSON 格式的完整 API 文档，包括接口信息、身份验证要求和示例。

## 错误处理

### 错误响应格式

```json
{
  "code": -1,
  "message": "错误描述"
}
```

### HTTP 状态码

| 状态码 | 描述                                         |
|--------|----------------------------------------------|
| `200`  | 成功                                         |
| `400`  | 错误请求 - 无效参数                          |
| `401`  | 未授权 - 缺少或无效的 API 密钥                |
| `403`  | 禁止访问 - 需要高级订阅                      |
| `422`  | 无法处理的实体 - 无法解析 URL                |
| `429`  | 请求过多 - 超出速率限制                      |
| `500`  | 内部服务器错误                               |

### 常见错误消息

| 错误消息                                       | 原因                                     |
|----------------------------------------------|------------------------------------------|
| `Missing API key`                            | 未提供 Authorization 头                  |
| `Invalid API key`                            | API 密钥未找到或已失效                   |
| `API access is only available for premium users` | 非高级用户尝试访问 API              |
| `URL parameter is required`                  | 请求体中缺少 URL                         |
| `Invalid Twitter/X URL format`               | URL 格式错误或不支持                     |
| `No video found`                             | 推文不包含视频内容                       |

## 示例

### cURL 示例

```bash
curl --location --request POST 'https://twitterdown.com/api/v1/twitter' \
  --header 'Authorization: Bearer sk-1234567890abcdef123456789012345678' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "url": "https://x.com/username/status/1234567890123456789"
  }'
```

### JavaScript 示例

```javascript
const response = await fetch('https://twitterdown.com/api/v1/twitter', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk-1234567890abcdef123456789012345678'
  },
  body: JSON.stringify({
    url: 'https://x.com/username/status/1234567890123456789'
  })
});

const data = await response.json();

if (data.code === 0) {
  console.log('找到视频:', data.data.videos);
} else {
  console.error('错误:', data.message);
}
```

### Python 示例

```python
import requests

url = "https://twitterdown.com/api/v1/twitter"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer sk-1234567890abcdef123456789012345678"
}
payload = {
    "url": "https://x.com/username/status/1234567890123456789"
}

response = requests.post(url, headers=headers, json=payload)
data = response.json()

if data["code"] == 0:
    print("找到视频:", data["data"]["videos"])
else:
    print("错误:", data["message"])
```

### PHP 示例

```php
<?php
$url = 'https://twitterdown.com/api/v1/twitter';
$headers = [
    'Content-Type: application/json',
    'Authorization: Bearer sk-1234567890abcdef123456789012345678'
];
$payload = json_encode([
    'url' => 'https://x.com/username/status/1234567890123456789'
]);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);

if ($data['code'] === 0) {
    echo "找到视频: " . print_r($data['data']['videos'], true);
} else {
    echo "错误: " . $data['message'];
}
?>
```


## 最佳实践

### URL 格式支持

API 支持以下 URL 格式：
- `https://twitter.com/username/status/1234567890`
- `https://x.com/username/status/1234567890`
- `https://mobile.twitter.com/username/status/1234567890`

### 错误处理

始终检查响应中的 `code` 字段：
- `code: 0` 表示成功
- `code: -1` 表示错误

在您的应用程序中实现适当的错误处理，以优雅地处理 API 错误。

### 速率限制

监控响应中的速率限制头，并在接近限制时实施退避策略。

### 安全性

- 保护您的 API 密钥安全，永远不要在客户端代码中暴露它们
- 使用环境变量存储 API 密钥
- 定期轮换 API 密钥
- 删除未使用的 API 密钥

## 支持

如有 API 支持和问题：

- **邮箱：** support@twitterdown.com
- **文档：** https://twitterdown.com/docs
- **状态页面：** https://status.twitterdown.com

## 更新日志

### 版本 1.0.0 (2025-05-27)
- 初始 API 发布
- Twitter/X 视频解析
- 高级用户身份验证
- 速率限制实现

---

*最后更新：2025-05-27* 