/**
 * Demonstration geometry for the JEC Maps exhibit.
 * These places and paths are illustrative. They are not JEC's real layout or the
 * project's map data. Coordinates are in an abstract 100 × 76 map space.
 */

export interface MapNode {
  id: string;
  x: number;
  y: number;
  label?: string;
}

export interface Place {
  id: string;
  name: string;
  /** Building footprint for drawing. */
  rect: [number, number, number, number];
  labelAt: [number, number];
}

export const nodes: Record<string, MapNode> = {
  gate: { id: "gate", x: 6, y: 62, label: "Main gate" },
  j1: { id: "j1", x: 24, y: 62, label: "Junction A" },
  j2: { id: "j2", x: 24, y: 38, label: "Junction B" },
  j3: { id: "j3", x: 24, y: 14, label: "Junction C" },
  j4: { id: "j4", x: 50, y: 38, label: "Junction D" },
  j5: { id: "j5", x: 50, y: 14, label: "Junction E" },
  j6: { id: "j6", x: 78, y: 38, label: "Junction F" },
  j7: { id: "j7", x: 78, y: 62, label: "Junction G" },
  j8: { id: "j8", x: 50, y: 62, label: "Junction H" },
  j9: { id: "j9", x: 78, y: 14, label: "Junction I" },
  admin: { id: "admin", x: 37, y: 14 },
  library: { id: "library", x: 64, y: 14 },
  labs: { id: "labs", x: 91, y: 38 },
  hostel: { id: "hostel", x: 91, y: 62 },
  canteen: { id: "canteen", x: 37, y: 62 },
  field: { id: "field", x: 64, y: 38 },
};

export const edges: [string, string][] = [
  ["gate", "j1"],
  ["j1", "canteen"],
  ["canteen", "j8"],
  ["j1", "j2"],
  ["j2", "j3"],
  ["j3", "admin"],
  ["admin", "j5"],
  ["j2", "j4"],
  ["j4", "j5"],
  ["j4", "field"],
  ["field", "j6"],
  ["j4", "j8"],
  ["j8", "j7"],
  ["j6", "j7"],
  ["j5", "library"],
  ["library", "j9"],
  ["j9", "j6"],
  ["j6", "labs"],
  ["j7", "hostel"],
];

export const places: Place[] = [
  { id: "admin", name: "Admin block", rect: [28, 2, 18, 8], labelAt: [29.4, 6.8] },
  { id: "library", name: "Library", rect: [56, 2, 16, 8], labelAt: [57.4, 6.8] },
  { id: "labs", name: "Labs", rect: [84, 25, 14, 9], labelAt: [85.4, 30.2] },
  { id: "hostel", name: "Hostel", rect: [83, 66, 15, 8], labelAt: [84.4, 70.8] },
  { id: "canteen", name: "Canteen", rect: [29, 66, 16, 8], labelAt: [30.4, 70.8] },
  { id: "field", name: "Sports field", rect: [55, 43, 18, 14], labelAt: [56.4, 50.6] },
];

export const ORIGIN = "gate";

const dist = (a: MapNode, b: MapNode) => Math.hypot(a.x - b.x, a.y - b.y);

const adjacency: Record<string, { to: string; w: number }[]> = {};
for (const [a, b] of edges) {
  const w = dist(nodes[a], nodes[b]);
  (adjacency[a] ??= []).push({ to: b, w });
  (adjacency[b] ??= []).push({ to: a, w });
}

/** Dijkstra's shortest path over the demonstration graph. */
export function shortestPath(from: string, to: string): { path: string[]; length: number } | null {
  const best: Record<string, number> = { [from]: 0 };
  const prev: Record<string, string | undefined> = {};
  const open = new Set<string>(Object.keys(nodes));
  while (open.size) {
    let u: string | null = null;
    for (const n of open) if (best[n] !== undefined && (u === null || best[n] < best[u])) u = n;
    if (u === null) break;
    open.delete(u);
    if (u === to) break;
    for (const { to: v, w } of adjacency[u] ?? []) {
      const alt = best[u] + w;
      if (best[v] === undefined || alt < best[v]) {
        best[v] = alt;
        prev[v] = u;
      }
    }
  }
  if (best[to] === undefined) return null;
  const path: string[] = [];
  for (let n: string | undefined = to; n; n = prev[n]) path.unshift(n);
  return { path, length: best[to] };
}

export function pathData(path: string[]) {
  return path.map((id, i) => `${i ? "L" : "M"}${nodes[id].x} ${nodes[id].y}`).join(" ");
}
