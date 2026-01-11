import { create } from "zustand";
import type { World, GameEventShort, ServerToClient, ClientToServer } from "../../shared/types";

type Store = {
  world: World | null;
  events: GameEventShort[];
  send: (msg: ClientToServer) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  ws: WebSocket | null;
  connect: () => void;
  status: string;
  lastTick?: number;
  lastUpdate?: number;
  lastEvent: GameEventShort | null;
};

export const useGameStore = create<Store>((set, get) => {
  let sender: ((msg: ClientToServer) => void) | null = null;
  let ws: WebSocket | null = null;
  let socket: WebSocket | null = null;

  const connectFn = () => {
    const updateStatus = (status: string) => {
      set({ status, lastUpdate: Date.now() });
    };
    updateStatus("connecting");
    const envUrl = import.meta.env.VITE_SERVER_WS;
    const url = envUrl ?? (() => {
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const match = window.location.pathname.match(/^\/[^/]+/);
      const basePath = match && match[0] && match[0] !== "/" ? match[0] : "";
      const suffix = basePath ? `${basePath}/` : "/";
      const wsUrl = `${protocol}://${window.location.host}${suffix}`;
      console.log("[Epic Ages] Connecting to WebSocket:", wsUrl);
      return wsUrl;
    })();
    console.log("[Epic Ages] WebSocket URL:", url);
    socket = new WebSocket(url);
    ws = socket;
    set({ ws: socket });

    socket.onopen = () => {
      console.log("[Epic Ages] WebSocket connected");
      updateStatus("connected");
      socket?.send(JSON.stringify({ type: "hello" }));
    };
    socket.onerror = (error) => {
      console.error("[Epic Ages] WebSocket error:", error);
      updateStatus("socket error");
    };
    socket.onclose = (event) => {
      console.log("[Epic Ages] WebSocket closed:", event.code, event.reason);
      updateStatus("disconnected");
    };
    socket.onmessage = (ev) => {
      const msg = JSON.parse(ev.data) as ServerToClient;
      const now = Date.now();
      if (msg.type === "snapshot") {
        const lastEvent = msg.events[msg.events.length - 1] ?? null;
        set({
          world: msg.world,
          events: msg.events,
          status: `snapshot @ tick ${msg.world.tick}`,
          lastTick: msg.world.tick,
          lastEvent,
          lastUpdate: now
        });
      } else if (msg.type === "events") {
        const payloadEvent = msg.events[msg.events.length - 1] ?? null;
        set(state => {
          const nextEvents = [...state.events, ...msg.events].slice(-200);
          const tick = msg.world?.tick ?? state.lastTick ?? state.world?.tick;
          return {
            world: msg.world ?? state.world,
            events: nextEvents,
            status: `events @ tick ${tick ?? "?"}`,
            lastTick: tick,
            lastEvent: payloadEvent ?? state.lastEvent,
            lastUpdate: now
          };
        });
      } else if (msg.type === "error") {
        set({ status: `error: ${msg.message}`, lastUpdate: now });
      }
    };
    sender = (m) => socket?.send(JSON.stringify(m));
  };

  // Auto-connect
  connectFn();

  return {
    world: null,
    events: [],
    send: (m) => sender?.(m),
    zoom: 1.0,
    setZoom: (zoom: number) => {
      set({ zoom });
      // Dispatch custom event for canvas
      window.dispatchEvent(new CustomEvent('epicages:zoom', { detail: { zoom } }));
    },
    ws,
    connect: connectFn,
    status: "idle",
    lastTick: undefined,
    lastUpdate: undefined,
    lastEvent: null
  };
});
