import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { ZoomIn, ZoomOut, Maximize2, User } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════
// LAYOUT ENGINE — computes x,y positions for tree nodes
// ═══════════════════════════════════════════════════════════════════════
const NODE_W = 140;
const NODE_H = 56;
const H_GAP = 60;   // horizontal gap between siblings
const V_GAP = 100;  // vertical gap between generations

function layoutTree(person) {
  const nodes = [];
  const edges = [];
  let id = 0;

  const addNode = (p, x, y, relation) => {
    const nid = id++;
    nodes.push({ id: nid, person: p, x, y, relation, isRoot: relation === "root" });
    return nid;
  };

  // Root
  const rootX = 400;
  const rootY = 300;
  const rootId = addNode(person, rootX, rootY, "root");

  // Parents — centered above root
  const parents = person.parents || [];
  if (parents.length > 0) {
    const parentStartX = rootX - ((parents.length - 1) * (NODE_W + H_GAP)) / 2;
    parents.forEach((p, i) => {
      const px = parentStartX + i * (NODE_W + H_GAP);
      const py = rootY - V_GAP;
      const pid = addNode(p, px, py, "parent");
      edges.push({ from: pid, to: rootId, label: "" });
    });
    // Spouse line between parents
    if (parents.length === 2) {
      edges.push({
        from: nodes.find((n) => n.person.id === parents[0].id)?.id,
        to: nodes.find((n) => n.person.id === parents[1].id)?.id,
        label: "spouse",
        dashed: true,
      });
    }
  }

  // Spouses — to the right of root
  const spouses = person.spouses || [];
  spouses.forEach((s, i) => {
    const sx = rootX + NODE_W + H_GAP;
    const sy = rootY + i * (NODE_H + 20);
    const sid = addNode(s, sx, sy, "spouse");
    edges.push({ from: rootId, to: sid, label: "spouse", horizontal: true });
  });

  // Siblings — same level as root, to the left
  const siblings = person.siblings || [];
  siblings.forEach((s, i) => {
    const sx = rootX - (NODE_W + H_GAP) * (i + 1);
    const sy = rootY;
    addNode(s, sx, sy, "sibling");
    // Connect siblings via shared parent line (visual only)
  });

  // Children — centered below root
  const children = person.children || [];
  if (children.length > 0) {
    const childStartX = rootX - ((children.length - 1) * (NODE_W + H_GAP)) / 2;
    children.forEach((c, i) => {
      const cx = childStartX + i * (NODE_W + H_GAP);
      const cy = rootY + V_GAP;
      const cid = addNode(c, cx, cy, "child");
      edges.push({ from: rootId, to: cid, label: "" });
    });
  }

  return { nodes, edges, bounds: computeBounds(nodes) };
}

function computeBounds(nodes) {
  if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach((n) => {
    minX = Math.min(minX, n.x - NODE_W);
    minY = Math.min(minY, n.y - NODE_H);
    maxX = Math.max(maxX, n.x + NODE_W * 2);
    maxY = Math.max(maxY, n.y + NODE_H * 2);
  });
  return { minX, minY, maxX, maxY };
}

