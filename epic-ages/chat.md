# Epic Ages – Design Chat Summary
(Abbreviated) This summarizes goals and architecture so an LLM can get context fast.

- Server: authoritative sim (tick loop), proposals (`harvest`, `build`, `research`, `migrate`, `diplomacy`), tech tree, era transitions, neighbor AI, diplomacy events.
- LLM planner: OpenAI-compatible with tool calling + naive fallback.
- Client: React + PixiJS, era tile atlas, HUD, intent box, neighbors panel, touch pan/zoom.
- Assets: favicon (caveman face), logo splash.
