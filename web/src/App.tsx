import React, { useEffect, useState } from "react";
import { useGameStore } from "./state";
import GameCanvas from "./components/GameCanvas";
import SplashScreen from "./components/SplashScreen";
import ActionMessages from "./components/ActionMessages";
import { validateAction, getAllTechs, canResearchTech, getAllStructures, canBuildStructure, getStructureCost } from "./validation";
import { useActionFeedback } from "./hooks/useActionFeedback";

const readyStateLabels = [
  "connecting",
  "open",
  "closing",
  "closed",
];

function DiagnosticsPanel(){
  const { status, ws, world, events, lastTick, lastUpdate, lastEvent } = useGameStore(state => ({
    status: state.status,
    ws: state.ws,
    world: state.world,
    events: state.events,
    lastTick: state.lastTick,
    lastUpdate: state.lastUpdate,
    lastEvent: state.lastEvent,
  }));

  // Get build time from window (injected at build time)
  const buildTimeISO = (window as any).EPIC_AGES_BUILD_TIME || new Date().toISOString();
  const buildDate = new Date(buildTimeISO);
  const buildDateStr = buildDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const buildTimeStr = buildDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Debug logging for version
  useEffect(() => {
    if (world) {
      console.log("[Diagnostics] World object:", world);
      console.log("[Diagnostics] World version:", world.version);
      console.log("[Diagnostics] World keys:", Object.keys(world));
    }
  }, [world]);

  const readyStateLabel = ws ? readyStateLabels[ws.readyState] ?? `state ${ws.readyState}` : "idle";
  const recentEvents = events.slice(-4).reverse();
  const lastUpdateLabel = lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : "waiting...";

  return (
    <section className="diagnostics-section" aria-live="polite">
      <h3 title="Server connection and tick status">Live diagnostics</h3>
      <div className="diag-grid">
        <div>
          <p>Version</p>
          <strong title="Server version code for deployment verification">{world?.version || "unknown"}</strong>
        </div>
        <div>
          <p>Connection</p>
          <strong>{readyStateLabel}</strong>
        </div>
        <div>
          <p>Status</p>
          <strong>{status}</strong>
        </div>
        <div>
          <p>Server tick</p>
          <strong>{lastTick ?? "n/a"}</strong>
        </div>
        <div>
          <p>Settlements</p>
          <strong>{world?.settlements?.length ?? 0}</strong>
        </div>
        <div>
          <p>Neighbors</p>
          <strong>{world?.neighbors?.length ?? 0}</strong>
        </div>
        <div>
          <p>Last update</p>
          <strong>{lastUpdateLabel}</strong>
        </div>
        <div>
          <p>Build date</p>
          <strong title="Client build date">{buildDateStr}</strong>
        </div>
        <div>
          <p>Build time</p>
          <strong title="Client build time">{buildTimeStr}</strong>
        </div>
      </div>
      <div className="last-event">
        <p>Last event</p>
        <strong>
          {lastEvent ? `Tick ${lastEvent.tick}: ${lastEvent.text}` : "Waiting for events"}
        </strong>
      </div>
      <div className="recent-events">
        <h4>Recent server events</h4>
        {recentEvents.length ? (
          <ul>
            {recentEvents.map((event, idx) => (
              <li key={`${event.tick}-${idx}`}>
                <span>Tick {event.tick}:</span> {event.text}
              </li>
            ))}
          </ul>
        ) : (
          <p>No events received yet.</p>
        )}
      </div>
    </section>
  );
}

function Zoom(){
  return (
    <div>
      <label htmlFor="zoomRange" title="Adjust the zoom level of the game world view">Zoom:</label>
      <input 
        type="range" 
        id="zoomRange"
        min="0.3" 
        max="3" 
        step="0.1" 
        value={useGameStore(s => s.zoom)} 
        onChange={e => useGameStore.getState().setZoom(parseFloat(e.target.value))}
        title="Slide to zoom in/out on the game world"
      />
      <span title="Current zoom level">{useGameStore(s => s.zoom).toFixed(1)}x</span>
    </div>
  );
}

