export const SENSING_CONFIG = Object.freeze({
  seed: "journey-sensing-v1", width: 960, height: 510,
  origin: { x: 250, y: 260 }, radius: 160,
  placements: { near: { x: 385, y: 240 }, far: { x: 735, y: 240 } },
});
export class SensingTrial {
  constructor(Simulation, placement) {
    if (!SENSING_CONFIG.placements[placement]) throw new Error("Unknown placement");
    this.placement = placement;
    this.firstSense = null;
    this.steps = 0;
    this.done = false;
    this.simulation = new Simulation({
      width: SENSING_CONFIG.width, height: SENSING_CONFIG.height,
      origin: SENSING_CONFIG.origin, seed: SENSING_CONFIG.seed,
      foods: [{ ...SENSING_CONFIG.placements[placement], id: "oat", radius: 20 }],
      foodSenseRadius: SENSING_CONFIG.radius, secondaryLinksEnabled: false, emitSensingEvents: true,
      tipCount: 10, maxTips: 22,
    });
  }
  advance(count = 1) {
    const steps = Math.min(240, Math.max(1, Math.floor(Number(count) || 1)));
    for (let i = 0; i < steps && !this.done; i += 1) {
      this.simulation.update(1 / 24);
      this.steps += 1;
      const sensed = this.simulation.drainEvents().find((event) => event.type === "sense");
      if (sensed) { this.firstSense = { ...sensed }; this.done = true; }
      if (this.steps >= 24 * 90) this.done = true;
    }
    return this.snapshot();
  }
  snapshot() {
    const snapshot = this.simulation.getSnapshot();
    return {
      placement: this.placement, time: snapshot.time, done: this.done, seed: snapshot.seed,
      firstSense: this.firstSense ? { ...this.firstSense } : null,
      foods: snapshot.foods.map((food) => ({ ...food })),
      tips: snapshot.tips.map((tip) => ({ ...tip })),
      edges: snapshot.edges.map((edge) => ({ ...edge })),
    };
  }
}
