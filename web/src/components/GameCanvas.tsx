import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { useGameStore } from "../state";
import type { Settlement, World } from "../../shared/types";
import ContextMenu from "./ContextMenu";

// Era-specific color themes
const ERA_THEMES: Record<string, { primary: number; secondary: number; accent: number; structure: number }> = {
  stone: { primary: 0xF9D65C, secondary: 0x8B4513, accent: 0xD4A574, structure: 0x654321 },
  copper: { primary: 0xCD7F32, secondary: 0x8B4513, accent: 0xE6A857, structure: 0x6B4423 },
  bronze: { primary: 0xB87333, secondary: 0x8B4513, accent: 0xD4A574, structure: 0x5C4033 },
  iron: { primary: 0x708090, secondary: 0x2F4F4F, accent: 0x9CA3AF, structure: 0x36454F },
  medieval: { primary: 0xC0C0C0, secondary: 0x696969, accent: 0xD3D3D3, structure: 0x4B4B4B }
};

async function loadAtlas(era: string){
  const url = `/assets/atlas_${era}.png`;
  try {
    const texture = await PIXI.Assets.load(url);
    const frames = [0,1,2,3].map(i=> new PIXI.Texture({ source: texture.source, frame: new PIXI.Rectangle(i*16, 0, 16, 16) }));
    return frames;
  } catch {
    return null;
  }
}

// Helper to draw a more detailed hut
function drawHut(g: PIXI.Graphics, x: number, y: number, size: number, era: string) {
  const theme = ERA_THEMES[era] || ERA_THEMES.stone;
  // Base
  g.rect(x - size/2, y - size/2, size, size);
  g.fill(theme.structure);
  g.stroke({ color: theme.secondary, width: 1 });
  // Roof (triangle)
  g.moveTo(x - size/2, y - size/2);
  g.lineTo(x, y - size/2 - size/3);
  g.lineTo(x + size/2, y - size/2);
  g.fill(theme.secondary);
  // Door
  g.rect(x - size/6, y + size/6, size/3, size/3);
  g.fill(0x2C1810);
}

// Helper to draw a farm field
function drawFarm(g: PIXI.Graphics, x: number, y: number, size: number) {
  // Field base
  g.rect(x - size/2, y - size/2, size, size);
  g.fill(0x8B7355); // Brown earth
  // Crop rows
  for (let i = 0; i < 3; i++) {
    g.rect(x - size/2 + 1, y - size/2 + 2 + i * 2, size - 2, 1);
    g.fill(0x228B22); // Green crops
  }
  g.stroke({ color: 0x654321, width: 1 });
}

// Helper to draw a forge
function drawForge(g: PIXI.Graphics, x: number, y: number, size: number, tick: number) {
  // Base structure
  g.rect(x - size/2, y - size/2, size, size);
  g.fill(0x36454F); // Dark gray
  g.stroke({ color: 0x2F4F4F, width: 1 });
  // Anvil/forge top
  g.rect(x - size/3, y - size/2 - 2, size * 2/3, 2);
  g.fill(0x708090);
  // Glow effect (animated)
  const glowIntensity = 0.3 + Math.sin(tick * 0.1) * 0.2;
  g.circle(x, y, size * 0.8);
  g.fill({ color: 0xFF4500, alpha: glowIntensity });
}

// Helper to draw bronze workshop
function drawBronzeWorkshop(g: PIXI.Graphics, x: number, y: number, size: number, tick: number) {
  // Larger structure
  g.rect(x - size/2, y - size/2, size, size * 1.2);
  g.fill(0x5C4033); // Bronze color
  g.stroke({ color: 0xB87333, width: 1 });
  // Roof
  g.moveTo(x - size/2, y - size/2);
  g.lineTo(x, y - size/2 - size/4);
  g.lineTo(x + size/2, y - size/2);
  g.fill(0x4B4B4B);
  // Glow from metalworking
  const glowIntensity = 0.2 + Math.sin(tick * 0.15) * 0.15;
  g.circle(x, y, size * 0.7);
  g.fill({ color: 0xFFD700, alpha: glowIntensity });
}

