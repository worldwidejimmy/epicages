import React, { useEffect, useState } from "react";
import { useGameStore } from "./state";
import GameCanvas from "./components/GameCanvas";

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

  const readyStateLabel = ws ? readyStateLabels[ws.readyState] ?? `state ${ws.readyState}` : "idle";
  const recentEvents = events.slice(-4).reverse();
  const lastUpdateLabel = lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : "waiting...";

  return (
    <section className="diagnostics-section" aria-live="polite">
      <h3 title="Server connection and tick status">Live diagnostics</h3>
      <div className="diag-grid">
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
  
  return (
    <div className="neighbors-section">
      <h3 title="Other civilizations in your world">Neighbors</h3>
      {world?.neighbors?.map(neighbor => (
        <div key={neighbor.id} className="neighbor" title={`Civilization: ${neighbor.name || neighbor.id}`}>
          <strong>{neighbor.name || neighbor.id}</strong>
          <div className="neighbor-info" title="Basic information about this civilization">
            Population: <span title="Total number of people">{neighbor.pop}</span> | 
            Status: <span title="Diplomatic relationship">{neighbor.status}</span>
          </div>
        </div>
      )) || <div title="No other civilizations discovered yet">No neighbors discovered</div>}
    </div>
  );
}

function ResourceDisplay() {
  const world = useGameStore(s => s.world);
  const localSettlement = world?.settlements?.find(s => s.id === "local") || world?.settlements?.[0];

  return (
    <div className="resources">
      <h3 title="Your civilization's current resources">Resources</h3>
      <div className="resource-grid">
        <div className="resource-item" title="Food sustains your population and enables growth">
          <strong>Food:</strong> <span>{localSettlement?.storage?.berries || 0}</span>
          <small>Essential for population growth and preventing starvation</small>
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
          <strong>Population:</strong> <span>{localSettlement?.pop || 0}</span>
          <small>Your people - more population means greater productivity</small>
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
  
  return (
    <div className="tech-section">
      <h3 title="Technologies your civilization has discovered">Technologies</h3>
      {world?.tech && Object.keys(world.tech).length ? (
        <ul className="tech-list">
          {Object.entries(world.tech).filter(([_, researched]) => researched).map(([tech, _]) => (
            <li key={tech} className="tech-item" title={`You have mastered ${tech} technology`}>
              {tech}
            </li>
          ))}
        </ul>
      ) : (
        <div title="No technologies researched yet - use 'research' commands to advance">
          No technologies discovered yet
        </div>
      )}
    </div>
  );
}

function Structures() {
  const world = useGameStore(s => s.world);
  const localSettlement = world?.settlements?.find(s => s.id === "local") || world?.settlements?.[0];
  
  return (
    <div className="structures-section">
      <h3 title="Buildings and structures your civilization has constructed">Structures</h3>
      {localSettlement?.structures?.length ? (
        <ul className="structure-list">
          {localSettlement.structures.map((structure, idx) => (
            <li key={idx} className="structure-item" title={`${structure} - A building of your civilization`}>
              {structure}
            </li>
          ))}
        </ul>
      ) : (
        <div title="No structures built yet - use 'build' commands to construct buildings">
          No structures built yet
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
    <div className="app">
      <div className="sidebar">
        <div className="game-header">
          <h1 title="Epic Ages - A Civilization Building Game">Epic Ages</h1>
          <EraBadge />
        </div>
        
        <ResourceDisplay />
        
        <div className="actions">
          <h3 title="Quick actions you can take">Quick Actions</h3>
          <div className="buttons">
            <button className="btn" onClick={() => useGameStore.getState().send({ type: "proposal", proposal: { playerId: "local", action: "harvest", args: { resource: "berries", amount: 6 } } })} title="Gather 6 berries from the wilderness. Free action that provides food.">Harvest</button>
            <button className="btn" onClick={() => useGameStore.getState().send({ type: "proposal", proposal: { playerId: "local", action: "build", args: { structure: "hut" } } })} title="Build a hut for your people. Costs 15 wood. Increases housing capacity.">Build Hut</button>
            <button className="btn" onClick={() => useGameStore.getState().send({ type: "proposal", proposal: { playerId: "local", action: "research", args: { tech: "pottery" } } })} title="Research pottery technology. Unlocks agriculture and advanced cooking. May require resources.">Research Pottery</button>
            <button className="btn" onClick={() => useGameStore.getState().send({ type: "proposal", proposal: { playerId: "local", action: "migrate", args: {} } })} title="Send explorers to discover new lands and resources. Expands your territory.">Explore</button>
          </div>
        </div>

        <CommandInput />
        
        <TechTree />
        <Structures />
        <Neighbors />
        <DiagnosticsPanel />
        
        <div className="controls">
          <Zoom />
        </div>
      </div>
      
      <div className="game-area">
        <GameCanvas />
      </div>
    </div>
  );
}
