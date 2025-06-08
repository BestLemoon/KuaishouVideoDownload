"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { toast } from "sonner";
import { Loader2, RefreshCw, FileText, Globe, Database, Settings } from "lucide-react";

interface TopicSuggestion {
  title: string;
}

export default function SEOBlogGeneratorPage() {
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<TopicSuggestion[]>([]);
  const [theme, setTheme] = useState("");
  const [language, setLanguage] = useState("Chinese");
  const [count, setCount] = useState(5);
  const [customTopic, setCustomTopic] = useState("");
  const [batchLanguage, setBatchLanguage] = useState("Chinese");
  const [concurrency, setConcurrency] = useState(3);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  
  const handleGenerateTopics = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/seo-blog/generate-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, language, count }),
      });
      
      const data = await response.json();
      if (data.success) {
        setTopics(data.topics.map((title: string) => ({ title })));
        toast.success("成功", {
          description: `已生成 ${data.topics.length} 个题目建议`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error("错误", {
        description: `题目生成失败: ${error}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSingleArticle = async (topic: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/seo-blog/generate-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, language }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success("成功", {
          description: `文章《${data.article.title}》生成成功`,
        });
        if (topic === customTopic) {
          setCustomTopic('');
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error("错误", {
        description: `文章生成失败: ${error}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBilingualArticle = async (topic: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/seo-blog/generate-bilingual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      
      const data = await response.json();
      if (data.success) {
        const successCount = data.articles.filter((a: any) => !a.error).length;
        toast.success("成功", {
          description: `双语文章生成完成，成功生成 ${successCount} 篇文章`,
        });
        if (topic === customTopic) {
          setCustomTopic('');
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error("错误", {
        description: `双语文章生成失败: ${error}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBatchGenerate = async () => {
    if (topics.length === 0) {
      toast.error("错误", {
        description: "请先生成题目建议",
      });
      return;
    }

    setLoading(true);
    setBatchResults([]);
    
    try {
      const topicTitles = topics.map(topic => topic.title);
      const response = await fetch("/api/seo-blog/batch-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          topics: topicTitles,
          language: batchLanguage,
          concurrency: concurrency
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setBatchResults(data.results);
        toast.success("成功", {
          description: data.summary.message,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error("错误", {
        description: `批量生成失败: ${error}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleValidateSitemap = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/seo-blog/validate-sitemap", {
        method: "POST",
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success("成功", {
          description: data.message,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error("错误", {
        description: `Sitemap验证失败: ${error}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSitemap = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/seo-blog/update-sitemap", {
        method: "POST",
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success("成功", {
          description: data.message,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error("错误", {
        description: `Sitemap更新失败: ${error}`,
      });
    } finally {
      setLoading(false);
    }
  };



  const handleAutoGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/seo-blog/auto-generate?manual=true&secret=test`, {
        method: "GET",
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success("自动生成任务启动", {
          description: data.message,
          duration: 8000,
        });
      } else {
        console.error("自动生成失败详情:", data);
        throw new Error(data.error || "自动生成任务失败");
      }
    } catch (error) {
      toast.error("错误", {
        description: `自动生成失败: ${error}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <FileText className="h-6 w-6" />
        <h1 className="text-3xl font-bold">SEO 博客生成器</h1>
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">包含内链优化</span>
      </div>

      {/* 步骤1：题目生成区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5" />
            <span>步骤1：生成文章题目建议</span>
          </CardTitle>
          <CardDescription>
            使用AI生成高质量的SEO博客文章题目建议，生成的文章将包含至少3个内链
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="theme">主题方向</Label>
              <Input
                id="theme"
                placeholder="留空使用默认主题"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="language">语言</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Chinese">中文</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="count">题目数量</Label>
              <Input
                id="count"
                type="number"
                min="1"
                max="20"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 5)}
              />
            </div>
          </div>
          <Button onClick={handleGenerateTopics} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            生成题目建议
          </Button>

          {topics.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">生成的题目建议：</h3>
              <div className="space-y-2">
                {topics.map((topic, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="flex-1">{topic.title}</span>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateSingleArticle(topic.title)}
                        disabled={loading}
                      >
                        生成单篇
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateBilingualArticle(topic.title)}
                        disabled={loading}
                      >
                        生成双语
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 步骤2：自定义文章生成 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>步骤2：自定义文章生成</span>
          </CardTitle>
          <CardDescription>
            输入自定义题目生成包含内链的文章
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="customTopic">文章题目</Label>
            <Input
              id="customTopic"
              placeholder="输入文章题目..."
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
            />
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => handleGenerateSingleArticle(customTopic)}
              disabled={loading || !customTopic.trim()}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              生成单篇文章
            </Button>
            <Button
              variant="outline"
              onClick={() => handleGenerateBilingualArticle(customTopic)}
              disabled={loading || !customTopic.trim()}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
              生成双语文章
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 步骤3：批量生成 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>步骤3：批量生成文章</span>
          </CardTitle>
          <CardDescription>
            将步骤1中生成的所有题目批量生成为文章
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="batchLanguage">批量生成语言</Label>
              <Select value={batchLanguage} onValueChange={setBatchLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Chinese">中文</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="concurrency">并发数 (1-5)</Label>
              <Input
                id="concurrency"
                type="number"
                min="1"
                max="5"
                value={concurrency}
                onChange={(e) => setConcurrency(Math.min(5, Math.max(1, parseInt(e.target.value) || 3)))}
              />
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              将使用步骤1中生成的所有题目进行批量生成
              {topics.length > 0 && ` (共 ${topics.length} 个题目)`}
              <br />
              当前并发数：{concurrency}，这将同时处理 {concurrency} 篇文章以提高生成速度
            </p>
          </div>

          <Button
            onClick={handleBatchGenerate}
            disabled={loading || topics.length === 0}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            批量生成所有文章
          </Button>

          {batchResults.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">批量生成结果：</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {batchResults.map((result, index) => (
                  <div key={index} className={`text-sm p-3 rounded border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    {result.success ? (
                      <div className="space-y-1">
                        <div className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                          ✓ {result.title}
                        </div>
                        <div className="text-xs text-gray-600">
                          Slug: {result.slug} | 封面图片: ✓ 已设置
                        </div>
                      </div>
                    ) : (
                      <div className="text-red-800">
                        ✗ {result.topic}: {result.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 系统管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>系统管理</span>
          </CardTitle>
          <CardDescription>
            Sitemap管理和自动化操作
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button onClick={handleValidateSitemap} disabled={loading} variant="outline">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
              验证Sitemap
            </Button>
            <Button onClick={handleUpdateSitemap} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
              更新Sitemap
            </Button>

            <Button onClick={handleAutoGenerate} disabled={loading} variant="default" className="bg-green-600 hover:bg-green-700">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              手动触发每日生成
            </Button>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2">🤖 GitHub Actions 自动化</h4>
            <p className="text-sm text-blue-700 space-y-2">
              <span className="block">📊 <strong>自动生成文章</strong>：每日UTC 02:00 自动生成中英文各5篇文章</span>
              <span className="block">📄 <strong>自动更新Sitemap</strong>：每日UTC 03:00 自动更新sitemap并推送到仓库</span>
              <span className="block">🚀 <strong>自动部署</strong>：Vercel检测到仓库更改后自动重新部署</span>
              <span className="block">✨ <strong>智能时间分散</strong>：文章发布时间随机分散在1-3天内</span>
              <span className="block">💡 手动测试：可点击"手动触发每日生成"按钮立即测试</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 