import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  const statusId = searchParams.get('statusId');
  
  // 验证参数
  if (!username || !statusId) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // 验证用户名格式（Twitter用户名规则：1-15个字符，只能包含字母、数字、下划线）
  const usernameRegex = /^[a-zA-Z0-9_]{1,15}$/;
  if (!usernameRegex.test(username)) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // 验证状态ID格式（Twitter状态ID通常是数字）
  const statusIdRegex = /^\d+$/;
  if (!statusIdRegex.test(statusId)) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  try {
    // 构造原始 Twitter/X 链接，优先使用 x.com
    const twitterUrl = `https://x.com/${username}/status/${statusId}`;
    
    // 调用下载 API
    const response = await fetch(`${request.nextUrl.origin}/api/twitter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: twitterUrl }),
    });
    
    const result = await response.json();
    
    if (result.code === 0 && result.data && result.data.token) {
      // 重定向到下载结果页面
      return NextResponse.redirect(
        new URL(`/download-result?token=${result.data.token}`, request.url)
      );
    } else {
      // 如果下载失败，重定向到主页
      console.error('Twitter API error:', result.message);
      return NextResponse.redirect(new URL('/', request.url));
    }
  } catch (error) {
    console.error('Error processing status redirect:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
} 