function SpeedControl(){
  const speed = useGameStore(s => s.speed);
  const setSpeed = useGameStore(s => s.setSpeed);
  
  return (
    <div>
      <label htmlFor="speedRange" title="Adjust the simulation speed">Speed:</label>
      <input 
        type="range" 
        id="speedRange"
        min="1" 
        max="10" 
        step="1" 
        value={speed} 
        onChange={e => setSpeed(parseInt(e.target.value))}
        title="Slide to adjust simulation speed (1x to 10x)"
      />
      <span title="Current simulation speed">{speed}x</span>
    </div>
  );
}

function QuickActions() {
  const { executeAction } = useActionFeedback();
  const world = useGameStore(s => s.world);
  const settlement = world?.settlements?.[0];
  
  return (
    <div className="actions">
      <h3 title="Quick actions you can take">Quick Actions</h3>
      <div className="buttons">
        <button 
          className="btn" 
          onClick={() => executeAction(
            { playerId: "local", action: "harvest", args: { resource: "berries", amount: 6, settlementId: settlement?.id } },
            "Harvest berries"
          )} 
          title="Gather 6 berries from the wilderness. Free action that provides food."
        >
          Harvest
        </button>
        <button 
          className="btn" 
          onClick={() => executeAction(
            { playerId: "local", action: "build", args: { structure: "hut", settlementId: settlement?.id } },
            "Build hut"
          )} 
          title="Build a hut for your people. Costs 15 wood. Increases housing capacity."
        >
          Build Hut
        </button>
        <button 
          className="btn" 
          onClick={() => executeAction(
            { playerId: "local", action: "research", args: { tech: "pottery" } },
            "Research pottery"
          )} 
          title="Research pottery technology. Unlocks agriculture and advanced cooking. May require resources."
        >
          Research Pottery
        </button>
        <button 
          className="btn" 
          onClick={() => executeAction(
            { playerId: "local", action: "migrate", args: {} },
            "Explore"
          )} 
          title="Send explorers to discover new lands and resources. Expands your territory."
        >
          Explore
        </button>
      </div>
    </div>
  );
}

function CommandInput(){
  const [text, setText] = useState("");
  
  const submit = () => {
    if(text.trim()) {
      useGameStore.getState().send({ 
        type: "proposal", 
        proposal: { 
          playerId: "local", 
          action: "build", // Using "build" as default since "llm" isn't in the action union
          args: { command: text },
          intentText: text
        } 
      });
      setText("");
    }
  };

  return (
    <div className="command-section">
      <label htmlFor="commandInput" title="Enter natural language commands to control your civilization">Command:</label>
      <input 
        id="commandInput"
        value={text} 
        onChange={e => setText(e.target.value)}
        placeholder="e.g., 'build 5 huts' or 'research pottery'"
        onKeyPress={e => e.key === "Enter" && submit()}
        title="Type natural language commands like 'gather berries', 'build huts', 'research pottery', etc."
      />
      <button className="btn" onClick={submit} title="Execute your natural language command">Plan</button>
    </div>
  );
}

function Neighbors(){
  const world = useGameStore(s => s.world);
  const neighbors = world?.neighbors || [];
  
  return (
    <div className="neighbors-section">
      <h3 title="Other civilizations in your world">Neighbors</h3>
      {neighbors.length > 0 ? (
        neighbors.map(neighbor => (
          <div key={neighbor.id} className="neighbor" title={`Civilization: ${neighbor.name || neighbor.id}`}>
            <strong>{neighbor.name || neighbor.id}</strong>
            <div className="neighbor-info" title="Basic information about this civilization">
              Population: <span title="Total number of people">{neighbor.pop}</span> | 
              Status: <span title="Diplomatic relationship">{neighbor.status}</span>
            </div>
          </div>
        ))
      ) : (
        <div title="No other civilizations discovered yet">No neighbors discovered</div>
      )}
    </div>
  );
}

