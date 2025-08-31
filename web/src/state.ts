import { create } from "zustand";
import type { World, GameEventShort, ServerToClient, ClientToServer } from "../../shared/types";

type Store = {
  world: World | null;
  events: GameEventShort[];
  send: (msg: ClientToServer)=> void;
  zoom: number;
  setZoom: (zoom: number) => void;
  ws: WebSocket | null;
  connect: () => void;
};

let socket: WebSocket | null = null;
function connect(sendSetter: (fn:(msg: ClientToServer)=>void)=>void, setSocket: (ws: WebSocket | null) => void){
  const url = "ws://localhost:8787"; // import.meta.env.VITE_SERVER_WS || 
  socket = new WebSocket(url);
  setSocket(socket);
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
  let ws: WebSocket | null = null;
  
  const connectFn = () => {
    connect((fn)=> sender = fn, (socket) => {
      ws = socket;
      set({ ws: socket });
    });
  };
  
  // Auto-connect
  connectFn();
  
  return {
    world: null,
    events: [],
    send: (m)=> sender?.(m),
    zoom: 1.0,
    setZoom: (zoom: number) => {
      set({ zoom });
      // Dispatch custom event for canvas
      window.dispatchEvent(new CustomEvent('epicages:zoom', { detail: { zoom } }));
    },
    ws,
    connect: connectFn
  };
});
