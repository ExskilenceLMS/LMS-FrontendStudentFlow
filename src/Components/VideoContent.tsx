import React, { useEffect, useCallback, useState } from "react";
import LoaderComponent from "./LoaderComponent";
interface VideoLesson {
  otp: string;
  playback_info: string;
}

interface VideoContentProps {
  videoId: number | null;
  videoData: { otp: string; playback_info: string } | null;
  videoUrl?: string; // For direct video URLs
  onVideoLoad?: () => void;
  loading?: boolean; // Loading state from parent
}

const VideoContent: React.FC<VideoContentProps> = ({
  videoId,
  videoData,
  videoUrl,
  onVideoLoad,
  loading = false,
}) => {
  const [videoTimeTracking, setVideoTimeTracking] = useState<{
    totalPlayed: number;
    totalCovered: number;
    isTracking: boolean;
  }>({
    totalPlayed: 0,
    totalCovered: 0,
    isTracking: false,
  });

  const isDirectVideoUrl = (url: string): boolean => {
    return (
      url.includes(".mp4") ||
      url.includes(".webm") ||
      url.includes(".ogg") ||
      url.includes(".mov")
    );
  };

  // VdoCipher time tracking functions
  const initializeVdoCipherTimeTracking = useCallback(
    (iframe: HTMLIFrameElement) => {
      if (!iframe || !(window as any).VdoPlayer) {
        return null;
      }

      try {
        const player = new (window as any).VdoPlayer(iframe);

        // Store player instance on iframe for global access (fullscreen control)
        (iframe as any).vdocipherPlayer = player;

        // Start time tracking
        setVideoTimeTracking((prev) => ({ ...prev, isTracking: true }));

        // Set up interval to track time every second
        const timeTrackingInterval = setInterval(() => {
          if (player.api) {
            player.api
              .getTotalPlayed()
              .then((tp: number) => {
                setVideoTimeTracking((prev) => ({ ...prev, totalPlayed: tp }));
              })
              .catch((error: any) => {
                console.error("VdoCipher: Error getting total played time:", error);
              });

            player.api
              .getTotalCovered()
              .then((tc: number) => {
                setVideoTimeTracking((prev) => ({ ...prev, totalCovered: tc }));
              })
              .catch((error: any) => {
                console.error("VdoCipher: Error getting total covered time:", error);
              });
          }
        }, 1000);

        // Return cleanup function
        return () => {
          clearInterval(timeTrackingInterval);
          setVideoTimeTracking((prev) => ({ ...prev, isTracking: false }));
          // Clean up player reference
          delete (iframe as any).vdocipherPlayer;
        };
      } catch (error) {
        console.error("VdoCipher: Error initializing player:", error);
        return null;
      }
    },
    []
  );

  // Store video time in localStorage for App.tsx to access
  useEffect(() => {
    if (videoTimeTracking.isTracking && videoId) {
      const videoTrackingData = {
        videoId: videoId,
        totalPlayed: videoTimeTracking.totalPlayed,
        timestamp: Date.now(),
      };
      localStorage.setItem(
        "currentVideoTracking",
        JSON.stringify(videoTrackingData)
      );
    }
  }, [videoTimeTracking.totalPlayed, videoTimeTracking.isTracking, videoId]);

  // Load VdoCipher API script
  useEffect(() => {
    if (!document.querySelector('script[src*="api.js"]')) {
      const script = document.createElement("script");
      script.src = "https://player.vdocipher.com/v2/api.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Cleanup VdoCipher time tracking when video changes
  useEffect(() => {
    return () => {
      // Cleanup time tracking when component unmounts or video changes
      if ((window as any).cleanupVdoCipherTracking) {
        (window as any).cleanupVdoCipherTracking();
        delete (window as any).cleanupVdoCipherTracking;
      }

      // Clean up any stored player references on iframes
      const iframes = document.querySelectorAll(
        'iframe[src*="player.vdocipher.com"]'
      );
      iframes.forEach((iframe) => {
        if ((iframe as any).vdocipherPlayer) {
          delete (iframe as any).vdocipherPlayer;
        }
      });

      setVideoTimeTracking({
        totalPlayed: 0,
        totalCovered: 0,
        isTracking: false,
      });
    };
  }, [videoId]);

  // Show loader while loading
  if (loading) {
    return (
      <LoaderComponent />
    );
  }

  // Build video URL
  let finalVideoUrl = "";
  if (videoUrl) {
    finalVideoUrl = videoUrl;
  } else if (videoData) {
    finalVideoUrl = `https://player.vdocipher.com/v2/?otp=${videoData.otp}&playbackInfo=${videoData.playback_info}`;
  }

  // Show error message only if not loading and no video data/URL
  if (!finalVideoUrl) {
    return (
      <div className="d-flex justify-content-center align-items-center h-100">
        <div className="text-center">
          <p className="text-muted">Video not available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-100 overflow-hidden p-0"
      style={{ backgroundColor: "transparent", height: "100%" }}
    >
      {isDirectVideoUrl(finalVideoUrl) ? (
        <video
          className="w-100 h-100"
          controls
          autoPlay={false}
          muted={false}
          preload="metadata"
          onLoadedData={onVideoLoad}
          style={{
            boxShadow: "0px 2px 8px rgba(0,0,0,0.1)",
            borderRadius: "0px",
            objectFit: "cover",
            backgroundColor: "transparent",
          }}
        >
          <source src={finalVideoUrl} type="video/mp4" />
          <source src={finalVideoUrl} type="video/webm" />
          <source src={finalVideoUrl} type="video/ogg" />
          Your browser does not support the video tag.
        </video>
      ) : (
        <iframe
          ref={(iframe) => {
            if (iframe && videoTimeTracking.isTracking === false) {
              // Initialize time tracking when iframe loads
              setTimeout(() => {
                const cleanup = initializeVdoCipherTimeTracking(iframe);
                if (cleanup) {
                  // Store cleanup function for this video
                  (window as any).cleanupVdoCipherTracking = cleanup;
                  if (onVideoLoad) {
                    onVideoLoad();
                  }
                }
              }, 2000); // Wait 2 seconds for iframe to fully load
            }
          }}
          className="w-100 h-100"
          src={finalVideoUrl}
          title="Video Player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          style={{
            boxShadow: "0px 2px 8px rgba(0,0,0,0.1)",
            borderRadius: "0px",
            backgroundColor: "transparent",
          }}
        />
      )}
    </div>
  );
};

export default VideoContent;

