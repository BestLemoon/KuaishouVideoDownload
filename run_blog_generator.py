#!/usr/bin/env python3
"""
快手视频下载博客生成器 - 简化运行脚本
每天生成5篇英文文章
"""

import os
import sys
import subprocess
from pathlib import Path

def check_environment():
    """检查环境变量"""
    required_vars = [
        'GEMINI_API_KEY',
        'SUPABASE_URL', 
        'SUPABASE_SERVICE_ROLE_KEY',
        'NEXT_PUBLIC_WEB_URL'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print("❌ 缺少以下环境变量:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\n💡 请在 .env 文件中设置这些变量")
        return False
    
    print("✅ 环境变量检查通过")
    return True

def install_dependencies():
    """安装依赖"""
    try:
        print("📦 检查并安装Python依赖...")
        subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", 
            "requirements-github-actions.txt"
        ], check=True, capture_output=True)
        print("✅ 依赖安装完成")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ 依赖安装失败: {e}")
        return False
    except FileNotFoundError:
        print("⚠️ requirements-github-actions.txt 文件不存在，跳过依赖安装")
        return True

def run_generator():
    """运行博客生成器"""
    try:
        print("🚀 开始生成英文博客文章...")
        print("=" * 50)
        
        # 运行脚本，只生成英文文章
        result = subprocess.run([
            sys.executable, "scripts/auto_generate_articles.py", "keywords", "english"
        ], capture_output=False, text=True)
        
        if result.returncode == 0:
            print("\n🎉 博客文章生成完成！")
            return True
        else:
            print(f"\n❌ 生成失败，退出码: {result.returncode}")
            return False
            
    except Exception as e:
        print(f"❌ 运行失败: {e}")
        return False

def main():
    """主函数"""
    print("🎯 快手视频下载博客生成器")
    print("📝 每日生成5篇英文文章")
    print("=" * 50)
    
    # 检查环境
    if not check_environment():
        sys.exit(1)
    
    # 安装依赖（可选）
    install_dependencies()
    
    # 运行生成器
    if run_generator():
        print("\n✅ 任务完成！")
    else:
        print("\n❌ 任务失败！")
        sys.exit(1)

if __name__ == "__main__":
    main()
