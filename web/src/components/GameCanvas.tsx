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
      if(!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      container.x += dx;
      container.y += dy;
    };
    const onUp = (e: PointerEvent)=>{ dragging = false; (e.currentTarget as any).releasePointerCapture?.(e.pointerId); };

    const canvas = app.canvas as HTMLCanvasElement;
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    // pinch-zoom
    let t1: Touch|undefined, t2: Touch|undefined, startDist = 0, startScale = 1;
    const onTouchStart = (ev: TouchEvent)=>{
      if(ev.touches.length === 2){
        t1 = ev.touches[0]; t2 = ev.touches[1];
        startDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        startScale = scaleRef.current;
      }
    };
    const onTouchMove = (ev: TouchEvent)=>{
      if(ev.touches.length === 2 && t1 && t2){
        const n1 = ev.touches[0], n2 = ev.touches[1];
        const dist = Math.hypot(n2.clientX - n1.clientX, n2.clientY - n1.clientY);
        const factor = dist / (startDist || 1);
        const newScale = Math.min(maxScale, Math.max(minScale, startScale * factor));
        scaleRef.current = newScale;
        container.scale.set(newScale);
      }
    };
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });

    canvas.addEventListener('wheel', handleWheel, { passive: true });

    return ()=>{
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }

  useEffect(()=>{
    if(!ref.current) return;
    const app = new PIXI.Application();
    app.init({ background: "#0b0f1a", resizeTo: ref.current }).then(async ()=>{
      appRef.current = app;
      ref.current!.appendChild(app.canvas);
      const container = new PIXI.Container();
      containerRef.current = container;
      app.stage.addChild(container);
      if (world) atlasRef.current = await loadAtlas(world.era || "stone");
      draw();
      const cleanup = enableDragInteractions();
      window.addEventListener('resize', draw);
      const onZoom = (e:any)=>{
        const c = containerRef.current; if(!c) return;
        const delta = e.detail > 0 ? 0.1 : -0.1;
        const old = scaleRef.current; const ns = Math.min(maxScale, Math.max(minScale, old + delta));
        const centerX = app.renderer.width/2; const centerY = app.renderer.height/2;
        const worldX = (centerX - c.x) / old; const worldY = (centerY - c.y) / old;
        scaleRef.current = ns; c.scale.set(ns);
        c.position.set(centerX - worldX * ns, centerY - worldY * ns);
      };
      window.addEventListener('epicages:zoom', onZoom as any);
      return ()=>{
        window.removeEventListener('resize', draw);
        window.removeEventListener('epicages:zoom', onZoom as any);
        if (typeof cleanup === 'function') cleanup();
        app.destroy(true);
      };
    });

    function draw(){
      const container = containerRef.current;
      if (!container) return;
      container.removeChildren();
      const data = useGameStore.getState().world;
      if(!data) return;
      const tileSize = 20;
      for(let y=0;y<data.height;y++){
        for(let x=0;x<data.width;x++){
          const t = data.biomeMap[y*data.width+x];
          const sprite = new PIXI.Sprite();
          sprite.x = x*tileSize; sprite.y = y*tileSize; sprite.width = tileSize; sprite.height = tileSize;
          const frames = atlasRef.current;
          if (frames) {
            sprite.texture = frames[t] || frames[1];
          }
          container.addChild(sprite);
        }
      }
      for(const s of data.settlements){
        const g = new PIXI.Graphics();
        g.circle(s.pos.x*tileSize+10, s.pos.y*tileSize+10, 7);
        g.fill(0xF9D65C);
        container.addChild(g);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  // Redraw on world change
  useEffect(()=>{
    (async ()=>{
      if (!world) return;
      atlasRef.current = await loadAtlas(world.era || "stone");
      const app = appRef.current;
      const container = containerRef.current;
      if(!app || !container) return;
      container.removeChildren();
      const tileSize = 20;
      for(let y=0;y<world.height;y++){
        for(let x=0;x<world.width;x++){
          const t = world.biomeMap[y*world.width+x];
          const sprite = new PIXI.Sprite();
          sprite.x = x*tileSize; sprite.y = y*tileSize; sprite.width = tileSize; sprite.height = tileSize;
          const frames = atlasRef.current;
          if (frames) sprite.texture = frames[t] || frames[1];
          container.addChild(sprite);
        }
      }
      for(const s of world.settlements){
        const g = new PIXI.Graphics();
        g.circle(s.pos.x*tileSize+10, s.pos.y*tileSize+10, 7);
        g.fill(0xF9D65C);
        container.addChild(g);
      }
    })();
  }, [world]);

  return <div ref={ref} style={{position:"absolute", inset:0}} />;
}