// Helper to draw charcoal kiln with smoke
function drawKiln(g: PIXI.Graphics, x: number, y: number, size: number, tick: number) {
  // Kiln base (circular)
  g.circle(x, y, size);
  g.fill(0x2C2C2C);
  g.stroke({ color: 0x1A1A1A, width: 1 });
  // Top opening
  g.circle(x, y - size/2, size/3);
  g.fill(0x1A1A1A);
  // Smoke particles (animated)
  for (let i = 0; i < 3; i++) {
    const offset = (tick * 0.05 + i * 0.5) % (Math.PI * 2);
    const smokeX = x + Math.sin(offset) * 2;
    const smokeY = y - size/2 - 3 - (tick * 0.1 + i) % 5;
    const alpha = 0.6 - (tick * 0.1 + i) % 5 * 0.1;
    g.circle(smokeX, smokeY, 1.5);
    g.fill({ color: 0x808080, alpha: Math.max(0.1, alpha) });
  }
}

// Helper to draw palissade (fence)
function drawPalissade(g: PIXI.Graphics, x: number, y: number, size: number) {
  // Vertical posts
  g.rect(x - 1, y - size/2, 2, size);
  g.fill(0x654321);
  // Horizontal crossbeam
  g.rect(x - size/2, y - size/4, size, 1);
  g.fill(0x5C4033);
  // Pointed top
  g.moveTo(x - 1, y - size/2);
  g.lineTo(x, y - size/2 - 2);
  g.lineTo(x + 1, y - size/2);
  g.fill(0x654321);
}

// Helper to draw a better person sprite
function drawPerson(g: PIXI.Graphics, x: number, y: number, activity: string, era: string) {
  const theme = ERA_THEMES[era] || ERA_THEMES.stone;
  // Head
  g.circle(x, y - 3, 2);
  g.fill(0xF5DEB3);
  g.stroke({ color: 0x8B4513, width: 0.5 });
  // Body
  g.rect(x - 1.5, y - 1, 3, 4);
  g.fill(theme.accent);
  g.stroke({ color: theme.secondary, width: 0.5 });
  // Activity indicator
  if (activity === "farming") {
    // Small tool in hand
    g.rect(x + 1.5, y, 1, 2);
    g.fill(0x8B4513);
  } else if (activity === "working") {
    // Hammer/tool
    g.rect(x + 1.5, y, 0.8, 1.5);
    g.fill(0x696969);
  }
}

const BIOME_COLORS_HEX = ['#4169E1', '#228B22', '#006400', '#696969'];

