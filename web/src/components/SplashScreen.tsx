import { useEffect, useState } from "react";
import { useGameStore } from "../state";

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const world = useGameStore((state) => state.world);
  const status = useGameStore((state) => state.status);

  // Get version and build time from window (injected at build time)
  const version = (window as any).EPIC_AGES_VERSION || "unknown";
  const buildTimeISO = (window as any).EPIC_AGES_BUILD_TIME || new Date().toISOString();
  
  // Format build time
  const buildDate = new Date(buildTimeISO);
  const buildDateStr = buildDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const buildTimeStr = buildDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Hide splash when game is ready
  useEffect(() => {
    // Game is ready when we have world data and connection is established
    const isReady = world && (status.includes("connected") || status.includes("snapshot") || status.includes("tick"));
    
    if (isReady && isVisible) {
      // Start fade out
      setFadeOut(true);
      // Remove from DOM after animation
      setTimeout(() => {
        setIsVisible(false);
      }, 500); // Match CSS transition duration
    }
  }, [world, status, isVisible]);

  if (!isVisible) return null;

  return (
    <div className={`splash-screen ${fadeOut ? "fade-out" : ""}`}>
      <div className="splash-content">
        <div className="splash-logo">
          <h1 className="splash-title">Epic Ages</h1>
          <div className="splash-subtitle">A Civilization Building Game</div>
        </div>
        
        <div className="splash-info">
          <div className="splash-version">
            <span className="info-label">Version:</span>
            <span className="info-value">{version}</span>
          </div>
          <div className="splash-build">
            <span className="info-label">Build Date:</span>
            <span className="info-value">{buildDateStr}</span>
          </div>
          <div className="splash-time">
            <span className="info-label">Build Time:</span>
            <span className="info-value">{buildTimeStr}</span>
          </div>
        </div>

        <div className="splash-loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading game world...</div>
        </div>
      </div>
    </div>
  );
}
