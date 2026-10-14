// Undirected teaching graphs. Drawing coordinates never decide travel distance.
export function shortestPaths(nodes, edges, source, removed = []) {
  const ids = new Set(nodes.map((node) => node.id));
  if (!ids.has(source)) throw new Error("Unknown source");
  const blocked = new Set(removed);
  const adjacent = new Map([...ids].map((id) => [id, []]));
  for (const edge of edges) {
    if (!ids.has(edge.a) || !ids.has(edge.b) || !Number.isFinite(edge.length) || edge.length < 0) {
      throw new Error("Invalid graph edge");
    }
    if (blocked.has(edge.id)) continue;
    adjacent.get(edge.a).push({ to: edge.b, edge });
    adjacent.get(edge.b).push({ to: edge.a, edge });
  }
  const distance = Object.fromEntries([...ids].map((id) => [id, Infinity]));
  const previous = {};
  const pending = new Set(ids);
  distance[source] = 0;
  while (pending.size) {
    const current = [...pending].reduce((best, id) => distance[id] < distance[best] ? id : best);
    if (!Number.isFinite(distance[current])) break;
    pending.delete(current);
    for (const { to, edge } of adjacent.get(current)) {
      const alternative = distance[current] + edge.length;
      if (alternative < distance[to]) {
        distance[to] = alternative;
        previous[to] = { node: current, edge: edge.id };
      }
    }
  }
  const routeTo = (target) => {
    if (!ids.has(target) || !Number.isFinite(distance[target])) return [];
    const path = [];
    let cursor = target;
    while (cursor !== source) {
      const step = previous[cursor];
      if (!step) return [];
      path.push(step.edge);
      cursor = step.node;
    }
    return path;
  };
  return { distance, routeTo };
}

export function serviceSummary(groups, distance, threshold) {
  if (!Number.isFinite(threshold) || threshold < 0) throw new Error("Invalid service threshold");
  const rows = groups.map((group) => {
    if (!Number.isFinite(group.population) || group.population < 0) throw new Error("Invalid population");
    const value = distance[group.node] ?? Infinity;
    return { ...group, distance: value, reachable: Number.isFinite(value), served: value <= threshold };
  });
  const inhabited = rows.filter((row) => row.population > 0);
  const population = inhabited.reduce((sum, row) => sum + row.population, 0);
  const allReachable = inhabited.every((row) => row.reachable);
  return {
    rows, population,
    mean: !population ? null : allReachable
      ? inhabited.reduce((sum, row) => sum + row.distance * row.population, 0) / population : Infinity,
    worst: inhabited.length ? Math.max(...inhabited.map((row) => row.distance)) : null,
    servedPopulation: inhabited.filter((row) => row.served).reduce((sum, row) => sum + row.population, 0),
    allServed: population > 0 && inhabited.every((row) => row.served),
  };
}
