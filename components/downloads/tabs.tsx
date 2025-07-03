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
import { isValidKuaishouUrl, validateKuaishouUrls, normalizeKuaishouUrl } from '@/lib/url-validator';

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



  // 新增状态
  const [isLoading, setIsLoading] = useState(false);
  const [isBatchLoading, setIsBatchLoading] = useState(false);

  // Check if user can use free download and premium status
  useEffect(() => {
    const checkFreeUsage = () => {
      const downloadCount = parseInt(localStorage.getItem("kuaishou_download_count") || "0");
      setFreeDownloadCount(downloadCount);
      if (downloadCount >= 5 && !user) {
        setCanUseFree(false);
      }
    };

    checkFreeUsage();
  }, [user]);

  const handleSingleDownload = async () => {
    if (!singleUrl.trim()) {
      toast.error(t('results.invalid_url'));
      return;
    }

    // URL格式验证
    const normalizedUrl = normalizeKuaishouUrl(singleUrl.trim());
    if (!isValidKuaishouUrl(normalizedUrl)) {
      toast.error(t('results.invalid_kuaishou_url'));
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/kuaishou', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      const result = await response.json();

      if (result.code === 0 && result.data && result.data.token) {
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
    const urls = batchUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urls.length === 0) {
      toast.error(t('results.no_urls_provided'));
      return;
    }

    // 验证URL格式
    const normalizedUrls = urls.map(url => normalizeKuaishouUrl(url));
    const validation = validateKuaishouUrls(normalizedUrls);

    if (validation.invalid.length > 0) {
      toast.error(t('results.invalid_kuaishou_urls', { count: validation.invalid.length }));
      return;
    }

    if (validation.valid.length === 0) {
      toast.error(t('results.no_valid_urls'));
      return;
    }

    setIsBatchLoading(true);

    try {
      const response = await fetch('/api/kuaishou/batch', {
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
          className="relative"
        >
          <Icon name="RiStackLine" className="w-4 h-4 mr-2" />
          {t('batch_download')}
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
            />
            <Button
              onClick={handleSingleDownload}
              className="h-16 px-8 text-lg"
              size="lg"
              disabled={!singleUrl.trim() || isLoading}
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
          

          
          <p className="text-sm text-muted-foreground">
            <Icon name="RiGiftLine" className="w-4 h-4 inline mr-1" />
            {t('free_user_tip')}
          </p>
        </div>
      </TabsContent>

      <TabsContent value="batch" className="space-y-4">
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
      </TabsContent>
    </Tabs>
  );
} 