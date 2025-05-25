"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Icon from "@/components/icon";
import { useAppContext } from "@/contexts/app";
import { toast } from "sonner";

interface VideoInfo {
  url: string;
  resolution: string;
  quality: string;
  downloadUrl: string;
}

interface BatchResult {
  originalUrl: string;
  thumbnail: string | null;
  videos: VideoInfo[];
  text: string;
  username: string | null;
  statusId: string | null;
  processedAt: string;
}

interface BatchData {
  results: BatchResult[];
  errors: { url: string; error: string }[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

interface UserCredits {
  user_uuid: string;
  total_credits: number;
  available_credits: number;
  expired_credits: number;
}

interface BatchDownloadResultClientProps {
  batchData: BatchData;
}

export default function BatchDownloadResultClient({ batchData }: BatchDownloadResultClientProps) {
  const { user, setShowSignModal } = useAppContext();
  const t = useTranslations('downloads.results');
  const router = useRouter();
  
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [downloadingItems, setDownloadingItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchUserCredits();
    }
  }, [user]);

  const fetchUserCredits = async () => {
    try {
      const response = await fetch('/api/credits/balance');
      if (response.ok) {
        const result = await response.json();
        if (result.code === 0) {
          setUserCredits(result.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user credits:', error);
    }
  };

  const getRequiredCredits = (resolution: string): number => {
    const resolutionNumber = parseInt(resolution.replace('p', ''));
    return resolutionNumber >= 720 ? 2 : 1;
  };

  const handleDownload = async (video: VideoInfo, resultItem: BatchResult) => {
    if (!user) {
      setShowSignModal(true);
      return;
    }

    const requiredCredits = getRequiredCredits(video.resolution);
    
    if (userCredits && userCredits.available_credits < requiredCredits) {
      toast.error(t('insufficient_credits', {
        available: userCredits.available_credits,
        required: requiredCredits
      }));
      return;
    }

    const downloadKey = video.downloadUrl;
    setDownloadingItems(prev => new Set(prev).add(downloadKey));

    try {
      // 1. 调用API获取视频URL和文件名
      const token = video.downloadUrl.split('token=')[1].split('&')[0];
      const apiResponse = await fetch('/api/twitter/get-download-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          original_url: resultItem.originalUrl,
          username: resultItem.username,
          status_id: resultItem.statusId,
        }),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => ({ message: t('parse_error') }));
        throw new Error(errorData.message || `API Error: ${apiResponse.status}`);
      }
      
      const result = await apiResponse.json();
      if (result.code !== 0) {
        throw new Error(result.message || t('parse_error'));
      }

      const { videoUrl, filename, creditsRemaining } = result.data;

      // 2. 前端直接 fetch 视频内容 (流量：Twitter -> 用户浏览器)
      const videoBlobResponse = await fetch(videoUrl);
      if (!videoBlobResponse.ok) {
        throw new Error(t('video_fetch_error', { status: videoBlobResponse.status }));
      }
      const blob = await videoBlobResponse.blob();

      // 3. 创建下载链接并触发下载
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename; // 使用API提供的文件名
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url); // 清理

      // 更新积分
      if (userCredits && creditsRemaining !== undefined) {
        setUserCredits(prev => prev ? { ...prev, available_credits: creditsRemaining } : null);
      }

      toast.success(t('download_success'), {
        description: `${filename} - ${video.quality} ${video.resolution}`
      });

    } catch (error) {
      console.error('Download error:', error);
      toast.error(t('download_failed'), {
        description: error instanceof Error ? error.message : t('unknown_error') 
      });
    } finally {
      setDownloadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(downloadKey);
        return newSet;
      });
    }
  };

  return (
    <div className="container py-12">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{t('batch_title')}</h1>
          </div>
          <Button onClick={() => router.push('/')}>
            <Icon name="RiAddLine" className="w-4 h-4 mr-2" />
            {t('new_download')}
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="flex justify-center gap-4 text-sm mb-8">
          <Badge variant="default" className="px-3 py-1">
            <Icon name="RiCheckLine" className="w-4 h-4 mr-1" />
            {t('success_count')}: {batchData.summary.successful}
          </Badge>
          {batchData.summary.failed > 0 && (
            <Badge variant="destructive" className="px-3 py-1">
              <Icon name="RiCloseLine" className="w-4 h-4 mr-1" />
              {t('failed_count')}: {batchData.summary.failed}
            </Badge>
          )}
          <Badge variant="secondary" className="px-3 py-1">
            {t('total_count')}: {batchData.summary.total}
          </Badge>
        </div>

        {/* User Credits */}
        {user && userCredits && (
          <Card className="mb-6">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <Icon name="RiCoinLine" className="w-5 h-5 text-yellow-500" />
                <span className="font-medium">{t('available_credits')}: {userCredits.available_credits}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/#pricing'}>
                <Icon name="RiAddLine" className="w-4 h-4 mr-1" />
                {t('top_up_credits')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Successful Results */}
        {batchData.results.length > 0 && (
          <div className="space-y-6 mb-8">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Icon name="RiCheckLine" className="w-5 h-5 text-green-500" />
              {t('successful_videos')} ({batchData.results.length})
            </h2>
            
            {batchData.results.map((result, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader>
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    {result.thumbnail && (
                      <div className="flex-shrink-0">
                        <img
                          src={result.thumbnail}
                          alt="Video preview"
                          className="w-32 h-20 object-cover rounded-lg border"
                        />
                      </div>
                    )}
                    
                    {/* Content */}
                    <div className="flex-1 space-y-2">
                      {/* User info */}
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={`https://unavatar.io/twitter/${result.username}`} />
                          <AvatarFallback>{result.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">@{result.username}</span>
                      </div>
                      
                      {/* Tweet text */}
                      {result.text && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {result.text}
                        </p>
                      )}
                      
                      {/* Tweet link */}
                      <a 
                        href={result.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Icon name="RiExternalLinkLine" className="w-3 h-3" />
                        {t('view_original_tweet')}
                      </a>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {result.videos.map((video, videoIndex) => {
                      const requiredCredits = getRequiredCredits(video.resolution);
                      const isDownloading = downloadingItems.has(video.downloadUrl);
                      const canDownload = !user || (userCredits && userCredits.available_credits >= requiredCredits);
                      
                      return (
                        <Card key={videoIndex} className={`border-2 transition-all duration-200 ${
                          canDownload 
                            ? 'hover:border-primary/50 hover:shadow-md' 
                            : 'opacity-75 border-muted'
                        }`}>
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-lg">{video.resolution}</span>
                                  <Badge variant={video.quality === 'HD' ? 'default' : 'secondary'}>
                                    {video.quality}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {t('credits_required', { credits: requiredCredits })}
                                </p>
                              </div>
                            </div>
                            
                            <Button
                              onClick={() => handleDownload(video, result)}
                              disabled={!canDownload || isDownloading}
                              className="w-full"
                              size="sm"
                            >
                              {isDownloading ? (
                                <>
                                  <Icon name="RiLoader4Line" className="w-4 h-4 mr-2 animate-spin" />
                                  {t('downloading')}
                                </>
                              ) : !canDownload ? (
                                <>
                                  <Icon name="RiLockLine" className="w-4 h-4 mr-2" />
                                  {user ? t('insufficient_credits_short', { 
                                    available: userCredits?.available_credits || 0, 
                                    required: requiredCredits 
                                  }) : t('login_required')}
                                </>
                              ) : (
                                <>
                                  <Icon name="RiDownloadCloud2Fill" className="w-4 h-4 mr-2" />
                                  {t('download_button')}
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error Results */}
        {batchData.errors.length > 0 && (
          <div className="space-y-4 mb-8">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Icon name="RiErrorWarningLine" className="w-5 h-5 text-red-500" />
              {t('failed_links')} ({batchData.errors.length})
            </h2>
            
            {batchData.errors.map((error, index) => (
              <Card key={index} className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon name="RiCloseLine" className="w-5 h-5 text-red-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm break-all">{error.url}</p>
                      <p className="text-xs text-muted-foreground mt-1">{error.error}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="text-center space-y-4">
          <Button 
            onClick={() => router.push('/')} 
            variant="outline"
            size="lg"
          >
            <Icon name="RiAddLine" className="w-4 h-4 mr-2" />
            {t('continue_download')}
          </Button>
        </div>
      </div>
    </div>
  );
} 