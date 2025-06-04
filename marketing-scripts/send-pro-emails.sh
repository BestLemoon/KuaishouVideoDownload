#!/bin/bash

# TwitterDown Pro 公告邮件发送脚本
# 使用方法: ./send-pro-emails.sh

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
RESEND_API_KEY="${RESEND_API_KEY:-re_CN2XhdgQ_GPtQKPxEXzQXALbLmcrYxw5f}"
WEBSITE_URL="${NEXT_PUBLIC_WEB_URL:-https://twitterdown.com}"
FROM_EMAIL="TwitterDown <noreply@updates.twitterdown.com>"
SUBJECT="🎉 一年Pro功能免费！每月150次下载"

echo -e "${BLUE}🚀 TwitterDown Pro 公告邮件发送工具${NC}\n"

# 检查必要的环境变量
if [ "$RESEND_API_KEY" = "your-resend-api-key-here" ]; then
    echo -e "${RED}❌ 请设置 RESEND_API_KEY 环境变量${NC}"
    echo "export RESEND_API_KEY='your-actual-api-key'"
    exit 1
fi

# 检查HTML模板是否存在
if [ ! -f "pro-announcement-email-zh.html" ]; then
    echo -e "${RED}❌ 找不到中文邮件模板文件: pro-announcement-email-zh.html${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 配置检查通过${NC}"
echo -e "📧 发送邮箱: $FROM_EMAIL"
echo -e "🌐 网站URL: $WEBSITE_URL"
echo -e "📝 邮件主题: $SUBJECT\n"

# 读取HTML模板
HTML_TEMPLATE=$(cat pro-announcement-email-zh.html)

# 函数：发送单封邮件
send_email() {
    local email="$1"
    local name="$2"
    
    # 替换模板变量
    local html_content="$HTML_TEMPLATE"
    html_content="${html_content//\{\{USER_NAME\}\}/$name}"
    html_content="${html_content//\{\{WEBSITE_URL\}\}/$WEBSITE_URL}"
    html_content="${html_content//\{\{UNSUBSCRIBE_URL\}\}/$WEBSITE_URL/unsubscribe}"
    
    # 转义JSON
    html_content=$(echo "$html_content" | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
    
    # 构建JSON payload
    local payload=$(cat <<EOF
{
    "from": "$FROM_EMAIL",
    "to": ["$email"],
    "subject": "$SUBJECT",
    "html": "$html_content"
}
EOF
)

    echo -e "${BLUE}📧 发送邮件到: $email${NC}"
    
    # 发送邮件
    local response=$(curl -s -X POST 'https://api.resend.com/emails' \
        -H "Authorization: Bearer $RESEND_API_KEY" \
        -H 'Content-Type: application/json' \
        -d "$payload")
    
    # 检查响应
    if echo "$response" | grep -q '"id"'; then
        local email_id=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        echo -e "${GREEN}✅ 发送成功! ID: $email_id${NC}"
        return 0
    else
        echo -e "${RED}❌ 发送失败: $response${NC}"
        return 1
    fi
}

# 函数：测试发送
test_email() {
    echo -e "${YELLOW}🧪 测试模式 - 发送测试邮件${NC}"
    read -p "请输入测试邮箱地址: " test_email_addr
    read -p "请输入测试用户名: " test_name
    
    send_email "$test_email_addr" "$test_name"
}

# 函数：批量发送
batch_send() {
    echo -e "${YELLOW}📊 批量发送模式${NC}"
    echo "请提供用户列表，格式: 邮箱,姓名"
    echo "输入完成后按 Ctrl+D"
    echo "示例:"
    echo "user1@example.com,John"
    echo "user2@example.com,Jane"
    echo ""
    
    local users=()
    while IFS= read -r line; do
        if [ -n "$line" ]; then
            users+=("$line")
        fi
    done
    
    echo -e "\n${BLUE}📋 将发送 ${#users[@]} 封邮件${NC}"
    
    local success_count=0
    local total_count=${#users[@]}
    
    for user in "${users[@]}"; do
        IFS=',' read -r email name <<< "$user"
        
        # 清理空格
        email=$(echo "$email" | xargs)
        name=$(echo "$name" | xargs)
        
        if [ -n "$email" ]; then
            if send_email "$email" "$name"; then
                ((success_count++))
            fi
            
            # 添加延迟避免触发限制
            sleep 0.5
            echo ""
        fi
    done
    
    echo -e "${GREEN}📊 发送完成: $success_count/$total_count 成功${NC}"
}

# 主菜单
echo "请选择操作模式:"
echo "1) 测试发送 (发送单封测试邮件)"
echo "2) 批量发送 (从输入读取用户列表)"
echo "3) 显示示例 curl 命令"
echo "4) 退出"
echo ""
read -p "请选择 [1-4]: " choice

case $choice in
    1)
        test_email
        ;;
    2)
        batch_send
        ;;
    3)
        echo -e "${BLUE}📋 示例 curl 命令:${NC}"
        echo ""
        echo "curl -X POST 'https://api.resend.com/emails' \\"
        echo "  -H 'Authorization: Bearer $RESEND_API_KEY' \\"
        echo "  -H 'Content-Type: application/json' \\"
        echo "  -d '{"
        echo "    \"from\": \"$FROM_EMAIL\","
        echo "    \"to\": [\"user@example.com\"],"
        echo "    \"subject\": \"$SUBJECT\","
        echo "    \"html\": \"...(HTML内容)...\""
        echo "  }'"
        echo ""
        echo -e "${YELLOW}💡 提示: 将 HTML 内容替换为实际的模板内容${NC}"
        ;;
    4)
        echo -e "${GREEN}👋 再见!${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}❌ 无效选择${NC}"
        exit 1
        ;;
esac 