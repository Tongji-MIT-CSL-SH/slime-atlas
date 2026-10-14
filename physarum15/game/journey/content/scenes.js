import { shortestPaths, serviceSummary } from "../core/graph.js";
export const BACKUP = {
  nodes: [
    { id: "A", x: 130, y: 255, name: "資源起點" }, { id: "B", x: 345, y: 255, name: "交會點" },
    { id: "C", x: 595, y: 255, name: "目標一" }, { id: "D", x: 825, y: 255, name: "目標二" },
    { id: "E", x: 280, y: 105, name: "北側支點" },
  ],
  edges: [
    { id: "AB", a: "A", b: "B", length: 215 }, { id: "BC", a: "B", b: "C", length: 250 },
    { id: "CD", a: "C", b: "D", length: 230 }, { id: "AE", a: "A", b: "E", length: 210 },
  ],
  options: [
    { id: "none", name: "先不留備路", note: "看看主路中斷會怎樣", cost: 0, edges: [] },
    { id: "loop", name: "連回左側", note: "北側支點 → 交會點", cost: 3, edges: [{ id: "EB", a: "E", b: "B", length: 165 }] },
    { id: "cross", name: "跨過中間", note: "北側支點 → 目標一", cost: 3, edges: [{ id: "EC", a: "E", b: "C", length: 350 }] },
    { id: "long", name: "直達最遠處", note: "北側支點 → 目標二", cost: 5, edges: [{ id: "ED", a: "E", b: "D", length: 565 }] },
  ],
  targets: ["C", "D"], budget: 3, cut: "BC",
};
export function evaluateBackup(optionId, cut = true, cutEdge = BACKUP.cut) {
  const option = BACKUP.options.find((item) => item.id === optionId);
  if (!option) throw new Error("Unknown backup option");
  if(!["BC","CD"].includes(cutEdge))throw new Error("Unknown backup cut");
  const edges = [...BACKUP.edges, ...option.edges];
  const paths = shortestPaths(BACKUP.nodes, edges, "A", cut ? [cutEdge] : []);
  return {
    option: optionId, cut, cutEdge, cost: option.cost, affordable: option.cost <= BACKUP.budget,
    reached: BACKUP.targets.filter((id) => Number.isFinite(paths.distance[id])),
    routes: Object.fromEntries(BACKUP.targets.map((id) => [id, paths.routeTo(id)])), edges,
  };
}
export const CITY = {
  nodes: [
    { id: "S", x: 790, y: 235, name: "服務站" }, { id: "E", x: 715, y: 410, name: "中心街區" },
    { id: "W", x: 250, y: 145, name: "西岸住區" }, { id: "H", x: 235, y: 430, name: "河灣住戶" },
    { id: "WN", x: 355, y: 145 }, { id: "EN", x: 505, y: 145 },
    { id: "ET", x: 790, y: 145 }, { id: "BR", x: 505, y: 430 }, { id: "R", x: 790, y: 430 },
  ],
  edges: [
    { id: "HW", a: "H", b: "W", length: 500 }, { id: "WWN", a: "W", b: "WN", length: 100 },
    { id: "bridge", a: "WN", b: "EN", length: 180 }, { id: "ENET", a: "EN", b: "ET", length: 200 },
    { id: "ETS", a: "ET", b: "S", length: 130 }, { id: "ES", a: "E", b: "S", length: 260 },
  ],
  groups: [
    { id: "centre", node: "E", name: "中心街區", population: 100 },
    { id: "west", node: "W", name: "西岸住區", population: 20 },
    { id: "bend", node: "H", name: "河灣住戶", population: 20 },
  ],
  budget: 4, threshold: 650,
};
const centreEdges = [{ id: "shortcut", a: "E", b: "S", length: 100 }];
const riverEdges = [
  { id: "southBridge", a: "H", b: "BR", length: 160 },
  { id: "southRoad", a: "BR", b: "R", length: 160 },
  { id: "southEast", a: "R", b: "S", length: 200 },
];
export const CITY_OPTIONS = [
  { id: "none", name: "維持現狀", note: "先走一遍原來的道路", cost: 0, edges: [] },
  { id: "centre", name: "中心街區捷徑", note: "縮短人口最多一組的路程", cost: 3, edges: centreEdges },
  { id: "river", name: "南側公共通道", note: "打開已獲准的南側跨河候選", cost: 4, edges: riverEdges },
  { id: "both", name: "兩項都做", note: "合計建設與維護投入", cost: 7, edges: [...centreEdges, ...riverEdges] },
];
export function evaluateCity(optionId) {
  const option = CITY_OPTIONS.find((item) => item.id === optionId);
  if (!option) throw new Error("Unknown city option");
  const edges = [...CITY.edges, ...option.edges];
  const paths = shortestPaths(CITY.nodes, edges, "S");
  return {
    option: optionId, cost: option.cost, affordable: option.cost <= CITY.budget,
    ...serviceSummary(CITY.groups, paths.distance, CITY.threshold),
    routes: Object.fromEntries(CITY.groups.map((group) => [group.id, paths.routeTo(group.node)])), edges,
  };
}
