import { create } from "zustand";
import type { World, GameEventShort, ServerToClient, ClientToServer } from "../../shared/types";

type Store = {
  world: World | null;
  events: GameEventShort[];
  send: (msg: ClientToServer)=> void;
};

let socket: WebSocket | null = null;
function connect(sendSetter: (fn:(msg: ClientToServer)=>void)=>void){
  const url = import.meta.env.VITE_SERVER_WS || "ws://localhost:8787";
  socket = new WebSocket(url);
  socket.onopen = ()=> socket?.send(JSON.stringify({ type:"hello" }));
  socket.onmessage = (ev)=>{
    const msg = JSON.parse(ev.data) as ServerToClient;
    if (msg.type === "snapshot") {
      useGameStore.setState({ world: msg.world, events: msg.events });
    } else if (msg.type === "events") {
      useGameStore.setState(state=> ({
        world: msg.world || state.world,
        events: [...state.events, ...msg.events].slice(-200)
      }));
    } else if (msg.type === "error") {
      console.warn("Server error:", msg.message);
    }
  };
  sendSetter((m)=> socket?.send(JSON.stringify(m)));
}

export const useGameStore = create<Store>((set, get)=>{
  let sender: ((msg: ClientToServer)=>void) | null = null;
  connect((fn)=> sender = fn);
  return {
    world: null,
    events: [],
    send: (m)=> sender?.(m)
  };
});
