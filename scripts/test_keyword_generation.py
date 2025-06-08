#!/usr/bin/env python3
"""
测试关键词驱动文章生成功能
"""
import os
import sys

# 添加当前目录到Python路径，以便导入模块
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from auto_generate_articles import (
    generate_seed_keywords,
    get_google_suggestions,
    expand_keywords_with_google,
    generate_categorized_topics_by_keywords,
    build_keywords_context
)

def test_seed_keywords():
    """测试种子关键词生成"""
    print("🧪 测试种子关键词生成...")
    
    # 测试中文种子关键词
    print("\n1. 测试中文种子关键词:")
    chinese_keywords = generate_seed_keywords("Chinese (Simplified)", 5)
    print(f"生成的中文关键词: {chinese_keywords}")
    
    # 测试英文种子关键词
    print("\n2. 测试英文种子关键词:")
    english_keywords = generate_seed_keywords("English", 5)
    print(f"生成的英文关键词: {english_keywords}")
    
    return chinese_keywords, english_keywords

def test_google_suggestions():
    """测试Google自动完成API"""
    print("\n🧪 测试Google自动完成...")
    
    test_keywords = ["twitter video downloader", "twitter视频下载"]
    
    for keyword in test_keywords:
        print(f"\n测试关键词: {keyword}")
        suggestions = get_google_suggestions(keyword, 5)
        print(f"获取到的建议: {suggestions}")
    
    return suggestions

def test_keyword_expansion():
    """测试关键词扩展"""
    print("\n🧪 测试关键词扩展...")
    
    # 使用小量测试数据
    test_seeds = ["twitter video downloader", "twitter视频下载"]
    
    expanded = expand_keywords_with_google(test_seeds, 3)
    print(f"\n扩展结果:")
    for seed, suggestions in expanded.items():
        print(f"  {seed}: {suggestions}")
    
    return expanded

def test_categorized_topics():
    """测试分类文章题目生成"""
    print("\n🧪 测试分类文章题目生成...")
    
    # 使用模拟的扩展关键词数据
    mock_expanded = {
        "twitter video downloader": [
            "twitter video downloader online",
            "twitter video downloader free",
            "twitter video downloader app"
        ],
        "download twitter video": [
            "download twitter video iphone",
            "download twitter video android",
            "download twitter video mp4"
        ]
    }
    
    categorized = generate_categorized_topics_by_keywords(mock_expanded, "English")
    print(f"\n生成的分类题目:")
    for category, topics in categorized.items():
        print(f"  📂 {category}:")
        for topic in topics:
            print(f"    • {topic}")
    
    return categorized

def test_keywords_context():
    """测试关键词上下文构建"""
    print("\n🧪 测试关键词上下文构建...")
    
    mock_expanded = {
        "twitter video downloader": [
            "twitter video downloader online",
            "twitter video downloader free"
        ],
        "download twitter video": [
            "download twitter video iphone",
            "download twitter video android"
        ]
    }
    
    context = build_keywords_context(mock_expanded)
    print(f"\n生成的关键词上下文:")
    print(context)
    
    return context

def main():
    """主测试函数"""
    print("🚀 开始测试关键词驱动文章生成功能")
    print("=" * 60)
    
    try:
        # 测试1: 种子关键词生成
        chinese_keywords, english_keywords = test_seed_keywords()
        
        # 测试2: Google自动完成（可选，需要网络）
        print("\n是否测试Google API? (y/n): ", end="")
        test_google = input().lower().startswith('y')
        
        if test_google:
            test_google_suggestions()
            # 使用实际关键词测试扩展
            if english_keywords:
                print(f"\n使用生成的英文关键词测试扩展:")
                expanded = expand_keywords_with_google(english_keywords[:2], 2)
                print(f"扩展结果: {expanded}")
        
        # 测试3: 分类题目生成
        test_categorized_topics()
        
        # 测试4: 关键词上下文构建
        test_keywords_context()
        
        print("\n✅ 所有测试完成!")
        print("🎉 关键词驱动功能测试成功")
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 