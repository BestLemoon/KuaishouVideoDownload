"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/icon";
import { useAppContext } from "@/contexts/app";
import { useTranslations } from "next-intl";
import { isValidTwitterUrl, validateTwitterUrls, normalizeTwitterUrl } from '@/lib/url-validator';

import { toast } from "sonner";

interface DownloadTabsProps {
  // Props can be added here in the future if needed
}



export default function DownloadTabs({}: DownloadTabsProps = {}) {
  const { user, setShowSignModal } = useAppContext();
  const t = useTranslations('downloads');
  const [singleUrl, setSingleUrl] = useState("");
  const [batchUrls, setBatchUrls] = useState("");
  const [canUseFree, setCanUseFree] = useState(true);
  const [freeDownloadCount, setFreeDownloadCount] = useState(0);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  
  // 新增状态
  const [isLoading, setIsLoading] = useState(false);
  const [isBatchLoading, setIsBatchLoading] = useState(false);

  // Check if user can use free download and premium status
  useEffect(() => {
    const checkFreeUsage = () => {
      const downloadCount = parseInt(localStorage.getItem("twitter_download_count") || "0");
      setFreeDownloadCount(downloadCount);
      if (downloadCount >= 5 && !user) {
        setCanUseFree(false);
      }
    };
    
    const checkUserStatus = async () => {
      if (user) {
        try {
          const response = await fetch('/api/user-status');
          if (response.ok) {
            const data = await response.json();
            if (data.code === 0) {
              setIsPremiumUser(data.data.isPremium);
            }
          }
        } catch (error) {
          console.error('Failed to check user status:', error);
        }
      } else {
        setIsPremiumUser(false);
      }
    };
    
    checkFreeUsage();
    checkUserStatus();
  }, [user]);

  const handleSingleDownload = async () => {
    if (!user && !canUseFree) {
      setShowSignModal(true);
      return;
    }

    if (!singleUrl.trim()) {
      toast.error(t('results.invalid_url'));
      return;
    }

    // URL格式验证
    const normalizedUrl = normalizeTwitterUrl(singleUrl.trim());
    if (!isValidTwitterUrl(normalizedUrl)) {
      toast.error(t('results.invalid_twitter_url'));
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/twitter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      const result = await response.json();

      if (result.code === 0 && result.data && result.data.token) {
        // Increment download count for free users
        if (!user) {
          const newCount = freeDownloadCount + 1;
          localStorage.setItem("twitter_download_count", newCount.toString());
          setFreeDownloadCount(newCount);
          
          if (newCount >= 5) {
            setCanUseFree(false);
          }
        }
        
        // 跳转到下载结果页面，使用加密token
        window.location.href = `/download-result?token=${result.data.token}`;
      } else {
        toast.error(result.message || t('results.parse_error'));
      }
    } catch (error) {
      console.error('Parse error:', error);
      toast.error(t('results.parse_error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchDownload = async () => {
    if (!user) {
      setShowSignModal(true);
      return;
    }

    if (!isPremiumUser) {
      // Redirect to pricing page
      window.location.href = "/#pricing";
      return;
    }

    const urls = batchUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urls.length === 0) {
      toast.error(t('results.no_urls_provided'));
      return;
    }

    // 验证URL格式
    const normalizedUrls = urls.map(url => normalizeTwitterUrl(url));
    const validation = validateTwitterUrls(normalizedUrls);

    if (validation.invalid.length > 0) {
      toast.error(t('results.invalid_twitter_urls', { count: validation.invalid.length }));
      return;
    }

    if (validation.valid.length === 0) {
      toast.error(t('results.no_valid_urls'));
      return;
    }

    setIsBatchLoading(true);

    try {
      const response = await fetch('/api/twitter/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls: validation.valid }),
      });

      const result = await response.json();

      if (result.code === 0 && result.data && result.data.token) {
        // 跳转到批量下载结果页面，使用加密token
        window.location.href = `/batch-download-result?token=${result.data.token}`;
      } else {
        toast.error(result.message || t('results.batch_parse_error'));
      }
    } catch (error) {
      console.error('Batch parse error:', error);
      toast.error(t('results.batch_parse_error'));
    } finally {
      setIsBatchLoading(false);
    }
  };



  return (
    <Tabs defaultValue="single" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="single">
          <Icon name="RiDownloadLine" className="w-4 h-4 mr-2" />
          {t('single_download')}
        </TabsTrigger>
        <TabsTrigger 
          value="batch" 
          disabled={!isPremiumUser}
          className="relative"
        >
          <Icon name="RiStackLine" className="w-4 h-4 mr-2" />
          {t('batch_download')}
          {!isPremiumUser && (
            <Icon name="RiLockLine" className="w-4 h-4 ml-1 text-yellow-500" />
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="single" className="space-y-4">
        <div className="space-y-3">
          <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-3 sm:space-y-0">
            <Input
              type="text"
              placeholder={t('single_placeholder')}
              value={singleUrl}
              onChange={(e) => setSingleUrl(e.target.value)}
              className="h-16 text-lg px-5 flex-grow"
              disabled={!user && !canUseFree}
            />
            <Button
              onClick={handleSingleDownload}
              className="h-16 px-8 text-lg"
              size="lg"
              disabled={(!user && !canUseFree) || !singleUrl.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <Icon name="RiLoader4Line" className="w-5 h-5 mr-2 animate-spin" />
                  {t('results.loading')}
                </>
              ) : (
                <>
                  <Icon name="RiDownloadCloud2Fill" className="w-5 h-5 mr-2" />
                  {t('start_download')}
                </>
              )}
            </Button>
          </div>
          
          {!user && !canUseFree && (
            <div className="text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
              <Icon name="RiInformationLine" className="w-4 h-4 inline mr-1" />
              {t('free_used_notice')} <button onClick={() => setShowSignModal(true)} className="text-primary underline">{t('login_to_continue')}</button> {t('continue_use')}
            </div>
          )}
          
          {user && canUseFree && (
            <p className="text-sm text-muted-foreground">
              <Icon name="RiGiftLine" className="w-4 h-4 inline mr-1" />
              {t('free_user_tip')}
            </p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="batch" className="space-y-4">
        {!isPremiumUser ? (
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-full flex items-center justify-center">
              <Icon name="RiVipCrown2Line" className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">{t('batch_feature_title')}</h3>
              <p className="text-muted-foreground">
                {t('batch_feature_description')}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 text-sm">
              <Badge variant="secondary">
                <Icon name="RiStackLine" className="w-3 h-3 mr-1" />
                {t('batch_processing')}
              </Badge>
              <Badge variant="secondary">
                <Icon name="RiTimerFlashLine" className="w-3 h-3 mr-1" />
                {t('high_speed')}
              </Badge>
              <Badge variant="secondary">
                <Icon name="RiDownloadCloud2Line" className="w-3 h-3 mr-1" />
                {t('unlimited')}
              </Badge>
            </div>
            <Button className="mt-4" onClick={() => window.location.href = "/#pricing"}>
              <Icon name="RiVipCrown2Line" className="w-4 h-4 mr-2" />
              {t('view_pricing')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea
              placeholder={t('batch_placeholder')}
              value={batchUrls}
              onChange={(e) => setBatchUrls(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {t('urls_count', { count: batchUrls.split('\n').filter(url => url.trim().length > 0).length })}
              </span>
              <Button
                onClick={handleBatchDownload}
                disabled={!batchUrls.trim() || isBatchLoading}
              >
                {isBatchLoading ? (
                  <>
                    <Icon name="RiLoader4Line" className="w-4 h-4 mr-2 animate-spin" />
                    {t('results.loading')}
                  </>
                ) : (
                  <>
                    <Icon name="RiStackLine" className="w-4 h-4 mr-2" />
                    {t('batch_download_button')}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
} 