export default function GameCanvas(){
  const ref = useRef<HTMLDivElement | null>(null);
  const world = useGameStore(s=> s.world);
  const atlasRef = useRef<PIXI.Texture[] | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const containerRef = useRef<PIXI.Container | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);

  const scaleRef = useRef(1);
  const minScale = 0.5;
  const maxScale = 3;

  // Tooltip and context menu state
  const [hoveredSettlement, setHoveredSettlement] = useState<Settlement | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; settlement: Settlement } | null>(null);

  function handleWheel(e: WheelEvent){
    const container = containerRef.current;
    const app = appRef.current;
    if(!container || !app) return;
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const oldScale = scaleRef.current;
    const newScale = Math.min(maxScale, Math.max(minScale, oldScale + delta));
    const rect = (app.view as HTMLCanvasElement).getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const worldX = (mx - container.x) / oldScale;
    const worldY = (my - container.y) / oldScale;
    scaleRef.current = newScale;
    container.scale.set(newScale);
    container.position.set(mx - worldX * newScale, my - worldY * newScale);
  }

  // Simple hit test: check if mouse is over a settlement
  function getSettlementAtPoint(worldX: number, worldY: number): Settlement | null {
    const data = useGameStore.getState().world;
    if (!data) return null;
    const tileSize = 20;
    for (const s of data.settlements) {
      const centerX = s.pos.x * tileSize + 10;
      const centerY = s.pos.y * tileSize + 10;
      const baseSize = Math.min(8 + Math.floor(s.pop / 10), 12);
      const dist = Math.sqrt((worldX - centerX) ** 2 + (worldY - centerY) ** 2);
      if (dist <= baseSize + 5) { // 5px padding for easier clicking
        return s;
      }
    }
    return null;
  }

  function enableDragInteractions(){
    const container = containerRef.current;
    const app = appRef.current;
    if(!container || !app) return;
    let dragging = false;
    let mouseDown = false;
    let lastX = 0, lastY = 0;
    let dragStartX = 0, dragStartY = 0;
    const onDown = (e: PointerEvent)=>{
      mouseDown = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragging = false; // Start as false, only set to true if we actually drag
      lastX = e.clientX;
      lastY = e.clientY;
      (e.currentTarget as any).setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent)=>{
      const rect = (app.view as HTMLCanvasElement).getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const worldX = (mx - container.x) / scaleRef.current;
      const worldY = (my - container.y) / scaleRef.current;

      // Update tooltip position and check for hover (always)
      setTooltipPos({ x: e.clientX, y: e.clientY });
      const settlement = getSettlementAtPoint(worldX, worldY);
      setHoveredSettlement(settlement);

      // Only check for dragging if mouse button is down
      if (mouseDown) {
        // Check if we should start dragging
        if (!dragging) {
          const dragDistance = Math.sqrt((e.clientX - dragStartX) ** 2 + (e.clientY - dragStartY) ** 2);
          if (dragDistance > 5) {
            dragging = true;
          }
        }

        // Only move container if actually dragging
        if (dragging) {
          const dx = e.clientX - lastX;
          const dy = e.clientY - lastY;
          container.x += dx;
          container.y += dy;
        }
        lastX = e.clientX;
        lastY = e.clientY;
      }
    };
    const onUp = (e: PointerEvent)=>{
      // Check if this was a click (not a drag)
      if (mouseDown && !dragging) {
        const rect = (app.view as HTMLCanvasElement).getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const worldX = (mx - container.x) / scaleRef.current;
        const worldY = (my - container.y) / scaleRef.current;
        const settlement = getSettlementAtPoint(worldX, worldY);
        if (settlement) {
          setContextMenu({ x: e.clientX, y: e.clientY, settlement });
        }
      }
      mouseDown = false;
      dragging = false;
      lastX = 0;
      lastY = 0;
    };
    const onWheel = handleWheel;
    const canvas = app.view as HTMLCanvasElement;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('wheel', onWheel as any);
    
    // mobile gestures
    let lastDistance = 0;
    const onTouchStart = (e: TouchEvent)=>{
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        lastDistance = Math.sqrt((touch1.clientX - touch2.clientX) ** 2 + (touch1.clientY - touch2.clientY) ** 2);
      }
    };
    const onTouchMove = (e: TouchEvent)=>{
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.sqrt((touch1.clientX - touch2.clientX) ** 2 + (touch1.clientY - touch2.clientY) ** 2);
        const delta = distance > lastDistance ? 0.1 : -0.1;
        const oldScale = scaleRef.current;
        const newScale = Math.min(maxScale, Math.max(minScale, oldScale + delta));
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;
        const rect = canvas.getBoundingClientRect();
        const mx = centerX - rect.left;
        const my = centerY - rect.top;
        const worldX = (mx - container.x) / oldScale;
        const worldY = (my - container.y) / oldScale;
        scaleRef.current = newScale;
        container.scale.set(newScale);
        container.position.set(mx - worldX * newScale, my - worldY * newScale);
        lastDistance = distance;
      }
    };
    // pinch-zoom
    canvas.addEventListener('touchstart', onTouchStart as any);
    canvas.addEventListener('touchmove', onTouchMove as any);
    return ()=>{
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('wheel', onWheel as any);
      canvas.removeEventListener('touchstart', onTouchStart as any);
      canvas.removeEventListener('touchmove', onTouchMove as any);
    };
  }

  function drawMinimap(data: World | null) {
    const canvas = minimapRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const scaleX = W / data.width;
    const scaleY = H / data.height;

    ctx.clearRect(0, 0, W, H);

    // Draw terrain
    for (let y = 0; y < data.height; y++) {
      for (let x = 0; x < data.width; x++) {
        const t = data.biomeMap[y * data.width + x];
        ctx.fillStyle = BIOME_COLORS_HEX[t] ?? '#228B22';
        ctx.fillRect(x * scaleX, y * scaleY, Math.ceil(scaleX), Math.ceil(scaleY));
      }
    }

    // Draw settlements
    for (const s of data.settlements) {
      const mx = s.pos.x * scaleX;
      const my = s.pos.y * scaleY;
      const r = Math.max(2, 2 + Math.floor(s.pop / 15));
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fillStyle = s.id === 'local' ? '#f9d65c' : '#ff9966';
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Draw viewport indicator
    const app = appRef.current;
    const container = containerRef.current;
    if (app && container) {
      const tileSize = 20;
      const scale = scaleRef.current;
      const vw = app.renderer.width / scale / tileSize;
      const vh = app.renderer.height / scale / tileSize;
      const vx = -container.x / scale / tileSize;
      const vy = -container.y / scale / tileSize;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1;
      ctx.strokeRect(vx * scaleX, vy * scaleY, vw * scaleX, vh * scaleY);
    }
  }

  function drawWorld(){
    const container = containerRef.current;
    const data = useGameStore.getState().world;
    if (!container || !data) return;
    
    container.removeChildren();
    const tileSize = 20;
    const era = data.era || "stone";
    const theme = ERA_THEMES[era] || ERA_THEMES.stone;
    
    // Draw terrain
    for(let y=0; y<data.height; y++){
      for(let x=0; x<data.width; x++){
        const t = data.biomeMap[y*data.width+x];
        
        // Fallback colors if atlas doesn't load
        let color = 0x228B22; // Default green for grass
        switch(t) {
          case 0: color = 0x4169E1; break; // Water - blue
          case 1: color = 0x228B22; break; // Grass - green  
          case 2: color = 0x006400; break; // Forest - dark green
          case 3: color = 0x696969; break; // Mountain - gray
        }
        
        // Try to use atlas if available
        const frames = atlasRef.current;
        if (frames && frames[t]) {
          const sprite = new PIXI.Sprite(frames[t]);
          sprite.x = x*tileSize; 
          sprite.y = y*tileSize; 
          sprite.width = tileSize; 
          sprite.height = tileSize;
          container.addChild(sprite);
        } else {
          const sprite = new PIXI.Graphics();
          sprite.x = x*tileSize; 
          sprite.y = y*tileSize; 
          sprite.rect(0, 0, tileSize, tileSize);
          sprite.fill(color);
          container.addChild(sprite);
        }
      }
    }
    
    // Draw settlements
    for(const s of data.settlements){
      const centerX = s.pos.x * tileSize + 10;
      const centerY = s.pos.y * tileSize + 10;
      const settlementEra = s.era || era;
      const settlementTheme = ERA_THEMES[settlementEra] || ERA_THEMES.stone;
      
      // Draw settlement base (era-appropriate)
      const base = new PIXI.Graphics();
      const baseSize = Math.min(10 + Math.floor(s.pop / 8), 16);
      // Outer glow halo - makes settlement visible against any terrain
      base.circle(centerX, centerY, baseSize + 5);
      base.fill({ color: settlementTheme.primary, alpha: 0.25 });
      base.circle(centerX, centerY, baseSize + 3);
      base.fill({ color: settlementTheme.primary, alpha: 0.15 });
      // Main settlement circle
      base.circle(centerX, centerY, baseSize);
      base.fill(settlementTheme.primary);
      base.stroke({ color: settlementTheme.secondary, width: 2 });
      // Inner circle for depth
      base.circle(centerX, centerY, baseSize * 0.7);
      base.fill({ color: settlementTheme.accent, alpha: 0.5 });
      container.addChild(base);
      
      // Draw campfire glow if campfire exists
      if (s.structures.includes("campfire")) {
        const fireGlow = new PIXI.Graphics();
        const glowIntensity = 0.4 + Math.sin(data.tick * 0.2) * 0.2;
        fireGlow.circle(centerX, centerY, baseSize * 0.6);
        fireGlow.fill({ color: 0xFF4500, alpha: glowIntensity });
        container.addChild(fireGlow);
      }
      
      // Draw structures around settlement (with visual effects)
      const structurePositions = [
        {x: -15, y: -15}, {x: 15, y: -15}, {x: -15, y: 15}, {x: 15, y: 15},
        {x: -20, y: 0}, {x: 20, y: 0}, {x: 0, y: -20}, {x: 0, y: 20}
      ];
      
      s.structures.slice(0, 8).forEach((structure, idx) => {
        if(idx >= structurePositions.length) return;
        const pos = structurePositions[idx];
        const sx = centerX + pos.x;
        const sy = centerY + pos.y;
        
        const structureGraphic = new PIXI.Graphics();
        
        // Enhanced structure rendering
        if(structure === "hut") {
          drawHut(structureGraphic, sx, sy, 8, settlementEra);
        } else if(structure === "campfire") {
          // Animated campfire
          const fireSize = 3 + Math.sin(data.tick * 0.3) * 0.5;
          structureGraphic.circle(sx, sy, fireSize);
          structureGraphic.fill(0xFF4500);
          structureGraphic.circle(sx, sy, fireSize * 0.6);
          structureGraphic.fill(0xFFD700);
          // Glow
          structureGraphic.circle(sx, sy, fireSize * 1.5);
          structureGraphic.fill({ color: 0xFF4500, alpha: 0.3 });
        } else if(structure === "palissade") {
          drawPalissade(structureGraphic, sx, sy, 10);
        } else if(structure === "charcoal_kiln") {
          drawKiln(structureGraphic, sx, sy, 5, data.tick);
        } else if(structure === "farm") {
          drawFarm(structureGraphic, sx, sy, 8);
        } else if(structure === "forge") {
          drawForge(structureGraphic, sx, sy, 7, data.tick);
        } else if(structure === "bronze_workshop") {
          drawBronzeWorkshop(structureGraphic, sx, sy, 8, data.tick);
        } else {
          // Generic building with era theme
          structureGraphic.rect(sx-3, sy-3, 6, 6);
          structureGraphic.fill(settlementTheme.structure);
          structureGraphic.stroke({ color: settlementTheme.secondary, width: 1 });
        }
        
        container.addChild(structureGraphic);
      });
      
      // Draw population indicator (visible people around settlement)
      const popCount = Math.min(s.pop, 20); // Increased cap
      const structures = s.structures || [];
      const hasFarm = structures.includes("farm");
      const hasForge = structures.includes("forge");
      const hasWorkshop = structures.includes("bronze_workshop");
      
      for(let i = 0; i < popCount; i++){
        const angle = (i / popCount) * Math.PI * 2 + (data.tick * 0.01);
        const radius = 20 + Math.sin(data.tick * 0.02 + i) * 4;
        const px = centerX + Math.cos(angle) * radius;
        const py = centerY + Math.sin(angle) * radius;
        
        // Determine activity based on position relative to structures
        let activity = "idle";
        if (hasFarm && Math.abs(px - centerX) < 15 && Math.abs(py - centerY) < 15) {
          activity = "farming";
        } else if ((hasForge || hasWorkshop) && Math.abs(px - centerX) < 12 && Math.abs(py - centerY) < 12) {
          activity = "working";
        }
        
        const person = new PIXI.Graphics();
        drawPerson(person, px, py, activity, settlementEra);
        container.addChild(person);
      }
      
      // Settlement name with better styling
      const nameText = new PIXI.Text({
        text: s.name,
        style: {
          fontSize: 13,
          fill: 0xFFFFFF,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          stroke: { color: 0x000000, width: 3 },
          dropShadow: {
            color: 0x000000,
            blur: 3,
            angle: Math.PI / 4,
            distance: 1
          }
        }
      });
      nameText.x = centerX - nameText.width / 2;
      nameText.y = centerY + baseSize + 6;
      container.addChild(nameText);

      // Population count badge - always show
      const popBadgeWidth = s.pop >= 100 ? 28 : 22;
      const popBadge = new PIXI.Graphics();
      popBadge.rect(centerX - popBadgeWidth / 2, centerY - baseSize - 10, popBadgeWidth, 8);
      popBadge.fill({ color: 0x000000, alpha: 0.7 });
      popBadge.stroke({ color: settlementTheme.primary, width: 1 });
      container.addChild(popBadge);

      const popText = new PIXI.Text({
        text: `pop:${s.pop}`,
        style: {
          fontSize: 7,
          fill: 0xFFFFFF,
          fontFamily: 'Arial'
        }
      });
      popText.x = centerX - popText.width / 2;
      popText.y = centerY - baseSize - 9;
      container.addChild(popText);
    }

    // Update minimap after drawing world
    drawMinimap(data);
  }

  // Initialize PIXI once
  useEffect(()=>{
    if(!ref.current) return;
    const app = new PIXI.Application();
    app.init({ background: "#0b0f1a", resizeTo: ref.current }).then(async ()=>{
      appRef.current = app;
      ref.current!.appendChild(app.canvas);
      const container = new PIXI.Container();
      containerRef.current = container;
      app.stage.addChild(container);
      
      // Load atlas for current era
      if (world) atlasRef.current = await loadAtlas(world.era || "stone");
      
      const cleanup = enableDragInteractions();
      window.addEventListener('resize', drawWorld);
      const onZoom = (e:any)=>{
        const c = containerRef.current; 
        const appInstance = appRef.current;
        if(!c || !appInstance) return;
        const delta = e.detail.zoom > scaleRef.current ? 0.1 : -0.1;
        const old = scaleRef.current; 
        const ns = Math.min(maxScale, Math.max(minScale, old + delta));
        const centerX = appInstance.renderer.width/2; 
        const centerY = appInstance.renderer.height/2;
        const worldX = (centerX - c.x) / old; 
        const worldY = (centerY - c.y) / old;
        scaleRef.current = ns; 
        c.scale.set(ns);
        c.position.set(centerX - worldX * ns, centerY - worldY * ns);
      };
      window.addEventListener('epicages:zoom', onZoom as any);
      
      // Animation ticker for smooth visual effects
      // Redraw periodically to update animations (glow, smoke, etc.)
      let animationFrame = 0;
      const ticker = app.ticker.add(() => {
        animationFrame++;
        // Redraw every 3 frames for smooth animations without too much overhead
        if (animationFrame % 3 === 0) {
          const currentWorld = useGameStore.getState().world;
          if (currentWorld) {
            drawWorld();
          }
        }
      });
      
      // Initial draw
      drawWorld();
      
      return ()=>{
        app.ticker.remove(ticker);
        window.removeEventListener('resize', drawWorld);
        window.removeEventListener('epicages:zoom', onZoom as any);
        if (typeof cleanup === 'function') cleanup();
        app.destroy(true);
      };
    });
  }, []);
  
  // Redraw when world data changes
  useEffect(() => {
    if (world) {
      // Reload atlas if era changed
      loadAtlas(world.era || "stone").then(atlas => {
        atlasRef.current = atlas;
        drawWorld();
      });
    }
  }, [world]);

  return (
    <>
      <div ref={ref} style={{position:"absolute", inset:0}} />
      <canvas
        ref={minimapRef}
        width={160}
        height={110}
        className="minimap"
        title="Minimap - white box shows current viewport"
      />
      <div className="minimap-legend">
        <span className="legend-item"><span className="legend-swatch" style={{background:"#4169E1"}}></span>Water</span>
        <span className="legend-item"><span className="legend-swatch" style={{background:"#228B22"}}></span>Grass</span>
        <span className="legend-item"><span className="legend-swatch" style={{background:"#006400"}}></span>Forest</span>
        <span className="legend-item"><span className="legend-swatch" style={{background:"#696969"}}></span>Mountain</span>
        <span className="legend-item"><span className="legend-swatch legend-swatch-circle" style={{background:"#f9d65c"}}></span>You</span>
        <span className="legend-item"><span className="legend-swatch legend-swatch-circle" style={{background:"#ff9966"}}></span>Neighbor</span>
      </div>
      {hoveredSettlement && (
        <div
          ref={tooltipRef}
          className="game-tooltip"
          style={{
            left: `${tooltipPos.x + 10}px`,
            top: `${tooltipPos.y + 10}px`,
          }}
        >
          <strong>{hoveredSettlement.name}</strong>
          <div className="tooltip-line">Population: {hoveredSettlement.pop}</div>
          <div className="tooltip-line">Structures: {hoveredSettlement.structures.length}</div>
          {Object.entries(hoveredSettlement.storage).filter(([_, v]) => v && v > 0).length > 0 && (
            <div className="tooltip-line">
              Resources: {Object.entries(hoveredSettlement.storage)
                .filter(([_, v]) => v && v > 0)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")}
            </div>
          )}
        </div>
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          object={{ type: "settlement", settlement: contextMenu.settlement }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
