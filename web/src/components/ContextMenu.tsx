import React, { useEffect, useRef } from "react";
import { useGameStore } from "../state";
import type { Settlement } from "../../../shared/types";

type ContextMenuProps = {
  x: number;
  y: number;
  object: { type: "settlement"; settlement: Settlement } | { type: "structure"; settlement: Settlement; structureIndex: number; structureType: string };
  onClose: () => void;
};

export default function ContextMenu({ x, y, object, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const send = useGameStore(state => state.send);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleAction = (action: string) => {
    if (object.type === "settlement") {
      const settlementId = object.settlement.id;
      if (action === "harvest") {
        send({ type: "proposal", proposal: { playerId: "local", action: "harvest", args: { resource: "berries", amount: 6, settlementId } } });
      } else if (action === "build") {
        send({ type: "proposal", proposal: { playerId: "local", action: "build", args: { structure: "hut", settlementId } } });
      } else if (action === "research") {
        send({ type: "proposal", proposal: { playerId: "local", action: "research", args: { tech: "pottery" } } });
      }
    }
    onClose();
  };

  // Adjust position to keep menu on screen
  const rect = menuRef.current?.getBoundingClientRect();
  const adjustedX = rect && x + rect.width > window.innerWidth ? x - rect.width : x;
  const adjustedY = rect && y + rect.height > window.innerHeight ? y - rect.height : y;

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: "fixed",
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
        zIndex: 10000
      }}
    >
      {object.type === "settlement" && (
        <>
          <div className="context-menu-header">{object.settlement.name}</div>
          <div className="context-menu-item" onClick={() => handleAction("harvest")}>
            Harvest
          </div>
          <div className="context-menu-item" onClick={() => handleAction("build")}>
            Build Structure
          </div>
          <div className="context-menu-item" onClick={() => handleAction("research")}>
            Research
          </div>
        </>
      )}
      {object.type === "structure" && (
        <>
          <div className="context-menu-header">{object.structureType}</div>
          <div className="context-menu-item">View Info</div>
        </>
      )}
    </div>
  );
}
