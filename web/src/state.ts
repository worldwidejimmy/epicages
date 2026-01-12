import { create } from "zustand";
import type { World, GameEventShort, ServerToClient, ClientToServer } from "../../shared/types";

export type UserAction = {
  id: string;
  timestamp: number;
  actionType: 'harvest' | 'build' | 'research' | 'craft' | 'migrate';
  actionDetails: string;
  status: 'pending' | 'success' | 'error';
  message: string;
};

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
  selectedObject: { type: "settlement"; id: string } | { type: "structure"; settlementId: string; structureIndex: number } | null;
  setSelectedObject: (obj: Store["selectedObject"]) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  userActions: UserAction[];
  addUserAction: (action: Omit<UserAction, 'id' | 'timestamp'>) => string;
  updateUserAction: (id: string, updates: Partial<UserAction>) => void;
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
        console.log("[WebSocket] Received snapshot, world version:", msg.world?.version);
        console.log("[WebSocket] World object keys:", msg.world ? Object.keys(msg.world) : "no world");
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
        if (msg.world) {
          console.log("[WebSocket] Received events update, world version:", msg.world?.version);
        }
        const payloadEvent = msg.events[msg.events.length - 1] ?? null;
        set(state => {
          const nextEvents = [...state.events, ...msg.events].slice(-200);
          const tick = msg.world?.tick ?? state.lastTick ?? state.world?.tick;
          
          // Check if any events indicate successful user actions
          const newActions = [...state.userActions];
          for (const event of msg.events) {
            const text = event.text.toLowerCase();
            // Match events to pending actions
            for (let i = newActions.length - 1; i >= 0; i--) {
              const action = newActions[i];
              if (action.status === 'pending') {
                // Check if this event matches the action
                let matched = false;
                if (action.actionType === 'harvest' && text.includes('gathered')) {
                  matched = true;
                } else if (action.actionType === 'build' && text.includes('built')) {
                  matched = true;
                } else if (action.actionType === 'research' && text.includes('discovered')) {
                  matched = true;
                } else if (action.actionType === 'migrate' && text.includes('moved')) {
                  matched = true;
                } else if (action.actionType === 'craft' && (text.includes('crafted') || text.includes('created'))) {
                  matched = true;
                }
                
                if (matched) {
                  newActions[i] = { ...action, status: 'success', message: event.text };
                  break; // Only match one action per event
                }
              }
            }
          }
          
          return {
            world: msg.world ?? state.world,
            events: nextEvents,
            status: `events @ tick ${tick ?? "?"}`,
            lastTick: tick,
            lastEvent: payloadEvent ?? state.lastEvent,
            lastUpdate: now,
            userActions: newActions
          };
        });
      } else if (msg.type === "error") {
        set({ status: `error: ${msg.message}`, lastUpdate: now });
        // Update the most recent pending action to error
        set(state => {
          const actions = [...state.userActions];
          // Find most recent pending action
          for (let i = actions.length - 1; i >= 0; i--) {
            if (actions[i].status === 'pending') {
              actions[i] = { ...actions[i], status: 'error', message: msg.message };
              break;
            }
          }
          return { userActions: actions };
        });
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
    lastEvent: null,
    selectedObject: null,
    setSelectedObject: (obj) => set({ selectedObject: obj }),
    speed: 1.0,
    setSpeed: (speed: number) => {
      set({ speed });
      // Send speed change to server
      sender?.({ type: "setSpeed", speed } as any);
    },
    userActions: [],
    addUserAction: (action) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newAction: UserAction = {
        ...action,
        id,
        timestamp: Date.now(),
      };
      set(state => ({
        userActions: [...state.userActions, newAction].slice(-15) // Keep last 15
      }));
      return id;
    },
    updateUserAction: (id, updates) => {
      set(state => ({
        userActions: state.userActions.map(a => a.id === id ? { ...a, ...updates } : a)
      }));
    }
  };
});