// ═══════════════════════════════════════════════════════════════════════
// GENDER COLOR
// ═══════════════════════════════════════════════════════════════════════
function genderColor(gender) {
  return gender === "male"
    ? { bg: "bg-blue-50 dark:bg-blue-950 dark:border-blue-800 border-blue-300", gradient: "from-blue-500 to-blue-600", text: "text-blue-700 dark:text-blue-300" }
    : { bg: "bg-pink-50 dark:bg-pink-950 dark:border-pink-800 border-pink-300", gradient: "from-pink-500 to-rose-500", text: "text-pink-700 dark:text-pink-300" };
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════
export default function TreeView({ person, onNavigate }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(null);
  const containerRef = useRef(null);

  const { nodes, edges } = useMemo(() => layoutTree(person), [person]);

  // Pan
  const handleMouseDown = useCallback((e) => {
    if (e.target !== containerRef.current && e.target !== e.currentTarget) return;
    setDragging(true);
    dragRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  }, [offset]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y });
  }, [dragging]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  // Zoom
  const zoom = (dir) => setScale((s) => Math.max(0.3, Math.min(2, s + dir * 0.2)));
  const reset = () => { setScale(1); setOffset({ x: 0, y: 0 }); };

  if (!person) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200">
        <span className="text-sm font-medium text-slate-600">Tree View</span>
        <div className="flex items-center gap-1">
          <button onClick={() => zoom(-1)} className="p-1.5 rounded-lg hover:bg-slate-200 dark:bg-slate-600 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors" title="Zoom out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-400 dark:text-slate-300 w-10 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => zoom(1)} className="p-1.5 rounded-lg hover:bg-slate-200 dark:bg-slate-600 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors" title="Zoom in">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={reset} className="p-1.5 rounded-lg hover:bg-slate-200 dark:bg-slate-600 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors" title="Reset view">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative w-full h-[500px] bg-slate-50 dark:bg-slate-900 overflow-hidden select-none"
        style={{ cursor: dragging ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            transition: dragging ? "none" : "transform 0.2s ease",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {/* SVG Edges */}
          <svg
            style={{
              position: "absolute",
              top: 0, left: 0,
              width: "2000px",
              height: "2000px",
              pointerEvents: "none",
              overflow: "visible",
            }}
          >
            {edges.map((e, i) => {
              const from = nodes.find((n) => n.id === e.from);
              const to = nodes.find((n) => n.id === e.to);
              if (!from || !to) return null;
              const x1 = from.x + NODE_W / 2;
              const y1 = e.horizontal ? from.y + NODE_H / 2 : from.y + NODE_H;
              const x2 = e.horizontal ? to.x : to.x + NODE_W / 2;
              const y2 = e.horizontal ? to.y + NODE_H / 2 : to.y;

              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              let d;
              if (e.horizontal) {
                d = `M${x1},${y1} C${x1 + 40},${y1} ${x2 - 40},${y2} ${x2},${y2}`;
              } else if (nodes.filter((n) => n.person.id === from.person.id).length > 1) {
                // Vertical line with horizontal split for multiple children
                d = `M${x1},${y1} L${x1},${midY} L${x2},${midY} L${x2},${y2}`;
              } else {
                d = `M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`;
              }

              return (
                <g key={i}>
                  <path
                    d={d}
                    fill="none"
                    stroke={e.dashed ? "#f472b6" : "#cbd5e1"}
                    strokeWidth={2}
                    strokeDasharray={e.dashed ? "6,3" : "none"}
                  />
                  {e.label === "spouse" && e.horizontal && (
                    <text x={midX} y={midY - 8} textAnchor="middle" fontSize="10" fill="#ec4899">
                      💕
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((n) => {
            const gc = genderColor(n.person.gender);
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: n.id * 0.05 }}
                whileHover={{ scale: 1.05, zIndex: 10 }}
                onClick={() => !n.isRoot && onNavigate?.(n.person)}
                className={`absolute flex items-center gap-2 px-3 py-2 rounded-xl border-2 shadow-sm
                  transition-shadow hover:shadow-md
                  ${n.isRoot ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-700 ring-2 ring-emerald-200 dark:ring-emerald-800" : `${gc.bg}`}
                  ${!n.isRoot ? "cursor-pointer" : ""}`}
                style={{
                  left: n.x,
                  top: n.y,
                  width: NODE_W,
                  height: NODE_H,
                }}
              >
                {/* Mini avatar */}
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gc.gradient} flex items-center justify-center flex-shrink-0`}>
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">
                    {n.person.first_name}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-300 truncate leading-tight">
                    {n.person.last_name}
                  </p>
                </div>
                {n.relation !== "root" && (
                  <span className="text-[9px] text-slate-400 dark:text-slate-300 absolute -top-2.5 left-2 bg-white dark:bg-slate-800 px-1.5 rounded-full border border-slate-200 dark:border-slate-600">
                    {n.relation}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
