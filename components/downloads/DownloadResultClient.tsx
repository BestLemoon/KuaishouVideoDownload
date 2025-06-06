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

interface UserStatus {
  isLoggedIn: boolean;
  isPremium: boolean;
  canUseFree: boolean;
}

interface DownloadResultClientProps {
  downloadData: ParsedData;
}

export default function DownloadResultClient({ downloadData }: DownloadResultClientProps) {
  const { user, setShowSignModal } = useAppContext();
  const t = useTranslations('downloads.results');
  const router = useRouter();
  
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [downloadingItems, setDownloadingItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchUserCredits();
      fetchUserStatus();
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

  const fetchUserStatus = async () => {
    try {
      const response = await fetch('/api/user-status');
      if (response.ok) {
        const result = await response.json();
        if (result.code === 0) {
          setUserStatus(result.data);
        } else {
          setUserStatus({
            isLoggedIn: false,
            isPremium: false,
            canUseFree: true
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch user status:', error);
      setUserStatus({
        isLoggedIn: false,
        isPremium: false,
        canUseFree: true
      });
    }
  };

  // 判断是否为高清视频（只有最高清晰度的才算高清）
  const isHighDefinition = (resolution: string, allVideos: VideoInfo[]): boolean => {
    const resolutions = allVideos.map(v => parseInt(v.resolution.replace('p', '')));
    const maxResolution = Math.max(...resolutions);
    const currentResolution = parseInt(resolution.replace('p', ''));
    return currentResolution === maxResolution;
  };

  // 检查用户是否可以下载高清视频（需要付费用户）
  const canDownloadHD = (): boolean => {
    if (!user || !userStatus) return false;
    // 只有付费用户才能下载高清视频
    return userStatus.isPremium;
  };

  const handleVideoDownload = async (video: VideoInfo) => {

    const downloadKey = video.downloadUrl;
    setDownloadingItems(prev => new Set(prev).add(downloadKey));

    try {
      // 1. 调用API获取视频URL和文件名
      const token = video.downloadUrl.split('token=')[1].split('&')[0]; // Extract token
      const apiResponse = await fetch('/api/twitter/get-download-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          original_url: `https://x.com/${downloadData.username}/status/${downloadData.statusId}`,
          username: downloadData.username,
          status_id: downloadData.statusId,
        }),
      });

      if (!apiResponse.ok) {
        // Try to parse error from API, otherwise use a generic message
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

      // 更新下载次数
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

  const handleThumbnailDownload = async () => {
    if (!downloadData.thumbnail) {
      toast.error(t('no_thumbnail_available'));
      return;
    }

    if (!user) {
      setShowSignModal(true);
      return;
    }

    if (userCredits && userCredits.available_credits < 1) {
      toast.error(t('insufficient_downloads'));
      return;
    }

    const downloadKey = 'thumbnail';
    setDownloadingItems(prev => new Set(prev).add(downloadKey));

    try {
      const response = await fetch(downloadData.thumbnail);
      if (!response.ok) {
        throw new Error(t('thumbnail_fetch_error'));
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${downloadData.username}_${downloadData.statusId}_thumbnail.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(t('thumbnail_download_success'));

    } catch (error) {
      console.error('Thumbnail download error:', error);
      toast.error(t('thumbnail_download_failed'));
    } finally {
      setDownloadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(downloadKey);
        return newSet;
      });
    }
  };

  const handleAudioDownload = async () => {

    const downloadKey = 'audio';
    setDownloadingItems(prev => new Set(prev).add(downloadKey));
    
    try {
      const apiResponse = await fetch('/api/twitter/get-audio-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original_url: `https://x.com/${downloadData.username}/status/${downloadData.statusId}`,
          username: downloadData.username,
          status_id: downloadData.statusId,
        }),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => ({ message: t('audio_download_failed') }));
        throw new Error(errorData.message || `API Error: ${apiResponse.status}`);
      }

      const result = await apiResponse.json();
      if (result.code !== 0) {
        throw new Error(result.message || t('audio_download_failed'));
      }
      
      const { audioBlob, audioUrl, filename, creditsRemaining } = result.data;

      if (audioBlob) {
        // 如果API返回了音频数据，直接下载
        const blob = new Blob([new Uint8Array(audioBlob)], { type: 'audio/mpeg' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else if (audioUrl) {
        // 如果API返回了URL，前端fetch下载
        const audioResponse = await fetch(audioUrl);
        if (!audioResponse.ok) {
          throw new Error(t('audio_download_failed'));
        }
        
        const blob = await audioResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      // 更新积分余额
      if (userCredits && creditsRemaining !== undefined) {
        setUserCredits(prev => prev ? { ...prev, available_credits: creditsRemaining } : null);
      }

      toast.success(t('download_success'), {
        description: `${filename} - Audio MP3`
      });

    } catch (error) {
      console.error('Audio download error:', error);
      toast.error(t('audio_download_failed'), {
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
                
                {/* Tweet link and Downloads info */}
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
                  

                </div>

                {/* Thumbnail Download Button */}
                {downloadData.thumbnail && (
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleThumbnailDownload}
                      disabled={downloadingItems.has('thumbnail')}
                      className="text-xs"
                    >
                      {downloadingItems.has('thumbnail') ? (
                        <>
                          <Icon name="RiLoader4Line" className="w-3 h-3 mr-1 animate-spin" />
                          {t('downloading')}
                        </>
                      ) : (
                        <>
                          <Icon name="RiImageLine" className="w-3 h-3 mr-1" />
                          {t('download_thumbnail')}
                        </>
                      )}
                    </Button>
                  </div>
                )}
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
            <div className={`grid gap-6 ${
              downloadData.videos.length + 1 <= 2 ? 'md:grid-cols-2' :
              downloadData.videos.length + 1 <= 3 ? 'md:grid-cols-2 lg:grid-cols-3' :
              downloadData.videos.length + 1 <= 4 ? 'md:grid-cols-2 lg:grid-cols-4' :
              'md:grid-cols-2 lg:grid-cols-5'
            }`}>
              {/* Video Downloads */}
              {downloadData.videos.map((video, index) => {
                const isHD = isHighDefinition(video.resolution, downloadData.videos);
                const isDownloading = downloadingItems.has(video.downloadUrl);
                const canDownload = true;
                const canDownloadThisHD = true;
                
                return (
                  <Card key={index} className="border-2 transition-all duration-200 hover:border-primary/50 hover:shadow-md">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={isHD ? 'default' : 'secondary'}
                            className={isHD ? 'bg-gradient-to-r from-blue-500 to-purple-600' : ''}
                          >
                            <Icon name={isHD ? 'RiHdLine' : 'RiSdCardLine'} className="w-3 h-3 mr-1" />
                            {isHD ? t('quality_hd') : t('quality_sd')}
                          </Badge>

                        </div>
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

                      </div>
                      
                      <Button 
                        className="w-full" 
                        onClick={() => handleVideoDownload(video)}
                        disabled={isDownloading}
                        size="lg"
                      >
                        {isDownloading ? (
                          <>
                            <Icon name="RiLoader4Line" className="w-4 h-4 mr-2 animate-spin" />
                            {t('downloading')}
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

              {/* Audio Download Card - Always last */}
              <Card className="border-2 transition-all duration-200 hover:border-primary/50 hover:shadow-md">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
                        <Icon name="RiVolumeUpLine" className="w-3 h-3 mr-1" />
                        Audio
                      </Badge>
                    </div>
                    <Badge variant="outline" className="font-mono text-sm">
                      MP3
                    </Badge>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('format')}:</span>
                      <span className="font-medium">MP3</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('audio_quality')}:</span>
                      <span className="font-medium">{t('high_quality')}</span>
                    </div>

                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={handleAudioDownload}
                    disabled={downloadingItems.has('audio')}
                    size="lg"
                  >
                    {downloadingItems.has('audio') ? (
                      <>
                        <Icon name="RiLoader4Line" className="w-4 h-4 mr-2 animate-spin" />
                        {t('downloading')}
                      </>
                    ) : (
                      <>
                        <Icon name="RiHeadphoneLine" className="w-4 h-4 mr-2" />
                        {t('extract_audio')}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 