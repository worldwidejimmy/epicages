import { useState } from "react";
import { useGameStore } from "./state";
import GameCanvas from "./components/GameCanvas";

function ZoomButtons(){
  const world = useGameStore(s=> s.world);
  const zoom = (dir:number)=> window.dispatchEvent(new CustomEvent("epicages:zoom", { detail: dir }));
  if(!world) return null;
  return (
    <div style={{display:"flex", gap:6, marginTop:6}}>
      <button className="btn" onClick={()=> zoom(1)}>＋</button>
      <button className="btn" onClick={()=> zoom(-1)}>－</button>
    </div>
  );
}

function IntentBox(){
  const [text, setText] = useState("");
  const send = useGameStore(s=> s.send);
  const submit = ()=>{
    if(!text.trim()) return;
    send({ type:"proposal", proposal: { playerId:"local", action: undefined as any, args:{}, intentText: text }});
    setText("");
  };
  return (
    <div style={{display:"flex", gap:6, marginBottom:8}}>
      <input
        value={text}
        onChange={e=> setText(e.target.value)}
        placeholder="Type an intent (e.g., 'build a fence', 'research pottery')"
        style={{flex:1, padding:"6px 8px", borderRadius:6, border:"1px solid #5b6374", background:"#0f1522", color:"#e6e9ef"}}
      />
      <button className="btn" onClick={submit}>Plan</button>
    </div>
  );
}

function Neighbors(){
  const world = useGameStore(s=> s.world);
  const send = useGameStore(s=> s.send);
  if(!world) return null;
  const neighbors = world.neighbors || [];
  const gift = (name:string)=> send({ type:"proposal", proposal:{ playerId:"local", action:"diplomacy", args:{ kind:"gift", target:name, resource:"wood", amount:10 } } as any });
  const peace = (name:string)=> send({ type:"proposal", proposal:{ playerId:"local", action:"diplomacy", args:{ kind:"peace", target:name } } as any });
  const war = (name:string)=> send({ type:"proposal", proposal:{ playerId:"local", action:"diplomacy", args:{ kind:"war", target:name } } as any });
  const trade = (name:string)=> send({ type:"proposal", proposal:{ playerId:"local", action:"diplomacy", args:{ kind:"trade", target:name, resource:"wood", want:"stone", amount:10 } } as any });
  return (
    <div>
      {neighbors.map((n:any)=>(
        <div key={n.id} style={{border:"1px solid #5b6374", borderRadius:6, padding:8, marginBottom:8}}>
          <div style={{display:"flex", justifyContent:"space-between"}}>
            <strong>{n.name}</strong>
            <span>status: {n.status} | attitude: {n.attitude}</span>
          </div>
          <div style={{marginTop:6, display:"flex", gap:6, flexWrap:"wrap"}}>
            <button className="btn" onClick={()=> gift(n.name)}>Gift wood</button>
            <button className="btn" onClick={()=> trade(n.name)}>Trade wood→stone</button>
            <button className="btn" onClick={()=> peace(n.name)}>Make peace</button>
            <button className="btn" onClick={()=> war(n.name)}>Declare war</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function EraBadge(){
  const world = useGameStore(s=> s.world);
  const era = world?.era || "stone";
  return <div style={{marginBottom:8, fontWeight:600}}>Era: {era.toUpperCase()}</div>;
}

export default function App(){
  const { world, events } = useGameStore();
  return (
    <div className="app">
      <div className="hud">
        <EraBadge />
        <ZoomButtons />
        <IntentBox />
        <div className="buttons">
          <button className="btn" onClick={()=> useGameStore.getState().send({ type:"proposal", proposal:{ playerId:"local", action:"harvest", args:{ resource:"berries", amount:6 } } as any })}>Harvest</button>
          <button className="btn" onClick={()=> useGameStore.getState().send({ type:"proposal", proposal:{ playerId:"local", action:"build", args:{ structure:"hut" } } as any })}>Build Hut</button>
          <button className="btn" onClick={()=> useGameStore.getState().send({ type:"proposal", proposal:{ playerId:"local", action:"research", args:{ tech:"pottery" } } as any })}>Research Pottery</button>
          <button className="btn" onClick={()=> useGameStore.getState().send({ type:"proposal", proposal:{ playerId:"local", action:"migrate", args:{} } as any })}>Found new camp</button>
        </div>
      </div>

      <div className="panel">
        <h3>Neighbors</h3>
        <Neighbors />
        <h3>Events</h3>
        <ul>
          {events.slice().reverse().map((e, i)=>(<li key={i}>[t{e.tick}] {e.text}</li>))}
        </ul>
      </div>

      <GameCanvas />
    </div>
  );
}