function ResourceDisplay() {
  const world = useGameStore(s => s.world);
  const localSettlement = world?.settlements?.find(s => s.id === "local") || world?.settlements?.[0];

  // Calculate housing capacity
  const getHousingCapacity = (s: typeof localSettlement): number => {
    if (!s) return 0;
    let capacity = 0;
    s.structures?.forEach(struct => {
      if (struct === "campfire") capacity += 5;
      else if (struct === "hut") capacity += 10;
    });
    return capacity;
  };

  const housingCapacity = getHousingCapacity(localSettlement);
  const currentPop = localSettlement?.pop || 0;
  const housingStatus = currentPop >= housingCapacity ? "full" : "available";

  return (
    <div className="resources">
      <h3 title="Your civilization's current resources">Resources</h3>
      <div className="resource-grid">
        <div className="resource-item" title="Food sustains your population and enables growth">
          <strong>Food:</strong> <span>
            {(localSettlement?.storage?.berries || 0) + (localSettlement?.storage?.fish || 0)}
          </span>
          <small>Berries: {localSettlement?.storage?.berries || 0}, Fish: {localSettlement?.storage?.fish || 0}</small>
        </div>
        <div className="resource-item" title="Wood is used for construction and tools">
          <strong>Wood:</strong> <span>{localSettlement?.storage?.wood || 0}</span>
          <small>Primary building material, gathered from forests</small>
        </div>
        <div className="resource-item" title="Stone provides durable construction materials">
          <strong>Stone:</strong> <span>{localSettlement?.storage?.stone || 0}</span>
          <small>Sturdy material for advanced buildings and monuments</small>
        </div>
        <div className="resource-item" title="Total population size determines workforce capacity">
          <strong>Population:</strong> <span>{currentPop}</span>
          <small>Your people - more population means greater productivity</small>
        </div>
        <div className="resource-item" title="Housing capacity limits population growth">
          <strong>Housing:</strong> <span className={housingStatus === "full" ? "housing-full" : ""}>
            {currentPop}/{housingCapacity}
          </span>
          <small>{housingStatus === "full" ? "At capacity - build more huts to grow" : "Population can grow"}</small>
        </div>
        <div className="resource-item" title="Structures built in this settlement">
          <strong>Structures:</strong> <span>{localSettlement?.structures?.length || 0}</span>
          <small>Buildings constructed in your settlement</small>
        </div>
      </div>
    </div>
  );
}

function EraBadge() {
  const world = useGameStore(s => s.world);
  
  return (
    <div className="era-badge" title="Your civilization's current technological era">
      <h2>Era: {world?.era || "Stone Age"}</h2>
      <small>Research new technologies to advance through the ages</small>
    </div>
  );
}

