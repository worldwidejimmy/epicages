import { useEffect, useState } from "react";
import { useGameStore } from "../state";

type Phase = "loading" | "intro" | "done";

export default function SplashScreen() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [fadeOut, setFadeOut] = useState(false);
  const world = useGameStore((state) => state.world);
  const status = useGameStore((state) => state.status);
  const version = (window as any).EPIC_AGES_VERSION || "unknown";

  // Transition from loading → intro once the world arrives
  useEffect(() => {
    const isReady = world && (
      status.includes("snapshot") ||
      status.includes("tick") ||
      status.includes("@")
    );
    if (isReady && phase === "loading") {
      setPhase("intro");
    }
  }, [world, status, phase]);

  const handlePlay = () => {
    setFadeOut(true);
    setTimeout(() => setPhase("done"), 500);
  };

  if (phase === "done") return null;

  return (
    <div className={`splash-screen ${fadeOut ? "fade-out" : ""}`}>
      {phase === "loading" ? (
        <div className="splash-content">
          <div className="splash-logo">
            <h1 className="splash-title">Epic Ages</h1>
            <div className="splash-subtitle">A Civilization Building Game</div>
          </div>
          <div className="splash-loading">
            <div className="loading-spinner"></div>
            <div className="loading-text">Connecting to game world…</div>
          </div>
        </div>
      ) : (
        <div className="intro-content">
          <h1 className="splash-title">Epic Ages</h1>
          <p className="intro-subtitle">Guide your civilization from the Stone Age to the Bronze Age</p>

          <div className="intro-cards">
            <div className="intro-card">
              <div className="intro-card-icon">🏕️</div>
              <h3>Build &amp; Grow</h3>
              <p>Gather resources, construct huts and farms, and grow your population. Each building unlocks new possibilities.</p>
            </div>
            <div className="intro-card">
              <div className="intro-card-icon">🔬</div>
              <h3>Research Tech</h3>
              <p>Unlock Pottery, Agriculture, Smelting, and Bronze to advance through the ages and open new buildings.</p>
            </div>
            <div className="intro-card">
              <div className="intro-card-icon">🗺️</div>
              <h3>Explore the Map</h3>
              <p>Pan and zoom the world map. Use the minimap (bottom-right) to navigate. Right-click settlements for quick actions.</p>
            </div>
          </div>

          <div className="intro-ai-section">
            <div className="intro-ai-icon">🤖</div>
            <div>
              <h3>AI-Powered Gameplay</h3>
              <p>
                Type natural language commands like <em>"build 3 huts"</em> or <em>"research pottery"</em> — an AI planner
                translates your intent into game actions. Neighboring civilizations are driven by AI that researches, builds,
                and expands on their own. Want to sit back and watch? Enable <strong>Bot Mode</strong> in the sidebar to let
                an AI agent play as your civilization.
              </p>
            </div>
          </div>

          <div className="intro-controls">
            <div className="intro-control-item"><kbd>Scroll</kbd> Zoom</div>
            <div className="intro-control-item"><kbd>Drag</kbd> Pan map</div>
            <div className="intro-control-item"><kbd>Right-click</kbd> Actions</div>
            <div className="intro-control-item"><kbd>Enter</kbd> Send command</div>
          </div>

          <button className="btn btn-play" onClick={handlePlay}>
            Play Now →
          </button>
          <div className="intro-version">v{version}</div>
        </div>
      )}
    </div>
  );
}
