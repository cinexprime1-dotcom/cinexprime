import React, { useEffect, useRef, useState } from 'react';
import { VideoPlayer } from './VideoPlayer';

interface VideoPlayerProxyProps {
  videoUrl: string;
  title: string;
  onClose: () => void;
}

export function VideoPlayerProxy({ videoUrl, title, onClose }: VideoPlayerProxyProps) {
  const [processedUrl, setProcessedUrl] = useState<string>(videoUrl);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    processVideoUrl(videoUrl);
  }, [videoUrl]);

  const processVideoUrl = async (url: string) => {
    try {
      let cleanUrl = url.trim();

      if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.m3u8', '.mpd'];
        const hasVideoExtension = videoExtensions.some(ext => 
          cleanUrl.toLowerCase().includes(ext)
        );

        if (hasVideoExtension) {
          setProcessedUrl(cleanUrl);
        } else {
          try {
            const response = await fetch(cleanUrl, { 
              method: 'HEAD',
              mode: 'no-cors'
            });
            
            setProcessedUrl(cleanUrl);
          } catch (error) {
            setProcessedUrl(cleanUrl);
          }
        }
      } 
      else if (cleanUrl.startsWith('blob:')) {
        setProcessedUrl(cleanUrl);
      }
      else if (cleanUrl.startsWith('data:')) {
        setProcessedUrl(cleanUrl);
      }
      else if (cleanUrl.startsWith('/') || cleanUrl.startsWith('./')) {
        setProcessedUrl(window.location.origin + cleanUrl);
      }
      else {
        setProcessedUrl(cleanUrl);
      }

    } catch (error) {
      setProcessedUrl(videoUrl);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-white text-lg">Preparando vídeo...</div>
      </div>
    );
  }

  return <VideoPlayer videoUrl={processedUrl} title={title} onClose={onClose} />;
}