function TechTree() {
  const world = useGameStore(s => s.world);
  const { executeAction } = useActionFeedback();
  
  if (!world) return null;
  
  const researchedTechs = Object.entries(world.tech || {}).filter(([_, researched]) => researched).map(([tech]) => tech);
  const allTechs = getAllTechs();
  const unresearchedTechs = allTechs.filter(tech => !world.tech[tech as any]);
  
  const handleTechClick = (tech: string) => {
    const validation = canResearchTech(world, tech);
    executeAction(
      { playerId: "local", action: "research", args: { tech } },
      `Research ${tech}`
    );
  };
  
  return (
    <div className="tech-section">
      <h3 title="Technologies your civilization has discovered">Technologies</h3>
      {researchedTechs.length > 0 && (
        <div>
          <div style={{ fontSize: "11px", color: "#8b95a7", marginBottom: "4px" }}>Researched:</div>
          <ul className="tech-list">
            {researchedTechs.map(tech => (
              <li key={tech} className="tech-item tech-item-researched" title={`You have mastered ${tech} technology`}>
                {tech}
              </li>
            ))}
          </ul>
        </div>
      )}
      {unresearchedTechs.length > 0 && (
        <div style={{ marginTop: researchedTechs.length > 0 ? "12px" : "0" }}>
          <div style={{ fontSize: "11px", color: "#8b95a7", marginBottom: "4px" }}>Available:</div>
          <ul className="tech-list">
            {unresearchedTechs.map(tech => {
              const validation = canResearchTech(world, tech);
              const canResearch = validation.ok;
              return (
                <li 
                  key={tech} 
                  className={`tech-item ${canResearch ? 'tech-item-clickable' : 'tech-item-unavailable'}`}
                  onClick={() => canResearch && handleTechClick(tech)}
                  title={canResearch ? `Click to research ${tech}` : `Cannot research: ${validation.ok ? '' : (validation as any).reason}`}
                  style={{ cursor: canResearch ? 'pointer' : 'not-allowed', opacity: canResearch ? 1 : 0.5 }}
                >
                  {tech}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {researchedTechs.length === 0 && unresearchedTechs.length === 0 && (
        <div title="No technologies available">
          No technologies available
        </div>
      )}
    </div>
  );
}

function Structures() {
  const world = useGameStore(s => s.world);
  const { executeAction } = useActionFeedback();
  const settlement = world?.settlements?.[0];
  
  if (!world || !settlement) return null;
  
  const builtStructures = settlement.structures || [];
  const allStructures = getAllStructures();
  const availableStructures = allStructures.filter(struct => !builtStructures.includes(struct));
  
  const handleStructureClick = (structure: string) => {
    executeAction(
      { playerId: "local", action: "build", args: { structure, settlementId: settlement.id } },
      `Build ${structure}`
    );
  };
  
  const formatCost = (cost: Record<string, number>) => {
    return Object.entries(cost).map(([res, amt]) => `${amt} ${res}`).join(", ");
  };
  
  return (
    <div className="structures-section">
      <h3 title="Buildings and structures your civilization has constructed">Structures</h3>
      {builtStructures.length > 0 && (
        <div>
          <div style={{ fontSize: "11px", color: "#8b95a7", marginBottom: "4px" }}>Built:</div>
          <ul className="structure-list">
            {builtStructures.map((structure, idx) => (
              <li key={idx} className="structure-item structure-item-built" title={`${structure} - A building of your civilization`}>
                {structure}
              </li>
            ))}
          </ul>
        </div>
      )}
      {availableStructures.length > 0 && (
        <div style={{ marginTop: builtStructures.length > 0 ? "12px" : "0" }}>
          <div style={{ fontSize: "11px", color: "#8b95a7", marginBottom: "4px" }}>Available:</div>
          <ul className="structure-list">
            {availableStructures.map(structure => {
              const validation = canBuildStructure(world, structure);
              const canBuild = validation.ok;
              const cost = getStructureCost(structure);
              return (
                <li 
                  key={structure} 
                  className={`structure-item ${canBuild ? 'structure-item-clickable' : 'structure-item-unavailable'}`}
                  onClick={() => canBuild && handleStructureClick(structure)}
                  title={canBuild ? `Click to build ${structure} (${formatCost(cost)})` : `Cannot build: ${validation.ok ? '' : (validation as any).reason}`}
                  style={{ cursor: canBuild ? 'pointer' : 'not-allowed', opacity: canBuild ? 1 : 0.5 }}
                >
                  {structure} ({formatCost(cost)})
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {builtStructures.length === 0 && availableStructures.length === 0 && (
        <div title="No structures available">
          No structures available
        </div>
      )}
    </div>
  );
}

export default function App() {
  useEffect(() => {
    // Connection is automatically established in the store
    // No need to manually connect here
  }, []);

  return (
    <>
      <SplashScreen />
      <div className="app">
        <div className="sidebar">
        <div className="game-header">
          <h1 title="Epic Ages - A Civilization Building Game">Epic Ages</h1>
          <EraBadge />
        </div>
        
        <ResourceDisplay />
        
        <QuickActions />

        <CommandInput />
        
        <ActionMessages />
        
        <TechTree />
        <Structures />
        <Neighbors />
        <DiagnosticsPanel />
        
        <div className="controls">
          <Zoom />
          <SpeedControl />
        </div>
      </div>
      
        <div className="game-area">
          <GameCanvas />
        </div>
      </div>
    </>
  );
}
