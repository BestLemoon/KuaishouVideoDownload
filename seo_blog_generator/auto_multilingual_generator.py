#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Automated Multilingual Article Generator
自动化多语言文章生成器，可定期运行
"""

import os
import sys
import json
import schedule
import time
from datetime import datetime, timedelta
from typing import Dict, List
from multilingual_keyword_generator import MultilingualKeywordGenerator

class AutoMultilingualGenerator:
    def __init__(self, config_file: str = "auto_generator_config.json"):
        """初始化自动化多语言生成器"""
        self.config_file = config_file
        self.config = self.load_config()
        self.generator = MultilingualKeywordGenerator(self.config.get('keywords_file', 'keywords_gsc.txt'))
        
        print("🤖 自动化多语言文章生成器启动")
        print(f"⚙️ 配置文件: {config_file}")
    
    def load_config(self) -> Dict:
        """加载配置文件"""
        default_config = {
            "keywords_file": "keywords_gsc.txt",
            "schedule": {
                "daily": {
                    "enabled": True,
                    "time": "09:00",
                    "articles_per_language": 2
                },
                "weekly": {
                    "enabled": True,
                    "day": "monday",
                    "time": "10:00",
                    "articles_per_language": 5,
                    "target_languages": ["en", "zh", "ko"]
                }
            },
            "output": {
                "log_file": "auto_generator.log",
                "max_articles_per_run": 20
            },
            "priorities": {
                "high_priority_languages": ["en", "zh"],
                "low_priority_languages": ["ar", "fr", "es"]
            }
        }
        
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                print(f"✅ 已加载配置文件: {self.config_file}")
                return {**default_config, **config}
            except Exception as e:
                print(f"❌ 配置文件加载失败: {e}")
                print("🔄 使用默认配置")
        else:
            print(f"📝 创建默认配置文件: {self.config_file}")
            self.save_config(default_config)
        
        return default_config
    
    def save_config(self, config: Dict):
        """保存配置文件"""
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
            print(f"✅ 配置已保存: {self.config_file}")
        except Exception as e:
            print(f"❌ 配置保存失败: {e}")
    
    def log_message(self, message: str):
        """记录日志消息"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_message = f"[{timestamp}] {message}"
        
        print(log_message)
        
        # 写入日志文件
        log_file = self.config.get('output', {}).get('log_file', 'auto_generator.log')
        try:
            with open(log_file, 'a', encoding='utf-8') as f:
                f.write(log_message + '\n')
        except Exception as e:
            print(f"❌ 日志写入失败: {e}")
    
    def daily_generation_task(self):
        """每日生成任务"""
        self.log_message("🌅 开始每日文章生成任务")
        
        daily_config = self.config.get('schedule', {}).get('daily', {})
        if not daily_config.get('enabled', True):
            self.log_message("⏸️ 每日生成任务已禁用")
            return
        
        articles_per_language = daily_config.get('articles_per_language', 2)
        
        try:
            results = self.generator.generate_daily_articles(articles_per_language)
            
            # 统计结果
            total_articles = sum(len(articles) for articles in results.values())
            languages_count = len(results)
            
            self.log_message(f"✅ 每日生成任务完成: {total_articles} 篇文章，涵盖 {languages_count} 种语言")
            
            # 记录详细结果
            for locale, articles in results.items():
                language_name = self.generator.language_detector.supported_locales[locale]
                self.log_message(f"   🌍 {language_name}: {len(articles)} 篇")
            
        except Exception as e:
            self.log_message(f"❌ 每日生成任务失败: {e}")
    
    def weekly_generation_task(self):
        """每周重点生成任务"""
        self.log_message("📅 开始每周重点文章生成任务")
        
        weekly_config = self.config.get('schedule', {}).get('weekly', {})
        if not weekly_config.get('enabled', True):
            self.log_message("⏸️ 每周生成任务已禁用")
            return
        
        articles_per_language = weekly_config.get('articles_per_language', 5)
        target_languages = weekly_config.get('target_languages', None)
        
        try:
            results = self.generator.generate_focused_articles(
                target_languages=target_languages,
                keywords_per_language=articles_per_language
            )
            
            # 统计结果
            total_articles = sum(len(articles) for articles in results.values())
            languages_count = len(results)
            
            self.log_message(f"✅ 每周重点生成任务完成: {total_articles} 篇文章，涵盖 {languages_count} 种语言")
            
            # 记录详细结果
            for locale, articles in results.items():
                language_name = self.generator.language_detector.supported_locales[locale]
                self.log_message(f"   🌍 {language_name}: {len(articles)} 篇")
            
        except Exception as e:
            self.log_message(f"❌ 每周生成任务失败: {e}")
    
    def smart_generation_task(self):
        """智能生成任务（基于优先级）"""
        self.log_message("🧠 开始智能优先级生成任务")
        
        try:
            # 分析当前关键词分布
            analysis = self.generator.analyze_keywords_file()
            if not analysis:
                self.log_message("❌ 关键词分析失败")
                return
            
            filtered_keywords = analysis['filtered_keywords']
            priorities = self.config.get('priorities', {})
            high_priority = priorities.get('high_priority_languages', ['en', 'zh'])
            
            # 优先处理高优先级语言
            for locale in high_priority:
                if locale in filtered_keywords and len(filtered_keywords[locale]) > 0:
                    language_name = self.generator.language_detector.supported_locales[locale]
                    self.log_message(f"🎯 处理高优先级语言: {language_name}")
                    
                    results = self.generator.generate_focused_articles(
                        target_languages=[locale],
                        keywords_per_language=3
                    )
                    
                    if results and locale in results:
                        self.log_message(f"✅ {language_name} 生成完成: {len(results[locale])} 篇")
                    
                    # 添加延迟
                    time.sleep(30)
            
        except Exception as e:
            self.log_message(f"❌ 智能生成任务失败: {e}")
    
    def setup_schedule(self):
        """设置定时任务"""
        self.log_message("⏰ 设置定时任务")
        
        # 每日任务
        daily_config = self.config.get('schedule', {}).get('daily', {})
        if daily_config.get('enabled', True):
            daily_time = daily_config.get('time', '09:00')
            schedule.every().day.at(daily_time).do(self.daily_generation_task)
            self.log_message(f"📅 每日任务已设置: {daily_time}")
        
        # 每周任务
        weekly_config = self.config.get('schedule', {}).get('weekly', {})
        if weekly_config.get('enabled', True):
            weekly_day = weekly_config.get('day', 'monday')
            weekly_time = weekly_config.get('time', '10:00')
            
            schedule_obj = getattr(schedule.every(), weekly_day.lower())
            schedule_obj.at(weekly_time).do(self.weekly_generation_task)
            self.log_message(f"📅 每周任务已设置: 每{weekly_day} {weekly_time}")
        
        # 智能任务（每6小时）
        schedule.every(6).hours.do(self.smart_generation_task)
        self.log_message("🧠 智能任务已设置: 每6小时执行")
    
    def run_once(self, task_type: str = "daily"):
        """立即执行一次任务"""
        self.log_message(f"🚀 立即执行 {task_type} 任务")
        
        if task_type == "daily":
            self.daily_generation_task()
        elif task_type == "weekly":
            self.weekly_generation_task()
        elif task_type == "smart":
            self.smart_generation_task()
        else:
            self.log_message(f"❌ 未知任务类型: {task_type}")
    
    def run_daemon(self):
        """运行守护进程"""
        self.log_message("👾 启动守护进程模式")
        self.setup_schedule()
        
        try:
            while True:
                schedule.run_pending()
                time.sleep(60)  # 每分钟检查一次
        except KeyboardInterrupt:
            self.log_message("🛑 守护进程被用户中断")
        except Exception as e:
            self.log_message(f"❌ 守护进程异常: {e}")
    
    def show_status(self):
        """显示当前状态"""
        print("\n📊 自动化生成器状态")
        print("=" * 40)
        
        # 配置信息
        print(f"📂 关键词文件: {self.config.get('keywords_file', 'N/A')}")
        print(f"📝 日志文件: {self.config.get('output', {}).get('log_file', 'N/A')}")
        
        # 任务调度信息
        daily = self.config.get('schedule', {}).get('daily', {})
        weekly = self.config.get('schedule', {}).get('weekly', {})
        
        print(f"\n📅 任务调度:")
        print(f"   每日任务: {'启用' if daily.get('enabled') else '禁用'} - {daily.get('time', 'N/A')}")
        print(f"   每周任务: {'启用' if weekly.get('enabled') else '禁用'} - 每{weekly.get('day', 'N/A')} {weekly.get('time', 'N/A')}")
        
        # 下次执行时间
        print(f"\n⏰ 计划任务:")
        for job in schedule.jobs:
            print(f"   {job}")
    
    def interactive_mode(self):
        """交互式模式"""
        print("\n🎮 自动化多语言生成器 - 交互式模式")
        print("=" * 50)
        
        while True:
            print("\n📋 请选择操作:")
            print("1. 📊 显示状态")
            print("2. 🚀 立即执行每日任务")
            print("3. 📅 立即执行每周任务")
            print("4. 🧠 立即执行智能任务")
            print("5. 👾 启动守护进程")
            print("6. ⚙️ 编辑配置")
            print("0. ❌ 退出")
            
            choice = input("\n请输入选择 (0-6): ").strip()
            
            if choice == "0":
                print("👋 再见!")
                break
            elif choice == "1":
                self.show_status()
            elif choice == "2":
                self.run_once("daily")
            elif choice == "3":
                self.run_once("weekly")
            elif choice == "4":
                self.run_once("smart")
            elif choice == "5":
                self.run_daemon()
            elif choice == "6":
                self.edit_config_interactive()
            else:
                print("❌ 无效选择，请重试")
    
    def edit_config_interactive(self):
        """交互式编辑配置"""
        print("\n⚙️ 配置编辑")
        print("当前配置:")
        print(json.dumps(self.config, ensure_ascii=False, indent=2))
        
        print("\n可编辑的选项:")
        print("1. 关键词文件路径")
        print("2. 每日任务设置")
        print("3. 每周任务设置")
        print("4. 优先级语言设置")
        
        choice = input("请选择要编辑的选项 (1-4): ").strip()
        
        if choice == "1":
            new_path = input("请输入新的关键词文件路径: ").strip()
            if os.path.exists(new_path):
                self.config['keywords_file'] = new_path
                self.save_config(self.config)
                print("✅ 关键词文件路径已更新")
            else:
                print("❌ 文件不存在")
        
        elif choice == "2":
            enabled = input("启用每日任务? (y/n): ").strip().lower() == 'y'
            time_str = input("每日执行时间 (HH:MM): ").strip()
            articles = input("每种语言生成文章数 (默认2): ").strip()
            
            self.config['schedule']['daily'] = {
                'enabled': enabled,
                'time': time_str if time_str else self.config['schedule']['daily'].get('time', '09:00'),
                'articles_per_language': int(articles) if articles.isdigit() else 2
            }
            self.save_config(self.config)
            print("✅ 每日任务设置已更新")
        
        # 其他配置选项...

def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="自动化多语言SEO博客生成器")
    parser.add_argument("--config", "-c", default="auto_generator_config.json", help="配置文件路径")
    parser.add_argument("--mode", "-m", choices=["interactive", "daemon", "once"], default="interactive", help="运行模式")
    parser.add_argument("--task", "-t", choices=["daily", "weekly", "smart"], default="daily", help="一次性执行的任务类型")
    
    args = parser.parse_args()
    
    # 初始化生成器
    generator = AutoMultilingualGenerator(args.config)
    
    # 根据模式执行
    if args.mode == "daemon":
        generator.run_daemon()
    elif args.mode == "once":
        generator.run_once(args.task)
    else:
        generator.interactive_mode()

if __name__ == "__main__":
    main() 