import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Maximize,
  Cast,
  Minimize,
  MonitorPlay,
  Loader2,
  X
} from 'lucide-react';

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  onClose: () => void;
}

type AspectRatio = '16:9' | '4:3' | 'auto';

// Extend Window interface for Presentation API
declare global {
  interface Window {
    PresentationRequest?: any;
  }
}

export function VideoPlayer({ videoUrl, title, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presentationConnectionRef = useRef<any>(null);
  const presentationRequestRef = useRef<any>(null);
  const isStartingCastRef = useRef(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [isBuffering, setIsBuffering] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [castDeviceAvailable, setCastDeviceAvailable] = useState(false);
  const [showCastModal, setShowCastModal] = useState(false);

  // Formatação de tempo
  const formatTime = useCallback((time: number): string => {
    if (!isFinite(time)) return '0:00';
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Initialize Presentation API
  useEffect(() => {
    if (!('PresentationRequest' in window)) {
      return;
    }

    try {
      const presentationUrl = window.location.origin + '/cast-receiver.html';
      
      const request = new (window as any).PresentationRequest([presentationUrl]);
      presentationRequestRef.current = request;

      request.getAvailability()
        .then((availability: any) => {
          setCastDeviceAvailable(availability.value);
          
          availability.addEventListener('change', () => {
            setCastDeviceAvailable(availability.value);
          });
        })
        .catch((error: any) => {
        });

      request.addEventListener('connectionavailable', (event: any) => {
        const connection = event.connection;
        presentationConnectionRef.current = connection;
        setIsCasting(true);

        if (connection.state === 'connected') {
          connection.send(JSON.stringify({
            type: 'load',
            videoUrl: videoUrl,
            title: title,
            currentTime: videoRef.current?.currentTime || 0
          }));
        }

        connection.addEventListener('message', (messageEvent: any) => {
          const data = JSON.parse(messageEvent.data);
          
          if (data.type === 'timeupdate' && videoRef.current) {
            videoRef.current.currentTime = data.currentTime;
          }
          
          if (data.type === 'play' && videoRef.current) {
            videoRef.current.play();
          }
          
          if (data.type === 'pause' && videoRef.current) {
            videoRef.current.pause();
          }
        });

        connection.addEventListener('close', () => {
          setIsCasting(false);
          presentationConnectionRef.current = null;
        });

        connection.addEventListener('terminate', () => {
          setIsCasting(false);
          presentationConnectionRef.current = null;
        });
      });

    } catch (error) {
    }

    return () => {
      if (presentationConnectionRef.current) {
        try {
          presentationConnectionRef.current.close();
        } catch (e) {
        }
      }
    };
  }, [videoUrl, title]);

  // Sync video state with cast
  useEffect(() => {
    if (!isCasting || !presentationConnectionRef.current) return;

    const connection = presentationConnectionRef.current;
    const video = videoRef.current;
    if (!video) return;

    const sendUpdate = (type: string, data?: any) => {
      if (connection.state === 'connected') {
        try {
          connection.send(JSON.stringify({
            type,
            currentTime: video.currentTime,
            ...data
          }));
        } catch (e) {
        }
      }
    };

    const handlePlay = () => sendUpdate('play');
    const handlePause = () => sendUpdate('pause');
    const handleSeeked = () => sendUpdate('seek');
    const handleTimeUpdate = () => {
      // Send time updates less frequently
      if (Math.floor(video.currentTime) % 5 === 0) {
        sendUpdate('timeupdate');
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [isCasting]);

  // Toggle Play/Pause
  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !isReady) return;

    try {
      if (video.paused) {
        await video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    } catch (error) {
    }
  }, [isReady]);

  // Skip (avançar/retroceder)
  const skip = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video || !isReady) return;
    
    const newTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
    video.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration, isReady]);

  // Seek na barra de progresso
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !progressRef.current || !isReady) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pos * duration;
    
    video.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration, isReady]);

  // Toggle Fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
    }
  }, []);

  // Cycle Aspect Ratio
  const cycleAspectRatio = useCallback(() => {
    setAspectRatio((prev) => {
      if (prev === '16:9') return '4:3';
      if (prev === '4:3') return 'auto';
      return '16:9';
    });
  }, []);

  // Cast to TV
  const handleChromecast = useCallback(async () => {
    if (isStartingCastRef.current) {
      return;
    }

    if (isCasting) {
      if (presentationConnectionRef.current) {
        try {
          presentationConnectionRef.current.terminate();
          setIsCasting(false);
          presentationConnectionRef.current = null;
        } catch (error) {
        }
      }
      return;
    }

    const video = videoRef.current;
    if (video && 'remote' in video) {
      try {
        isStartingCastRef.current = true;
        const remotePlayback = (video as any).remote;
        
        if (remotePlayback.state === 'disconnected') {
          await remotePlayback.prompt();
          
          remotePlayback.addEventListener('connect', () => {
            setIsCasting(true);
            isStartingCastRef.current = false;
          });
          
          remotePlayback.addEventListener('connecting', () => {
          });
          
          remotePlayback.addEventListener('disconnect', () => {
            setIsCasting(false);
            isStartingCastRef.current = false;
          });
        } else {
          await remotePlayback.prompt();
        }
        
        setTimeout(() => {
          isStartingCastRef.current = false;
        }, 3000);
        
        return;
      } catch (error: any) {
        isStartingCastRef.current = false;
      }
    }

    if (!presentationRequestRef.current) {
      setShowCastModal(true);
      return;
    }

    try {
      isStartingCastRef.current = true;
      
      const availability = await presentationRequestRef.current.getAvailability();
      
      if (!availability.value) {
        isStartingCastRef.current = false;
        setShowCastModal(true);
        return;
      }

      await presentationRequestRef.current.start();
      
      setTimeout(() => {
        isStartingCastRef.current = false;
      }, 1000);
      
    } catch (error: any) {
      isStartingCastRef.current = false;
      
      if (error.name === 'NotFoundError') {
        setShowCastModal(true);
      } else if (error.name === 'NotAllowedError') {
      } else if (error.name === 'AbortError') {
      } else if (error.name === 'OperationError') {
      } else {
        setShowCastModal(true);
      }
    }
  }, [isCasting]);

  // Controle de visibilidade dos controles
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    
    hideControlsTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 3000);
  }, []);

  // Event listeners do vídeo
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsReady(true);
      setIsBuffering(false);
      video.play().catch(err => {
      });
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(10);
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (isFullscreen) {
            toggleFullscreen();
          } else {
            onClose();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePlay, skip, toggleFullscreen, isFullscreen, onClose]);

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, []);

  // Aspect ratio class
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case '16:9':
        return 'aspect-video';
      case '4:3':
        return 'aspect-[4/3]';
      case 'auto':
        return 'w-full h-full';
      default:
        return 'aspect-video';
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onMouseMove={showControlsTemporarily}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          togglePlay();
        }
      }}
    >
      {/* Video Container */}
      <div className={`relative ${isFullscreen ? 'w-full h-full' : 'w-full max-w-7xl'}`}>
        {/* Video Element */}
        <video
          ref={videoRef}
          className={`${getAspectRatioClass()} bg-black object-contain mx-auto`}
          src={videoUrl}
          onClick={togglePlay}
          playsInline
          preload="metadata"
          crossOrigin="anonymous"
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture={false}
          autoPlay={false}
        />

        {/* Loading Indicator */}
        {isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/60 rounded-full p-4">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/60 pointer-events-none" />

          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
            <button
              onClick={onClose}
              className="flex items-center gap-2 bg-black/60 hover:bg-black/80 px-4 py-2 rounded-lg text-white transition-colors focus:outline-none"
            >
              <X className="w-4 h-4" />
              <span>Voltar</span>
            </button>
            <h2 className="text-white truncate flex-1 mx-4 text-center">{title}</h2>
            <div className="w-24" />
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
            {/* Progress Bar */}
            <div className="mb-3">
              <div
                ref={progressRef}
                onClick={handleProgressClick}
                className="w-full h-1 bg-white/30 rounded-full cursor-pointer group relative focus:outline-none"
              >
                {/* Progress Fill */}
                <div
                  className="absolute inset-y-0 left-0 bg-blue-600 rounded-full transition-all pointer-events-none"
                  style={{ width: `${progress}%` }}
                >
                  {/* Progress Thumb */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              
              {/* Time Display */}
              <div className="flex items-center justify-between mt-1 text-xs text-white/90">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              {/* Left Side Controls */}
              <div className="flex items-center gap-2">
                {/* Skip Back */}
                <button
                  onClick={() => skip(-10)}
                  disabled={!isReady}
                  className="p-2 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
                  title="Voltar 10s (←)"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  disabled={!isReady}
                  className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
                  title={isPlaying ? 'Pausar (Space)' : 'Reproduzir (Space)'}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 fill-white" />
                  )}
                </button>

                {/* Skip Forward */}
                <button
                  onClick={() => skip(10)}
                  disabled={!isReady}
                  className="p-2 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
                  title="Avançar 10s (→)"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              {/* Right Side Controls */}
              <div className="flex items-center gap-2">
                {/* Aspect Ratio */}
                <button
                  onClick={cycleAspectRatio}
                  className="flex items-center gap-1.5 px-3 py-2 bg-black/60 hover:bg-black/80 rounded-lg text-white text-sm transition-colors focus:outline-none"
                  title="Alterar proporção"
                >
                  <MonitorPlay className="w-4 h-4" />
                  <span>{aspectRatio}</span>
                </button>

                {/* Chromecast */}
                <button
                  onClick={handleChromecast}
                  className={`p-2 rounded-lg text-white transition-colors focus:outline-none ${
                    isCasting 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-black/60 hover:bg-black/80'
                  }`}
                  title={isCasting ? 'Desconectar da TV' : 'Transmitir para TV'}
                >
                  <Cast className={`w-5 h-5 ${isCasting ? 'fill-white' : ''}`} />
                </button>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-colors focus:outline-none"
                  title={isFullscreen ? 'Sair da tela cheia (F)' : 'Tela cheia (F)'}
                >
                  {isFullscreen ? (
                    <Minimize className="w-5 h-5" />
                  ) : (
                    <Maximize className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showCastModal && (
        <CastDeviceModal
          isOpen={showCastModal}
          onClose={() => setShowCastModal(false)}
        />
      )}
    </div>
  );
}
