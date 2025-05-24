"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Icon from "@/components/icon";
import { useAppContext } from "@/contexts/app";
import { toast } from "sonner";

interface VideoInfo {
  url: string;
  resolution: string;
  quality: string;
  downloadUrl: string;
}

interface ParsedData {
  thumbnail: string;
  videos: VideoInfo[];
  text: string;
  username: string;
  statusId: string;
}

interface UserCredits {
  user_uuid: string;
  total_credits: number;
  available_credits: number;
  expired_credits: number;
}

interface DownloadResultClientProps {
  downloadData: ParsedData;
}

export default function DownloadResultClient({ downloadData }: DownloadResultClientProps) {
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
        } else {
          console.error('Failed to fetch credits:', result.message);
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

  const handleDownload = async (video: VideoInfo) => {
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
      const response = await fetch(video.downloadUrl + 
        `&original_url=https://x.com/${downloadData.username}/status/${downloadData.statusId}` +
        `&username=${downloadData.username}&status_id=${downloadData.statusId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download failed:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // 获取文件名
      const contentDisposition = response.headers.get('content-disposition');
      const fileNameMatch = contentDisposition?.match(/filename="(.+)"/);
      const fileName = fileNameMatch ? fileNameMatch[1] : `TwitterDown_${downloadData.username}_${video.resolution}.mp4`;

      // 创建下载链接
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // 更新积分余额
      const creditsRemaining = response.headers.get('X-Credits-Remaining');
      
      if (creditsRemaining && userCredits) {
        setUserCredits({
          ...userCredits,
          available_credits: parseInt(creditsRemaining)
        });
      }

      toast.success(t('download_success'), {
        description: `${fileName} - ${video.quality} ${video.resolution}`
      });
      
    } catch (error) {
      console.error('Download error:', error);
      toast.error(t('download_failed'), {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setDownloadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(downloadKey);
        return newSet;
      });
    }
  };

  const handleNewDownload = () => {
    router.push('/');
  };

  return (
    <div className="container py-12">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{t('title')}</h1>
          </div>
          <Button onClick={handleNewDownload}>
            <Icon name="RiAddLine" className="w-4 h-4 mr-2" />
            {t('new_download')}
          </Button>
        </div>

        {/* Video Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="RiInformationLine" className="w-5 h-5" />
              {t('video_info')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              {/* Thumbnail */}
              {downloadData.thumbnail && (
                <div className="flex-shrink-0">
                  <img
                    src={downloadData.thumbnail}
                    alt={t('video_preview')}
                    className="w-40 h-28 object-cover rounded-lg border"
                  />
                </div>
              )}
              
              {/* Content */}
              <div className="flex-1 space-y-3">
                {/* User info */}
                <div className="flex items-center gap-2">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={`https://unavatar.io/twitter/${downloadData.username}`} />
                    <AvatarFallback>{downloadData.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-lg">@{downloadData.username}</span>
                </div>
                
                {/* Tweet text */}
                {downloadData.text && (
                  <p className="text-muted-foreground">
                    {downloadData.text}
                  </p>
                )}
                
                {/* Tweet link and Credits info */}
                <div className="flex items-center gap-6 text-sm">
                  <a 
                    href={`https://x.com/${downloadData.username}/status/${downloadData.statusId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Icon name="RiExternalLinkLine" className="w-4 h-4" />
                    View original post
                  </a>
                  
                  {/* Credits info */}
                  {user && userCredits && (
                    <div className="flex items-center gap-1">
                      <Icon name="RiCoinLine" className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium">{t('available_credits')}: {userCredits.available_credits}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Download Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="RiDownloadLine" className="w-5 h-5" />
              {t('available_formats')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {downloadData.videos.map((video, index) => {
                const requiredCredits = getRequiredCredits(video.resolution);
                const isDownloading = downloadingItems.has(video.downloadUrl);
                const canDownload = !user || (userCredits && userCredits.available_credits >= requiredCredits);
                
                return (
                  <Card key={index} className={`border-2 transition-all duration-200 ${
                    canDownload 
                      ? 'hover:border-primary/50 hover:shadow-md' 
                      : 'opacity-75 border-muted'
                  }`}>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant={video.quality === 'HD' ? 'default' : 'secondary'}
                          className={video.quality === 'HD' ? 'bg-gradient-to-r from-blue-500 to-purple-600' : ''}
                        >
                          <Icon name={video.quality === 'HD' ? 'RiHdLine' : 'RiSdCardLine'} className="w-3 h-3 mr-1" />
                          {video.quality === 'HD' ? t('quality_hd') : t('quality_sd')}
                        </Badge>
                        <Badge variant="outline" className="font-mono text-sm">
                          {video.resolution}
                        </Badge>
                      </div>
                      
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('resolution')}:</span>
                          <span className="font-medium">{video.resolution}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('format')}:</span>
                          <span className="font-medium">MP4</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">{t('cost_credits')}:</span>
                          <div className="flex items-center gap-1">
                            <Icon name="RiCoinLine" className="w-4 h-4 text-yellow-500" />
                            <span className="font-medium">{t('cost_format', { credits: requiredCredits })}</span>
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full" 
                        onClick={() => handleDownload(video)}
                        disabled={isDownloading || !canDownload}
                        variant={canDownload ? "default" : "secondary"}
                        size="lg"
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
      </div>
    </div>
  );
} 