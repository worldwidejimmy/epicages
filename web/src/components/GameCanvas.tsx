import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameStore } from "../state";

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

export default function GameCanvas(){
  const ref = useRef<HTMLDivElement | null>(null);
  const world = useGameStore(s=> s.world);
  const atlasRef = useRef<PIXI.Texture[] | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const containerRef = useRef<PIXI.Container | null>(null);

  const scaleRef = useRef(1);
  const minScale = 0.5;
  const maxScale = 3;

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

  function enableDragInteractions(){
    const container = containerRef.current;
    const app = appRef.current;
    if(!container || !app) return;
    let dragging = false;
    let lastX = 0, lastY = 0;
    const onDown = (e: PointerEvent)=>{ dragging = true; lastX = e.clientX; lastY = e.clientY; (e.currentTarget as any).setPointerCapture?.(e.pointerId); };
    const onMove = (e: PointerEvent)=>{
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      container.x += dx;
      container.y += dy;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = ()=> dragging = false;
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

  function drawWorld(){
    const container = containerRef.current;
    const data = useGameStore.getState().world;
    if (!container || !data) return;
    
    container.removeChildren();
    const tileSize = 20;
    
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
      
      // Draw settlement base (campfire or main building)
      const base = new PIXI.Graphics();
      base.circle(centerX, centerY, 8);
      base.fill(0xF9D65C);
      base.stroke({ color: 0x8B4513, width: 2 }); // Brown outline
      container.addChild(base);
      
      // Draw population indicator (visible people around settlement)
      const popCount = Math.min(s.pop, 16); // Cap visual population
      for(let i = 0; i < popCount; i++){
        const angle = (i / popCount) * Math.PI * 2 + (data.tick * 0.01); // Slow rotation animation
        const radius = 18 + Math.sin(data.tick * 0.02 + i) * 3; // Gentle movement
        const px = centerX + Math.cos(angle) * radius;
        const py = centerY + Math.sin(angle) * radius;
        
        // Draw person as a larger, more visible shape
        const person = new PIXI.Graphics();
        
        // Body (larger circle)
        person.circle(px, py, 3);
        person.fill(0xFFE4B5); // Beige body
        person.stroke({ color: 0x8B4513, width: 1 }); // Brown outline
        
        // Head (smaller circle above)
        person.circle(px, py - 4, 2);
        person.fill(0xF5DEB3); // Lighter skin tone for head
        
        container.addChild(person);
      }
      
      // Draw structures around settlement
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
        
        // Different shapes for different structures
        if(structure === "hut") {
          structureGraphic.rect(sx-3, sy-3, 6, 6);
          structureGraphic.fill(0x8B4513); // Brown hut
        } else if(structure === "campfire") {
          structureGraphic.circle(sx, sy, 2);
          structureGraphic.fill(0xFF4500); // Orange fire
        } else if(structure === "palissade") {
          structureGraphic.rect(sx-2, sy-4, 4, 8);
          structureGraphic.fill(0x654321); // Dark brown fence
        } else if(structure === "charcoal_kiln") {
          structureGraphic.circle(sx, sy, 4);
          structureGraphic.fill(0x36454F); // Dark gray kiln
        } else {
          // Generic building
          structureGraphic.rect(sx-2, sy-2, 4, 4);
          structureGraphic.fill(0x696969); // Gray
        }
        
        container.addChild(structureGraphic);
      });
      
      // Settlement name
      const nameText = new PIXI.Text({
        text: s.name,
        style: {
          fontSize: 10,
          fill: 0xFFFFFF,
          fontFamily: 'Arial'
        }
      });
      nameText.x = centerX - nameText.width / 2;
      nameText.y = centerY + 25;
      container.addChild(nameText);
    }
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
      
      // Initial draw
      drawWorld();
      
      return ()=>{
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

  return <div ref={ref} style={{position:"absolute", inset:0}} />;
}
