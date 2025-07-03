#!/usr/bin/env python3
"""
安全检查脚本 - 检测项目中的敏感信息泄露
"""
import os
import re
import sys
from pathlib import Path

# 敏感信息模式
SENSITIVE_PATTERNS = {
    'api_key': [
        r'AIza[0-9A-Za-z_-]{35}',  # Google API Key
        r'sk-[a-zA-Z0-9]{48}',     # OpenAI API Key
        r'xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}',  # Slack Bot Token
    ],
    'jwt_token': [
        r'eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*',  # JWT Token
    ],
    'database_url': [
        r'postgres://[^:]+:[^@]+@[^:]+:\d+/\w+',  # PostgreSQL URL
        r'mongodb://[^:]+:[^@]+@[^:]+:\d+/\w+',   # MongoDB URL
    ],
    'private_key': [
        r'-----BEGIN PRIVATE KEY-----',
        r'-----BEGIN RSA PRIVATE KEY-----',
    ]
}

# 需要检查的文件扩展名
CHECK_EXTENSIONS = {'.py', '.js', '.ts', '.json', '.env', '.yml', '.yaml', '.md', '.txt'}

# 忽略的目录
IGNORE_DIRS = {'node_modules', '.git', '__pycache__', '.next', 'build', 'dist'}

def scan_file(file_path):
    """扫描单个文件中的敏感信息"""
    findings = []
    
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
        for category, patterns in SENSITIVE_PATTERNS.items():
            for pattern in patterns:
                matches = re.finditer(pattern, content, re.MULTILINE)
                for match in matches:
                    line_num = content[:match.start()].count('\n') + 1
                    findings.append({
                        'file': str(file_path),
                        'line': line_num,
                        'category': category,
                        'match': match.group()[:50] + '...' if len(match.group()) > 50 else match.group()
                    })
    except Exception as e:
        print(f"⚠️ 无法读取文件 {file_path}: {e}")
    
    return findings

def scan_directory(directory):
    """扫描目录中的所有文件"""
    all_findings = []
    
    for root, dirs, files in os.walk(directory):
        # 过滤忽略的目录
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        
        for file in files:
            file_path = Path(root) / file
            
            # 检查文件扩展名
            if file_path.suffix in CHECK_EXTENSIONS or file.startswith('.env'):
                findings = scan_file(file_path)
                all_findings.extend(findings)
    
    return all_findings

def main():
    """主函数"""
    print("🔍 开始安全扫描...")
    
    # 获取项目根目录
    project_root = Path(__file__).parent.parent
    
    # 扫描项目
    findings = scan_directory(project_root)
    
    if findings:
        print(f"\n❌ 发现 {len(findings)} 个潜在的敏感信息泄露:")
        print("=" * 80)
        
        for finding in findings:
            print(f"📁 文件: {finding['file']}")
            print(f"📍 行号: {finding['line']}")
            print(f"🏷️ 类型: {finding['category']}")
            print(f"🔍 内容: {finding['match']}")
            print("-" * 40)
        
        print("\n🚨 请立即采取以下措施:")
        print("1. 撤销/重新生成所有泄露的API密钥")
        print("2. 将敏感文件添加到 .gitignore")
        print("3. 从Git历史中移除敏感信息")
        print("4. 使用环境变量管理敏感配置")
        
        sys.exit(1)
    else:
        print("✅ 未发现敏感信息泄露")
        sys.exit(0)

if __name__ == "__main__":
    main()
