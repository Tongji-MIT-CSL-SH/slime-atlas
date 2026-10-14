(() => {
  "use strict";

  const TAU = Math.PI * 2;

  class SeededRandom {
    constructor(seed) {
      this.state = normaliseSeed(seed) || 0x6d2b79f5;
    }

    next() {
      let value = this.state | 0;
      value ^= value << 13;
      value ^= value >>> 17;
      value ^= value << 5;
      this.state = value >>> 0;
      return this.state / 4294967296;
    }

    range(min, max) {
      return min + (max - min) * this.next();
    }

    sign() {
      return this.next() < 0.5 ? -1 : 1;
    }
  }

  class SlimeSimulation {
    constructor(options = {}) {
      this.width = options.width || 1000;
      this.height = options.height || 700;
      this.origin = { ...(options.origin || { x: 214, y: 438 }) };
      const configuredFoods = Array.isArray(options.foods) && options.foods.length
        ? options.foods
        : [options.food || { x: 806, y: 216, radius: 30 }];
      this.foods = configuredFoods.map((food, index) => ({ radius: 30, weight: 1, ...food, id: food.id ?? index }));
      this.food = this.foods[0];
      this.seed = normaliseSeed(options.seed ?? "tutorial-01");
      this.tipCount = options.tipCount || 10;
      this.maxTips = options.maxTips || 22;
      this.foodSenseRadius = Math.max(40, Number(options.foodSenseRadius) || 190);
      this.emitSensingEvents = Boolean(options.emitSensingEvents);
      this.secondaryLinksEnabled = options.secondaryLinksEnabled !== false && this.foods.length > 1;
      this.secondaryNeighborCount = clamp(Math.round(options.secondaryNeighborCount ?? 2), 1, 4);
      this.maxSecondaryLinks = Math.max(0, Math.round(options.maxSecondaryLinks ?? Math.ceil(this.foods.length * 0.6)));
      this.margin = options.margin || 46;
      this.requiresResourceAdjustment = Boolean(options.requiresResourceAdjustment);
      this.requiresDisruption = Boolean(options.requiresDisruption);
      this.obstacles = Array.isArray(options.obstacles)
        ? options.obstacles.map((item, index) => ({ id: item.id ?? ("obstacle-" + index), rx: 80, ry: 70, ...item }))
        : [];
      this.resistanceZones = Array.isArray(options.resistanceZones)
        ? options.resistanceZones.map((item, index) => ({ id: item.id ?? ("resistance-" + index), rx: 120, ry: 90, resistance: 1, ...item }))
        : [];
      this.hasEnvironmentConstraints = this.obstacles.length > 0 || this.resistanceZones.length > 0;
      this.initialFoodWeights = this.foods.map((food) => food.weight);
      this.fixedStep = 1 / 24;
      this.reset(this.seed);
    }

    reset(seed = this.seed) {
      this.seed = normaliseSeed(seed);
      this.random = new SeededRandom(this.seed);
      this.foods.forEach((food, index) => { food.weight = this.initialFoodWeights[index]; });
      this.state = "ready";
      this.time = 0;
      this.connectedAt = null;
      this.resourceAdjusted = false;
      this.adjustmentStartedAt = null;
      this.disrupted = false;
      this.cutEdgeId = null;
      this.cutPoint = null;
      this.reorganizationStartedAt = null;
      this.reorganizationMetrics = { connectivity: 100, recoveryTime: null };
      this.runtimeObstacles = [];
      this.connectedFoodIds = new Set();
      this.foodConnectionEdges = new Map();
      this.secondaryCandidates = [];
      this.secondaryPlanningComplete = !this.secondaryLinksEnabled;
      this.activeSecondaryLinkId = null;
      this.secondaryLinkStarted = false;
      this.secondarySourceFoodIndex = null;
      this.secondaryTargetFoodIndex = null;
      this.fusionComplete = !this.secondaryLinksEnabled;
      this.maxProductiveFlow = 0;
      this.reinforcement = 0;
      this.accumulator = 0;
      this.edges = [];
      this.tips = [];
      this.events = [];
      this.visited = new Set();
      this.branchEventSent = false;
      this.obstacleEventSent = false;
      this.routeEventSent = false;
      this.environmentMetrics = {
        pathLength: 0,
        weightedCost: 0,
        exposurePercent: 0,
        routeSide: null,
      };
      this.networkMetrics = {
        averageAccess: 0,
        foodDistances: [],
        retainedSecondaryLinks: 0,
        candidateSecondaryLinks: 0,
        cycleCount: 0,
        redundancyPercent: 0,
      };
      this.nextTipId = 0;
      this.recoveryGeneration = 0;
      this._createInitialTips();
      this._markVisited(this.origin.x, this.origin.y);
      return this.getSnapshot();
    }

    update(deltaSeconds) {
      const delta = clamp(Number(deltaSeconds) || 0, 0, 0.16);
      if (["complete", "awaiting-adjustment", "awaiting-disruption"].includes(this.state)) return this.getSnapshot();
      if (this.state === "ready") {
        this.state = "exploring";
        this._emit("wake");
      }

      this.accumulator += delta;
      while (this.accumulator >= this.fixedStep && this.state !== "complete") {
        this._fixedUpdate(this.fixedStep);
        this.accumulator -= this.fixedStep;
      }
      return this.getSnapshot();
    }

    drainEvents() {
      return this.events.splice(0, this.events.length);
    }

    getSnapshot() {
      const totalCells = Math.ceil(this.width / 32) * Math.ceil(this.height / 32);
      return {
        state: this.state,
        seed: this.seed,
        time: this.time,
        connected: this.connectedFoodIds.size === this.foods.length,
        connectedCount: this.connectedFoodIds.size,
        foodCount: this.foods.length,
        foods: this.foods.map((food, index) => ({ ...food, connected: this.connectedFoodIds.has(index) })),
        reinforcement: this.reinforcement,
        exploredPercent: this.state === "ready" ? 0 : Math.min(100, Math.round((this.visited.size / totalCells) * 100)),
        edges: this.edges,
        tips: (this.state === "exploring" || this.state === "linking") ? this.tips.filter((tip) => tip.active) : [],
        secondaryActive: this.secondaryCandidates.some((link) => link.status === "active"),
        fusionComplete: this.fusionComplete,
        secondaryLinks: this.secondaryCandidates.map((link) => ({ ...link })),
        maxProductiveFlow: this.maxProductiveFlow,
        requiresResourceAdjustment: this.requiresResourceAdjustment,
        requiresDisruption: this.requiresDisruption,
        resourceAdjusted: this.resourceAdjusted,
        disrupted: this.disrupted,
        canDisrupt: this.state === "awaiting-disruption",
        cutEdgeId: this.cutEdgeId,
        cutPoint: this.cutPoint ? { ...this.cutPoint } : null,
        runtimeObstacles: this.runtimeObstacles.map((item) => ({ ...item })),
        reorganizationMetrics: { ...this.reorganizationMetrics },
        canAdjustResources: ["awaiting-adjustment", "awaiting-disruption", "complete"].includes(this.state),
        hasEnvironmentConstraints: this.hasEnvironmentConstraints,
        environmentMetrics: { ...this.environmentMetrics },
        networkMetrics: { ...this.networkMetrics, foodDistances: [...this.networkMetrics.foodDistances] },
        nonProductiveOpacity: 1 - this.reinforcement * 0.82,
        productiveWidth: 4.2 + this.reinforcement * 7.2,
      };
    }

    _createInitialTips() {
      const offset = this.random.range(0, TAU);
      for (let index = 0; index < this.tipCount; index += 1) {
        const angle = offset + (index / this.tipCount) * TAU + this.random.range(-0.12, 0.12);
        const scout = index % 3 === 0;
        this.tips.push(this._makeTip(this.origin.x, this.origin.y, angle, -1, scout, null));
      }
    }

    _makeTip(x, y, angle, parentEdgeId, scout, targetFoodIndex = null, role = "explore", secondaryLinkId = null) {
      return {
        id: this.nextTipId++,
        x,
        y,
        angle,
        parentEdgeId,
        scout,
        targetFoodIndex,
        role,
        secondaryLinkId,
        active: true,
        age: 0,
        pathLength: 0,
        maxPath: scout ? 980 : this.random.range(330, 520),
        branches: 0,
        phase: this.random.range(0, TAU),
        speedScale: this.random.range(0.88, 1.12),
        turnRate: 0,
        wanderRate: this.random.range(-0.16, 0.16),
        avoidanceSide: null,
        avoidanceObstacleId: null,
        collisionStreak: 0,
      };
    }

    _fixedUpdate(step) {
      this.time += step;
      if (this.state === "exploring" || this.state === "linking") this._grow(step);
      else if (this.state === "connected") this._settle();
      else if (this.state === "adapting") this._adaptFlows(step);
    }

    _grow(step) {
      const currentTips = this.tips.filter((tip) => tip.active);
      for (const tip of currentTips) {
        if (this.state !== "exploring" && this.state !== "linking") break;
        if (!tip.active) continue;
        this._advanceTip(tip, step);
      }

      if (!this.branchEventSent && this.time >= 1.25) {
        this.branchEventSent = true;
        this._emit("branch");
      }

      if (this.state === "exploring" && !this.tips.some((tip) => tip.active)) {
        this._spawnRecoveryScouts();
      } else if (this.state === "linking" && !this.tips.some((tip) => tip.active && tip.role === "fusion")) {
        this._spawnSecondaryFront();
      }
    }

    _remainingFoodIndexes() {
      return this.foods.map((_, index) => index).filter((index) => !this.connectedFoodIds.has(index));
    }

    _targetForTip(tip) {
      if (tip.role === "fusion" && tip.targetFoodIndex !== null) {
        return { index: tip.targetFoodIndex, food: this.foods[tip.targetFoodIndex] };
      }
      const remaining = this._remainingFoodIndexes();
      if (!remaining.length) return null;
      if (tip.targetFoodIndex !== null && remaining.includes(tip.targetFoodIndex)) {
        return { index: tip.targetFoodIndex, food: this.foods[tip.targetFoodIndex] };
      }
      let targetIndex = remaining[0];
      let closest = Infinity;
      for (const foodIndex of remaining) {
        const food = this.foods[foodIndex];
        const distance = Math.hypot(food.x - tip.x, food.y - tip.y);
        if (distance < closest) {
          closest = distance;
          targetIndex = foodIndex;
        }
      }
      if (closest > this.foodSenseRadius) return null;
      tip.targetFoodIndex = targetIndex;
      if (this.emitSensingEvents) this._emit("sense", {
        tipId: tip.id, foodIndex: targetIndex, x: tip.x, y: tip.y,
        distance: closest, radius: this.foodSenseRadius,
      });
      return { index: targetIndex, food: this.foods[targetIndex] };
    }

    _spawnRecoveryScouts() {
      if (!this._remainingFoodIndexes().length) return;
      if (this.tips.some((tip) => tip.active && tip.role !== "fusion")) return;
      this.recoveryGeneration += 1;
      const count = Math.min(14, 6 + this.recoveryGeneration * 2);
      const offset = this.random.range(0, TAU) + this.recoveryGeneration * 2.399963229728653;
      const diagonal = Math.hypot(this.width, this.height);
      for (let index = 0; index < count; index += 1) {
        const angle = offset + (index / count) * TAU + this.random.range(-0.16, 0.16);
        const recovery = this._makeTip(
          this.origin.x,
          this.origin.y,
          angle,
          -1,
          true,
          null,
          "recovery",
        );
        recovery.maxPath = diagonal * 1.25;
        recovery.speedScale = 1.05;
        this.tips.push(recovery);
      }
    }
    _routeLength(edgeId) {
      let total = 0;
      for (const routeEdgeId of this._routeEdgeIds(edgeId)) {
        const edge = this.edges[routeEdgeId];
        if (!edge || edge.visible === false) continue;
        total += Math.hypot(edge.x2 - edge.x1, edge.y2 - edge.y1);
      }
      return total;
    }

    _connectionEstimate(sourceFoodIndex, targetFoodIndex) {
      const source = this.foods[sourceFoodIndex];
      const target = this.foods[targetFoodIndex];
      const distance = Math.hypot(target.x - source.x, target.y - source.y) || 1;
      let estimatedCost = this._estimatePolylineCost([source, target]);
      for (const obstacle of this._allObstacles()) {
        const directionX = target.x - source.x;
        const directionY = target.y - source.y;
        const directionLength = Math.hypot(directionX, directionY) || 1;
        const perpendicularX = -directionY / directionLength;
        const perpendicularY = directionX / directionLength;
        const perpendicularRadius = Math.hypot(obstacle.rx * perpendicularX, obstacle.ry * perpendicularY);
        const clearance = perpendicularRadius + 54;
        const plus = { x: obstacle.x + perpendicularX * clearance, y: obstacle.y + perpendicularY * clearance };
        const minus = { x: obstacle.x - perpendicularX * clearance, y: obstacle.y - perpendicularY * clearance };
        estimatedCost = Math.min(
          estimatedCost,
          this._estimatePolylineCost([source, plus, target]),
          this._estimatePolylineCost([source, minus, target]),
        );
      }
      return {
        distance,
        estimatedCost,
        environmentPenalty: clamp(estimatedCost / distance - 1, 0, 3),
      };
    }

    _prepareSecondaryCandidates() {
      if (this.secondaryPlanningComplete || this.connectedFoodIds.size !== this.foods.length) return;
      this.secondaryPlanningComplete = true;
      if (!this.secondaryLinksEnabled || this.maxSecondaryLinks === 0) {
        this.fusionComplete = true;
        return;
      }

      const diagonal = Math.hypot(this.width, this.height);
      const pairMap = new Map();
      const keyFor = (first, second) => `${Math.min(first, second)}:${Math.max(first, second)}`;
      for (let first = 0; first < this.foods.length; first += 1) {
        for (let second = first + 1; second < this.foods.length; second += 1) {
          const estimate = this._connectionEstimate(first, second);
          pairMap.set(keyFor(first, second), { first, second, ...estimate });
        }
      }

      const localPairs = new Set();
      for (let source = 0; source < this.foods.length; source += 1) {
        [...pairMap.values()]
          .filter((pair) => pair.first === source || pair.second === source)
          .sort((left, right) => left.estimatedCost - right.estimatedCost)
          .slice(0, Math.min(this.secondaryNeighborCount, this.foods.length - 1))
          .forEach((pair) => localPairs.add(keyFor(pair.first, pair.second)));
      }

      const routeLengths = this.foods.map((_, index) => this._routeLength(this.foodConnectionEdges.get(index)));
      const candidates = [...pairMap.values()].map((pair) => {
        const routeDetour = routeLengths[pair.first] + routeLengths[pair.second];
        const shortcutGain = routeDetour > 0 ? clamp((routeDetour - pair.estimatedCost) / routeDetour) : 0;
        const demand = clamp(((Number(this.foods[pair.first].weight) || 1) + (Number(this.foods[pair.second].weight) || 1)) / 6);
        const local = localPairs.has(keyFor(pair.first, pair.second));
        const distanceFitness = 1 - clamp(pair.estimatedCost / (diagonal * 0.72));
        const score = shortcutGain * 0.52 + demand * 0.22 + distanceFitness * 0.18 + this.random.range(-0.04, 0.04);
        return {
          id: `secondary-${pair.first}-${pair.second}`,
          sourceFoodIndex: pair.first,
          targetFoodIndex: pair.second,
          distance: pair.distance,
          estimatedCost: pair.estimatedCost,
          shortcutGain,
          demand,
          score,
          local,
          status: "rejected",
          reason: local ? "maintenance-budget" : "not-local-neighbor",
          attempts: 0,
          retained: false,
        };
      });

      const budget = diagonal * (0.28 + this.foods.length * 0.13);
      let spent = 0;
      let selected = 0;
      candidates
        .filter((candidate) => candidate.local && candidate.estimatedCost <= diagonal * 0.78)
        .sort((left, right) => right.score - left.score)
        .forEach((candidate) => {
          if (selected >= this.maxSecondaryLinks) return;
          if (selected > 0 && spent + candidate.estimatedCost > budget) return;
          candidate.status = "pending";
          candidate.reason = "competitive-candidate";
          selected += 1;
          spent += candidate.estimatedCost;
        });

      this.secondaryCandidates = candidates;
      this.secondaryLinkStarted = selected > 0;
      this.fusionComplete = selected === 0;
      this._emit("secondary-plan", {
        candidateCount: candidates.length,
        selectedCount: selected,
        candidates: candidates.map((candidate) => ({ ...candidate })),
      });
    }

    _startSecondaryLink() {
      this._prepareSecondaryCandidates();
      this._spawnSecondaryFront();
    }

    _failSecondaryFront(tip, reason) {
      const link = this.secondaryCandidates.find((candidate) => candidate.id === tip.secondaryLinkId);
      tip.active = false;
      if (!link) return;
      link.status = link.attempts < 2 ? "pending" : "failed";
      link.reason = link.status === "failed" ? reason : "retrying";
      this.activeSecondaryLinkId = null;
      if (link.status === "failed") this._emit("secondary-failed", { linkId: link.id, reason });
      this._spawnSecondaryFront();
    }

    _spawnSecondaryFront() {
      if (!this.secondaryPlanningComplete || this.fusionComplete) return;
      if (this.tips.some((tip) => tip.active && tip.role === "fusion")) return;
      let link = this.secondaryCandidates.find((candidate) => candidate.id === this.activeSecondaryLinkId && candidate.status === "active");
      if (!link) link = this.secondaryCandidates.find((candidate) => candidate.status === "pending");
      if (!link) {
        this.activeSecondaryLinkId = null;
        this.secondarySourceFoodIndex = null;
        this.secondaryTargetFoodIndex = null;
        this.fusionComplete = true;
        this._computeProductiveFlows();
        this._emit("secondary-complete", {
          retainedCount: this.secondaryCandidates.filter((candidate) => candidate.status === "complete").length,
        });
        if (this._networkReady()) this._beginSettlement();
        return;
      }

      const parentEdgeId = this.foodConnectionEdges.get(link.sourceFoodIndex);
      if (parentEdgeId === undefined) {
        link.status = "failed";
        link.reason = "missing-source-route";
        this._spawnSecondaryFront();
        return;
      }
      const source = this.foods[link.sourceFoodIndex];
      const target = this.foods[link.targetFoodIndex];
      const angle = Math.atan2(target.y - source.y, target.x - source.x);
      link.status = "active";
      link.attempts += 1;
      this.activeSecondaryLinkId = link.id;
      this.secondarySourceFoodIndex = link.sourceFoodIndex;
      this.secondaryTargetFoodIndex = link.targetFoodIndex;
      const tip = this._makeTip(
        source.x,
        source.y,
        angle + this.random.range(-0.11, 0.11),
        parentEdgeId,
        true,
        link.targetFoodIndex,
        "fusion",
        link.id,
      );
      tip.maxPath = Math.max(link.estimatedCost * 1.75, link.distance * 1.9);
      tip.speedScale = 1.08;
      this.tips.push(tip);
      this._emit("secondary", {
        linkId: link.id,
        sourceFoodIndex: link.sourceFoodIndex,
        targetFoodIndex: link.targetFoodIndex,
        score: link.score,
      });
    }
    _boundarySteering(tip) {
      const influence = 92;
      const left = clamp((this.margin + influence - tip.x) / influence);
      const right = clamp((tip.x - (this.width - this.margin - influence)) / influence);
      const top = clamp((this.margin + influence - tip.y) / influence);
      const bottom = clamp((tip.y - (this.height - this.margin - influence)) / influence);
      const steerX = left - right;
      const steerY = top - bottom;
      const strength = clamp(Math.hypot(steerX, steerY));
      if (strength < 0.001) return null;
      return { angle: Math.atan2(steerY, steerX), strength };
    }

    _pointInEllipse(x, y, area, scale = 1) {
      const rx = Math.max(1, (area.rx || 1) * scale);
      const ry = Math.max(1, (area.ry || 1) * scale);
      const dx = (x - area.x) / rx;
      const dy = (y - area.y) / ry;
      return dx * dx + dy * dy <= 1;
    }

    _resistanceAt(x, y) {
      let resistance = 0;
      for (const zone of this.resistanceZones) {
        if (!this._pointInEllipse(x, y, zone)) continue;
        resistance += Math.max(0, Number(zone.resistance) || 0);
      }
      return resistance;
    }

    _allObstacles() {
      return [...this.obstacles, ...this.runtimeObstacles];
    }

    _obstacleAt(x, y) {
      return this._allObstacles().find((obstacle) => this._pointInEllipse(x, y, obstacle, 1.02)) || null;
    }

    _estimatePolylineCost(points) {
      let total = 0;
      for (let index = 1; index < points.length; index += 1) {
        const from = points[index - 1];
        const to = points[index];
        const length = Math.hypot(to.x - from.x, to.y - from.y);
        const samples = Math.max(6, Math.ceil(length / 28));
        let resistance = 0;
        for (let sample = 1; sample <= samples; sample += 1) {
          const ratio = sample / samples;
          const x = from.x + (to.x - from.x) * ratio;
          const y = from.y + (to.y - from.y) * ratio;
          if (this._obstacleAt(x, y)) resistance += 100;
          resistance += this._resistanceAt(x, y);
        }
        total += length * (1 + resistance / samples);
      }
      return total;
    }

    _chooseAvoidanceSide(tip, targetFood, obstacle) {
      const start = { x: tip.x, y: tip.y };
      const target = { x: targetFood.x, y: targetFood.y };
      const directionX = target.x - start.x;
      const directionY = target.y - start.y;
      const directionLength = Math.hypot(directionX, directionY) || 1;
      const perpendicularX = -directionY / directionLength;
      const perpendicularY = directionX / directionLength;
      const perpendicularRadius = Math.hypot(obstacle.rx * perpendicularX, obstacle.ry * perpendicularY);
      const clearance = perpendicularRadius + 54;
      const plusWaypoint = {
        x: obstacle.x + perpendicularX * clearance,
        y: obstacle.y + perpendicularY * clearance,
      };
      const minusWaypoint = {
        x: obstacle.x - perpendicularX * clearance,
        y: obstacle.y - perpendicularY * clearance,
      };
      const plusCost = this._estimatePolylineCost([start, plusWaypoint, target]);
      const minusCost = this._estimatePolylineCost([start, minusWaypoint, target]);
      if (Math.abs(plusCost - minusCost) < 1) return this.random.sign();
      return plusCost < minusCost ? 1 : -1;
    }

    _environmentSteering(tip, targetFood) {
      let strongest = null;
      for (const obstacle of this._allObstacles()) {
        const targetX = targetFood.x - obstacle.x;
        const targetY = targetFood.y - obstacle.y;
        const targetLength = Math.hypot(targetX, targetY) || 1;
        const directionX = targetX / targetLength;
        const directionY = targetY / targetLength;
        const tipProjection = (tip.x - obstacle.x) * directionX + (tip.y - obstacle.y) * directionY;
        const forwardRadius = Math.hypot(obstacle.rx * directionX, obstacle.ry * directionY);
        if (tipProjection > forwardRadius * 1.16) continue;
        const dx = (tip.x - obstacle.x) / Math.max(1, obstacle.rx);
        const dy = (tip.y - obstacle.y) / Math.max(1, obstacle.ry);
        const scaledDistanceSquared = dx * dx + dy * dy;
        if (scaledDistanceSquared > 4.2) continue;

        if (tip.avoidanceObstacleId !== obstacle.id || tip.avoidanceSide === null) {
          tip.avoidanceObstacleId = obstacle.id;
          tip.avoidanceSide = this._chooseAvoidanceSide(tip, targetFood, obstacle);
        }

        const normalX = (tip.x - obstacle.x) / Math.max(1, obstacle.rx * obstacle.rx);
        const normalY = (tip.y - obstacle.y) / Math.max(1, obstacle.ry * obstacle.ry);
        const tangentX = tip.avoidanceSide * normalY;
        const tangentY = -tip.avoidanceSide * normalX;
        const tangentAngle = Math.atan2(tangentY, tangentX);
        const strength = clamp((4.2 - scaledDistanceSquared) / 3.2);
        if (!strongest || strength > strongest.strength) {
          strongest = { angle: tangentAngle, strength, obstacle };
        }

        if (!this.obstacleEventSent && scaledDistanceSquared < 2.8) {
          this.obstacleEventSent = true;
          this._emit("obstacle", { obstacleId: obstacle.id, preferredSide: tip.avoidanceSide < 0 ? "upper" : "lower" });
        }
      }

      if (strongest) return strongest;

      const lookAhead = 62;
      const leftAngle = tip.angle - 0.5;
      const rightAngle = tip.angle + 0.5;
      const leftCost = this._resistanceAt(tip.x + Math.cos(leftAngle) * lookAhead, tip.y + Math.sin(leftAngle) * lookAhead);
      const rightCost = this._resistanceAt(tip.x + Math.cos(rightAngle) * lookAhead, tip.y + Math.sin(rightAngle) * lookAhead);
      if (Math.abs(leftCost - rightCost) < 0.05) return null;
      const angle = leftCost < rightCost ? leftAngle : rightAngle;
      return { angle, strength: clamp(Math.abs(leftCost - rightCost) / 1.4), obstacle: null };
    }

    _computeEnvironmentMetrics() {
      const productiveEdges = this.edges.filter((edge) => edge.productive);
      let pathLength = 0;
      let weightedCost = 0;
      let exposedLength = 0;
      for (const edge of productiveEdges) {
        const length = Math.hypot(edge.x2 - edge.x1, edge.y2 - edge.y1);
        const resistance = Number(edge.environmentResistance) || 0;
        pathLength += length;
        weightedCost += length * (1 + resistance);
        if (resistance > 0.05) exposedLength += length;
      }

      let routeSide = null;
      const obstacle = this.obstacles[0];
      if (obstacle && pathLength > 0) {
        const nearby = productiveEdges.filter((edge) => {
          const midpointX = (edge.x1 + edge.x2) / 2;
          const midpointY = (edge.y1 + edge.y2) / 2;
          const dx = (midpointX - obstacle.x) / Math.max(1, obstacle.rx);
          const dy = (midpointY - obstacle.y) / Math.max(1, obstacle.ry);
          return dx * dx + dy * dy <= 3.2;
        });
        if (nearby.length) {
          const averageX = nearby.reduce((sum, edge) => sum + (edge.x1 + edge.x2) / 2, 0) / nearby.length;
          const averageY = nearby.reduce((sum, edge) => sum + (edge.y1 + edge.y2) / 2, 0) / nearby.length;
          const target = this.foods[0] || this.food;
          const horizontalRoute = Math.abs(target.x - this.origin.x) >= Math.abs(target.y - this.origin.y);
          routeSide = horizontalRoute
            ? averageY < obstacle.y ? "upper" : "lower"
            : averageX < obstacle.x ? "left" : "right";
        }
      }

      this.environmentMetrics = {
        pathLength,
        weightedCost,
        exposurePercent: pathLength > 0 ? (exposedLength / pathLength) * 100 : 0,
        routeSide,
      };
    }
    _advanceTip(tip, step) {
      tip.age += step;
      const target = this._targetForTip(tip);
      const guidanceTarget = target?.food || {
        x: tip.x + Math.cos(tip.angle) * this.foodSenseRadius,
        y: tip.y + Math.sin(tip.angle) * this.foodSenseRadius,
      };
      const dxFood = target ? target.food.x - tip.x : 0;
      const dyFood = target ? target.food.y - tip.y : 0;
      const distanceToFood = target ? Math.hypot(dxFood, dyFood) : Infinity;
      const foodAngle = target ? Math.atan2(dyFood, dxFood) : tip.angle;
      const closeness = target ? 1 - clamp(distanceToFood / this.foodSenseRadius) : 0;
      const isFusionTip = tip.role === "fusion";
      const isRecoveryTip = tip.role === "recovery";
      const attraction = isFusionTip
        ? 0.74 + closeness * 0.72
        : isRecoveryTip
          ? 0.72 + closeness * 0.78
          : tip.scout
            ? 0.46 + closeness * 0.68
            : 0.045 + closeness * closeness * 0.34;
      const attractionRate = target ? angleDifference(foodAngle, tip.angle) * attraction * 2.1 : 0;
      const wanderStrength = isFusionTip ? 0.24 : isRecoveryTip ? 0.28 : tip.scout ? 0.55 : 0.92;
      const wanderTarget = this.random.range(-1, 1) * wanderStrength;
      const wanderResponse = isFusionTip ? 2.8 : isRecoveryTip ? 3.1 : tip.scout ? 2.1 : 1.7;
      tip.wanderRate += (wanderTarget - tip.wanderRate) * clamp(step * wanderResponse);
      const coherentStrength = isFusionTip ? 0.2 : isRecoveryTip ? 0.26 : tip.scout ? 0.42 : 0.58;
      const coherentRate = Math.sin(this.time * 0.82 + tip.phase) * coherentStrength;
      let desiredTurnRate = attractionRate + tip.wanderRate + coherentRate;

      const environment = this._environmentSteering(tip, guidanceTarget);
      if (environment) {
        desiredTurnRate += angleDifference(environment.angle, tip.angle) * (1.8 + environment.strength * 5.4);
      }

      const boundary = this._boundarySteering(tip);
      if (boundary) {
        desiredTurnRate += angleDifference(boundary.angle, tip.angle) * (1.2 + boundary.strength * 3.2);
      }

      const maxTurnRate = isFusionTip ? 0.82 : isRecoveryTip ? 1.12 : tip.scout ? 1.05 : 1.38;
      desiredTurnRate = clamp(desiredTurnRate, -maxTurnRate, maxTurnRate);
      const turnResponse = isFusionTip ? 6 : isRecoveryTip ? 5.8 : tip.scout ? 5.2 : 4.4;
      tip.turnRate += (desiredTurnRate - tip.turnRate) * clamp(step * turnResponse);
      tip.angle += tip.turnRate * step;

      const pulse = 1 + Math.sin(this.time * 2.1 + tip.phase) * 0.08;
      const localResistance = this._resistanceAt(tip.x, tip.y);
      const distance = 75 * tip.speedScale * pulse * step / (1 + localResistance * 0.28);
      let nextX = tip.x + Math.cos(tip.angle) * distance;
      let nextY = tip.y + Math.sin(tip.angle) * distance;

      const collision = this._obstacleAt(nextX, nextY);
      if (collision) {
        tip.collisionStreak += 1;
        const steering = this._environmentSteering(tip, guidanceTarget);
        const normalX = (tip.x - collision.x) / Math.max(1, collision.rx * collision.rx);
        const normalY = (tip.y - collision.y) / Math.max(1, collision.ry * collision.ry);
        const normalLength = Math.hypot(normalX, normalY) || 1;
        const tangentAngle = steering?.angle ?? tip.angle + this.random.sign() * 0.42;
        const escapeX = Math.cos(tangentAngle) + (normalX / normalLength) * 0.82;
        const escapeY = Math.sin(tangentAngle) + (normalY / normalLength) * 0.82;
        const escapeAngle = Math.atan2(escapeY, escapeX);
        const collisionTurn = clamp(angleDifference(escapeAngle, tip.angle), -0.2, 0.2);
        tip.angle += collisionTurn;
        tip.turnRate = clamp(tip.turnRate + collisionTurn * 0.8, -1.12, 1.12);
        if (tip.collisionStreak > 48) {
          tip.avoidanceSide = tip.avoidanceSide === null ? this.random.sign() : -tip.avoidanceSide;
          if (tip.role === "fusion") this._failSecondaryFront(tip, "obstacle-stall");
          else tip.active = false;
        }
        return;
      }
      tip.collisionStreak = 0;

      if (nextX < this.margin || nextX > this.width - this.margin || nextY < this.margin || nextY > this.height - this.margin) {
        if (tip.role === "fusion") this._failSecondaryFront(tip, "boundary");
        else {
          tip.active = false;
          if (tip.scout) this._spawnRecoveryScouts();
        }
        return;
      }

      const edge = {
        id: this.edges.length,
        parentId: tip.parentEdgeId,
        x1: tip.x,
        y1: tip.y,
        x2: nextX,
        y2: nextY,
        productive: false,
        kind: tip.role,
        secondaryLinkId: tip.secondaryLinkId,
        environmentResistance: (this._resistanceAt(tip.x, tip.y) + this._resistanceAt(nextX, nextY)) / 2,
      };
      this.edges.push(edge);
      tip.parentEdgeId = edge.id;
      tip.x = nextX;
      tip.y = nextY;
      tip.pathLength += distance;
      this._markVisited(nextX, nextY);

      if (tip.role === "fusion") {
        const merge = this._findFusionTarget(tip);
        if (merge) {
          this._completeFusion(tip, tip.targetFoodIndex, merge);
          return;
        }
        const targetFood = this.foods[tip.targetFoodIndex];
        if (Math.hypot(targetFood.x - nextX, targetFood.y - nextY) <= (targetFood.radius || 30)) {
          this._completeFusion(tip, tip.targetFoodIndex, null);
          return;
        }
      } else {
        const reachedFoodIndex = this.foods.findIndex((food, foodIndex) => (
          !this.connectedFoodIds.has(foodIndex)
          && Math.hypot(food.x - nextX, food.y - nextY) <= (food.radius || 30)
        ));
        if (reachedFoodIndex >= 0) {
          this._connect(tip, reachedFoodIndex);
          return;
        }
      }

      if (tip.pathLength > tip.maxPath || tip.age > (tip.scout ? 15 : 8.5)) {
        if (tip.role === "fusion") this._failSecondaryFront(tip, "energy-budget");
        else tip.active = false;
        return;
      }

      const canBranch = tip.role !== "fusion" && tip.age > 0.85 && tip.age < 6.2 && tip.branches < 2 && this.tips.length < this.maxTips;
      if (canBranch && this.random.next() < 0.13 * step) {
        tip.branches += 1;
        const childAngle = tip.angle + this.random.sign() * this.random.range(0.42, 0.92);
        const child = this._makeTip(tip.x, tip.y, childAngle, tip.parentEdgeId, false, tip.targetFoodIndex);
        this.tips.push(child);
      }
    }

    _routeEdgeIds(edgeId) {
      const ids = [];
      let currentId = edgeId;
      while (currentId >= 0) {
        const edge = this.edges[currentId];
        if (!edge) break;
        ids.push(currentId);
        currentId = edge.parentId;
      }
      return ids;
    }

    _findFusionTarget(tip) {
      if (tip.role !== "fusion" || tip.age < 0.55) return null;
      const targetRouteEnd = this.foodConnectionEdges.get(tip.targetFoodIndex);
      if (targetRouteEnd === undefined) return null;
      let best = null;
      for (const edgeId of this._routeEdgeIds(targetRouteEnd)) {
        const edge = this.edges[edgeId];
        if (!edge) continue;
        const dx = edge.x2 - edge.x1;
        const dy = edge.y2 - edge.y1;
        const lengthSquared = dx * dx + dy * dy || 1;
        const projection = clamp(((tip.x - edge.x1) * dx + (tip.y - edge.y1) * dy) / lengthSquared);
        const x = edge.x1 + dx * projection;
        const y = edge.y1 + dy * projection;
        const distance = Math.hypot(tip.x - x, tip.y - y);
        if (!best || distance < best.distance) best = { edgeId, x, y, distance };
      }
      return best && best.distance <= 15 ? best : null;
    }

    _markProductiveRoute(edgeId) {
      let currentId = edgeId;
      while (currentId >= 0) {
        const edge = this.edges[currentId];
        if (!edge) break;
        edge.productive = true;
        currentId = edge.parentId;
      }
    }

    _buildNetworkGraph(weighted = false) {
      const adjacency = new Map();
      const productive = this.edges.filter((edge) => edge.productive && edge.visible !== false);
      const productiveIds = new Set(productive.map((edge) => edge.id));
      const addNode = (node) => { if (!adjacency.has(node)) adjacency.set(node, []); };
      const addArc = (from, to, cost, edgeId = null, fraction = 1) => {
        addNode(from);
        addNode(to);
        const safeCost = Math.max(0, Number(cost) || 0);
        adjacency.get(from).push({ to, cost: safeCost, edgeId, fraction });
        adjacency.get(to).push({ to: from, cost: safeCost, edgeId, fraction });
      };
      addNode("origin");

      for (const edge of productive) {
        const length = Math.hypot(edge.x2 - edge.x1, edge.y2 - edge.y1);
        const resistance = weighted ? Math.max(0, Number(edge.environmentResistance) || 0) : 0;
        addArc(`edge-${edge.id}-start`, `edge-${edge.id}-end`, length * (1 + resistance), edge.id, 1);
      }

      for (const edge of productive) {
        const startNode = `edge-${edge.id}-start`;
        const endNode = `edge-${edge.id}-end`;
        if (edge.parentId >= 0) {
          if (productiveIds.has(edge.parentId)) addArc(startNode, `edge-${edge.parentId}-end`, 0);
        } else {
          addArc(startNode, "origin", Math.hypot(edge.x1 - this.origin.x, edge.y1 - this.origin.y));
        }
        if (edge.mergeTargetEdgeId === null || edge.mergeTargetEdgeId === undefined || !productiveIds.has(edge.mergeTargetEdgeId)) continue;
        const target = this.edges[edge.mergeTargetEdgeId];
        const dx = target.x2 - target.x1;
        const dy = target.y2 - target.y1;
        const lengthSquared = dx * dx + dy * dy || 1;
        const projection = clamp(((edge.x2 - target.x1) * dx + (edge.y2 - target.y1) * dy) / lengthSquared);
        const targetLength = Math.hypot(dx, dy);
        const targetResistance = weighted ? Math.max(0, Number(target.environmentResistance) || 0) : 0;
        const targetCost = targetLength * (1 + targetResistance);
        addArc(endNode, `edge-${target.id}-start`, targetCost * projection, target.id, projection);
        addArc(endNode, `edge-${target.id}-end`, targetCost * (1 - projection), target.id, 1 - projection);
      }

      const terminals = new Map();
      for (const [foodIndex, edgeId] of this.foodConnectionEdges.entries()) {
        if (productiveIds.has(edgeId)) terminals.set(foodIndex, `edge-${edgeId}-end`);
      }
      return { adjacency, terminals };
    }

    _shortestNetworkPath(graph, targetNode, excludedEdgeId = null) {
      if (!targetNode || !graph.adjacency.has(targetNode)) return { distance: Infinity, arcs: [] };
      const distances = new Map([["origin", 0]]);
      const previous = new Map();
      const queue = [{ node: "origin", distance: 0 }];
      const visited = new Set();
      while (queue.length) {
        let bestIndex = 0;
        for (let index = 1; index < queue.length; index += 1) {
          if (queue[index].distance < queue[bestIndex].distance) bestIndex = index;
        }
        const current = queue.splice(bestIndex, 1)[0];
        if (visited.has(current.node)) continue;
        visited.add(current.node);
        if (current.node === targetNode) break;
        for (const arc of graph.adjacency.get(current.node) || []) {
          if (arc.edgeId !== null && arc.edgeId === excludedEdgeId) continue;
          const nextDistance = current.distance + arc.cost;
          if (nextDistance >= (distances.get(arc.to) ?? Infinity)) continue;
          distances.set(arc.to, nextDistance);
          previous.set(arc.to, { node: current.node, arc });
          queue.push({ node: arc.to, distance: nextDistance });
        }
      }
      if (!distances.has(targetNode)) return { distance: Infinity, arcs: [] };
      const arcs = [];
      let node = targetNode;
      while (node !== "origin") {
        const step = previous.get(node);
        if (!step) break;
        arcs.push(step.arc);
        node = step.node;
      }
      arcs.reverse();
      return { distance: distances.get(targetNode), arcs };
    }

    _computeProductiveFlows(preserveDisplay = false) {
      for (const edge of this.edges) {
        edge.flow = 0;
        edge.flowSources = [];
      }

      const graph = this._buildNetworkGraph(false);
      const foodDistances = [];
      const primaryPaths = [];
      for (const foodIndex of this.connectedFoodIds) {
        const targetNode = graph.terminals.get(foodIndex);
        const path = this._shortestNetworkPath(graph, targetNode);
        const weight = Math.max(0.1, Number(this.foods[foodIndex].weight) || 1);
        foodDistances[foodIndex] = Number.isFinite(path.distance) ? path.distance : 0;
        primaryPaths[foodIndex] = path;
        const usedEdges = new Set();
        for (const arc of path.arcs) {
          if (arc.edgeId === null || usedEdges.has(arc.edgeId)) continue;
          const edge = this.edges[arc.edgeId];
          if (!edge?.productive || edge.visible === false) continue;
          usedEdges.add(arc.edgeId);
          edge.flow += weight;
          edge.flowSources.push(String(foodIndex));
        }
      }

      const completeLinks = this.secondaryCandidates.filter((candidate) => candidate.status === "complete");
      for (const link of completeLinks) {
        const linkEdges = this.edges.filter((edge) => edge.productive && edge.secondaryLinkId === link.id && edge.visible !== false);
        const actualLength = linkEdges.reduce((total, edge) => total + Math.hypot(edge.x2 - edge.x1, edge.y2 - edge.y1), 0);
        const activeFlow = linkEdges.reduce((maximum, edge) => Math.max(maximum, edge.flow), 0);
        const reserveFlow = Math.min(
          Number(this.foods[link.sourceFoodIndex]?.weight) || 1,
          Number(this.foods[link.targetFoodIndex]?.weight) || 1,
        ) * (0.2 + link.shortcutGain * 0.32);
        if (activeFlow < 0.05) {
          for (const edge of linkEdges) {
            edge.flow += reserveFlow;
            edge.flowSources.push(`reserve-${link.id}`);
          }
        }
        link.actualLength = actualLength;
        link.flow = Math.max(activeFlow, reserveFlow);
        link.retained = linkEdges.length > 0 && link.flow >= 0.12;
        link.reason = activeFlow >= 0.05 ? "shortest-path-flow" : "redundancy-reserve";
      }

      const retainedLinks = completeLinks.filter((link) => link.retained);
      const cycleCount = this._computeCycleRank();
      const averageAccess = foodDistances.length
        ? foodDistances.reduce((total, distance) => total + (Number(distance) || 0), 0) / this.connectedFoodIds.size
        : 0;
      this.networkMetrics = {
        averageAccess,
        foodDistances,
        retainedSecondaryLinks: retainedLinks.length,
        candidateSecondaryLinks: this.secondaryCandidates.filter((candidate) => candidate.local).length,
        cycleCount,
        redundancyPercent: this.foods.length > 1 ? clamp((cycleCount / Math.max(1, this.foods.length - 1)) * 100, 0, 100) : 0,
      };

      this.maxProductiveFlow = 0;
      for (const edge of this.edges) {
        if (!edge.productive || edge.visible === false) continue;
        edge.flowSources.sort();
        edge.flowKey = edge.flowSources.join("+") || "inactive";
        this.maxProductiveFlow = Math.max(this.maxProductiveFlow, edge.flow);
        edge.flowClass = edge.flow >= 1.6 ? "high" : edge.flow >= 0.7 ? "medium" : "low";
        if (!preserveDisplay || !Number.isFinite(edge.displayFlow)) edge.displayFlow = edge.flow;
      }
      this._computeEnvironmentMetrics();
    }

    _computeCycleRank() {
      const productive = this.edges.filter((edge) => edge.productive && edge.visible !== false);
      if (!productive.length) return 0;
      const productiveIds = new Set(productive.map((edge) => edge.id));
      const parent = new Map();
      const find = (node) => {
        if (!parent.has(node)) parent.set(node, node);
        let root = node;
        while (parent.get(root) !== root) root = parent.get(root);
        while (parent.get(node) !== node) {
          const next = parent.get(node);
          parent.set(node, root);
          node = next;
        }
        return root;
      };
      const union = (left, right) => {
        const leftRoot = find(left);
        const rightRoot = find(right);
        if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot);
      };

      for (const edge of productive) {
        find(`edge-${edge.id}-start`);
        find(`edge-${edge.id}-end`);
      }
      for (const edge of productive) {
        const start = `edge-${edge.id}-start`;
        const end = `edge-${edge.id}-end`;
        if (edge.parentId >= 0 && productiveIds.has(edge.parentId)) {
          union(start, `edge-${edge.parentId}-end`);
        } else if (edge.parentId < 0) {
          union(start, "origin");
        }
        if (edge.mergeTargetEdgeId !== null
          && edge.mergeTargetEdgeId !== undefined
          && productiveIds.has(edge.mergeTargetEdgeId)) {
          union(end, `edge-${edge.mergeTargetEdgeId}-end`);
        }
      }

      const roots = new Set([...parent.keys()].map((node) => find(node)));
      const adjacency = new Map([...roots].map((root) => [root, new Set()]));
      for (const edge of productive) {
        const startRoot = find(`edge-${edge.id}-start`);
        const endRoot = find(`edge-${edge.id}-end`);
        adjacency.get(startRoot).add(endRoot);
        adjacency.get(endRoot).add(startRoot);
      }
      let components = 0;
      const visited = new Set();
      for (const root of roots) {
        if (visited.has(root)) continue;
        components += 1;
        const stack = [root];
        while (stack.length) {
          const current = stack.pop();
          if (visited.has(current)) continue;
          visited.add(current);
          for (const next of adjacency.get(current) || []) {
            if (!visited.has(next)) stack.push(next);
          }
        }
      }
      return Math.max(0, productive.length - roots.size + components);
    }
    cutProductiveEdge(edgeId) {
      if (!this.requiresDisruption || this.state !== "awaiting-disruption") return false;
      const cutEdge = this.edges[Number(edgeId)];
      if (!cutEdge?.productive || cutEdge.visible === false) return false;

      let referenceRoute = null;
      for (const routeEnd of this.foodConnectionEdges.values()) {
        const route = this._routeEdgeIds(routeEnd);
        if (route.includes(cutEdge.id)) {
          referenceRoute = route;
          break;
        }
      }
      if (!referenceRoute) return false;
      const referenceCutIndex = referenceRoute.indexOf(cutEdge.id);
      if (referenceCutIndex < 5 || referenceCutIndex > referenceRoute.length - 6) return false;
      const candidateCutPoint = {
        x: (cutEdge.x1 + cutEdge.x2) / 2,
        y: (cutEdge.y1 + cutEdge.y2) / 2,
      };
      if (Math.hypot(candidateCutPoint.x - this.origin.x, candidateCutPoint.y - this.origin.y) < 105) return false;
      if (this.foods.some((food) => Math.hypot(candidateCutPoint.x - food.x, candidateCutPoint.y - food.y) < 82)) return false;

      cutEdge.productive = false;
      cutEdge.visible = false;
      cutEdge.cut = true;
      this.cutEdgeId = cutEdge.id;
      this.cutPoint = candidateCutPoint;

      this.runtimeObstacles = [{
        id: "cut-damage",
        x: this.cutPoint.x,
        y: this.cutPoint.y,
        rx: 48,
        ry: 42,
        runtime: true,
      }];
      this.disrupted = true;
      this.reorganizationStartedAt = this.time;
      this.tips.forEach((tip) => { tip.active = false; });
      this.reinforcement = 0.46;
      this._computeProductiveFlows(true);

      const graph = this._buildNetworkGraph(false);
      const disconnectedFoods = [...this.connectedFoodIds].filter((foodIndex) => {
        const targetNode = graph.terminals.get(foodIndex);
        return !Number.isFinite(this._shortestNetworkPath(graph, targetNode).distance);
      });
      this._emit("disruption", {
        edgeId: cutEdge.id,
        foodIndexes: [...disconnectedFoods],
        cutPoint: { ...this.cutPoint },
      });

      if (!disconnectedFoods.length) {
        this.reorganizationMetrics = { connectivity: 100, recoveryTime: 0 };
        this.adjustmentStartedAt = this.time;
        this.state = "adapting";
        this._emit("rerouted", { edgeId: cutEdge.id, recoveryTime: 0 });
        return true;
      }

      for (const foodIndex of disconnectedFoods) {
        const routeEnd = this.foodConnectionEdges.get(foodIndex);
        const route = this._routeEdgeIds(routeEnd);
        const cutIndex = route.indexOf(cutEdge.id);
        if (cutIndex < 0) continue;
        const downstreamIds = route.slice(0, cutIndex);
        for (const routeEdgeId of downstreamIds) {
          const routeEdge = this.edges[routeEdgeId];
          if (!routeEdge || routeEdge.secondaryLinkId) continue;
          routeEdge.productive = false;
          routeEdge.orphaned = true;
        }
        const upstreamIndex = Math.min(route.length - 1, cutIndex + 22);
        const upstreamEdge = this.edges[route[upstreamIndex]];
        const food = this.foods[foodIndex];
        if (!upstreamEdge || !food) continue;
        this.connectedFoodIds.delete(foodIndex);
        this.foodConnectionEdges.delete(foodIndex);
        const recoveryAngle = Math.atan2(food.y - upstreamEdge.y2, food.x - upstreamEdge.x2);
        const recovery = this._makeTip(
          upstreamEdge.x2,
          upstreamEdge.y2,
          recoveryAngle + this.random.range(-0.08, 0.08),
          upstreamEdge.id,
          true,
          foodIndex,
          "recovery",
        );
        recovery.maxPath = Math.hypot(food.x - upstreamEdge.x2, food.y - upstreamEdge.y2) * 2.15;
        recovery.speedScale = 1.04;
        this.tips.push(recovery);
        this._emit("recovery", { foodIndex });
      }
      this.reorganizationMetrics = {
        connectivity: (this.connectedFoodIds.size / this.foods.length) * 100,
        recoveryTime: null,
      };
      this._computeProductiveFlows(true);
      this.state = "exploring";
      return true;
    }
    setFoodWeight(foodIndex, nextWeight) {
      const canAdjust = ["awaiting-adjustment", "awaiting-disruption", "complete"].includes(this.state);
      if (!canAdjust) return false;
      const food = this.foods[foodIndex];
      if (!food) return false;
      const weight = clamp(Math.round(Number(nextWeight) || food.weight), 1, 3);
      if (weight === food.weight) return false;
      const previousWeight = food.weight;
      food.weight = weight;
      this.resourceAdjusted = true;
      this.adjustmentStartedAt = this.time;
      this.state = "adapting";
      this._computeProductiveFlows(true);
      this._emit("resource", { foodIndex, previousWeight, nextWeight: weight });
      return true;
    }

    _adaptFlows(step) {
      let maximumDifference = 0;
      for (const edge of this.edges) {
        if (!edge.productive) continue;
        if (!Number.isFinite(edge.displayFlow)) edge.displayFlow = edge.flow;
        edge.displayFlow += (edge.flow - edge.displayFlow) * clamp(step * 1.55);
        maximumDifference = Math.max(maximumDifference, Math.abs(edge.flow - edge.displayFlow));
      }

      const elapsed = this.time - this.adjustmentStartedAt;
      if ((elapsed >= 1.6 && maximumDifference < 0.02) || elapsed >= 3.4) {
        for (const edge of this.edges) {
          if (edge.productive) edge.displayFlow = edge.flow;
        }
        this._emit("adapted");
        if (this.requiresDisruption && !this.disrupted) {
          this.state = "awaiting-disruption";
          this._emit("disruption-ready");
        } else {
          this.state = "complete";
          this._emit("complete");
        }
      }
    }

    _networkReady() {
      return this.connectedFoodIds.size === this.foods.length && this.fusionComplete;
    }

    _beginSettlement() {
      this.connectedAt = this.time;
      this.state = "connected";
      this.tips.forEach((activeTip) => { activeTip.active = false; });
    }

    _completeFusion(tip, targetFoodIndex, merge) {
      const link = this.secondaryCandidates.find((candidate) => candidate.id === tip.secondaryLinkId);
      if (!link || link.status !== "active") return;
      const targetFood = this.foods[targetFoodIndex];
      // 融合尖端有两种抵达方式：
      //   (a) 贴到目标路线的中途(merge != null) —— 已经带着 edgeId，能并进图里；
      //   (b) 直接走进目标食物本体(merge == null) —— 原本硬编码 edgeId:null，于是
      //       _buildNetworkGraph 直接 continue、不加任何弧：管子画出来了，拓扑上却是死胡同。
      //       这正是"次级连接从不闭环"的根因 —— cycleCount/redundancyPercent 因此全是编的，
      //       "剪断→经备用链接瞬时改道"也永远不可达。
      // 修法：(b) 情况下并入该食物自己那条已有路线的末端。两条边本就终止于同一点，
      //       只是图里缺少节点同一性。若目标食物尚未连通，则这根融合边本身就是它的首次连接，
      //       此时不该产生环 —— edgeId 保持 null 是正确的。
      let endpoint = merge;
      if (!endpoint) {
        const targetRouteEdgeId = this.foodConnectionEdges.get(targetFoodIndex);
        const targetRouteEdge = targetRouteEdgeId === undefined ? null : this.edges[targetRouteEdgeId];
        endpoint = {
          x: targetFood.x,
          y: targetFood.y,
          edgeId: (targetRouteEdge && targetRouteEdge.productive) ? targetRouteEdgeId : null,
        };
      }
      const finalEdge = {
        id: this.edges.length,
        parentId: tip.parentEdgeId,
        x1: tip.x,
        y1: tip.y,
        x2: endpoint.x,
        y2: endpoint.y,
        productive: true,
        kind: "fusion",
        secondaryLinkId: link.id,
        sourceFoodIndex: link.sourceFoodIndex,
        targetFoodIndex: link.targetFoodIndex,
        mergeTargetEdgeId: endpoint.edgeId,
        environmentResistance: (this._resistanceAt(tip.x, tip.y) + this._resistanceAt(endpoint.x, endpoint.y)) / 2,
      };
      this.edges.push(finalEdge);
      this._markProductiveRoute(finalEdge.id);

      if (!this.connectedFoodIds.has(targetFoodIndex)) {
        this.connectedFoodIds.add(targetFoodIndex);
        this.foodConnectionEdges.set(targetFoodIndex, finalEdge.id);
        this._emit("food", {
          foodIndex: targetFoodIndex,
          connectedCount: this.connectedFoodIds.size,
          foodCount: this.foods.length,
        });
      }

      link.status = "complete";
      link.reason = "connected-awaiting-flow";
      link.mergeTargetEdgeId = endpoint.edgeId;
      link.completedAt = this.time;
      this.activeSecondaryLinkId = null;
      tip.active = false;
      this._computeProductiveFlows();
      this._emit("fusion", {
        linkId: link.id,
        sourceFoodIndex: link.sourceFoodIndex,
        targetFoodIndex: link.targetFoodIndex,
        mergeTargetEdgeId: endpoint.edgeId,
      });
      this._spawnSecondaryFront();
    }
    _connect(tip, foodIndex) {
      if (this.connectedFoodIds.has(foodIndex)) return;
      const food = this.foods[foodIndex];
      const finalEdge = {
        id: this.edges.length,
        parentId: tip.parentEdgeId,
        x1: tip.x,
        y1: tip.y,
        x2: food.x,
        y2: food.y,
        productive: true,
        kind: tip.role,
      };
      this.edges.push(finalEdge);
      this._markProductiveRoute(finalEdge.id);
      this.foodConnectionEdges.set(foodIndex, finalEdge.id);

      this.connectedFoodIds.add(foodIndex);
      this._computeProductiveFlows();
      tip.active = false;
      this._emit("food", {
        foodIndex,
        connectedCount: this.connectedFoodIds.size,
        foodCount: this.foods.length,
      });
      if (this.disrupted && this.reorganizationMetrics.recoveryTime === null) {
        const connectivity = (this.connectedFoodIds.size / this.foods.length) * 100;
        if (this.connectedFoodIds.size === this.foods.length) {
          const recoveryTime = Math.max(0, this.time - this.reorganizationStartedAt);
          this.reorganizationMetrics = { connectivity: 100, recoveryTime };
          this._emit("reconnected", { foodIndex, recoveryTime });
        } else {
          this.reorganizationMetrics = { connectivity, recoveryTime: null };
        }
      }
      if (this.hasEnvironmentConstraints && !this.routeEventSent && this.environmentMetrics.routeSide) {
        this.routeEventSent = true;
        this._emit("route", { ...this.environmentMetrics });
      }
      this._startSecondaryLink(foodIndex);

      if (this._networkReady()) {
        this._beginSettlement();
      } else if (this.connectedFoodIds.size === this.foods.length) {
        this.state = "linking";
        this.tips.forEach((activeTip) => {
          if (activeTip.role !== "fusion") activeTip.active = false;
        });
        this._spawnSecondaryFront();
      } else {
        this._spawnRecoveryScouts();
      }
    }

    _settle() {
      this.reinforcement = clamp((this.time - this.connectedAt) / 2.8);
      if (this.reinforcement < 1) return;
      if (this.requiresResourceAdjustment && !this.resourceAdjusted) {
        this.state = "awaiting-adjustment";
        this._emit("adjustment-ready");
      } else if (this.requiresDisruption && !this.disrupted) {
        this.state = "awaiting-disruption";
        this._emit("disruption-ready");
      } else {
        this.state = "complete";
        this._emit("complete");
      }
    }

    _markVisited(x, y) {
      const column = Math.floor(x / 32);
      const row = Math.floor(y / 32);
      [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([offsetX, offsetY]) => {
        const nextColumn = column + offsetX;
        const nextRow = row + offsetY;
        if (nextColumn < 0 || nextRow < 0) return;
        if (nextColumn >= Math.ceil(this.width / 32) || nextRow >= Math.ceil(this.height / 32)) return;
        this.visited.add(`${nextColumn}:${nextRow}`);
      });
    }

    _emit(type, detail = {}) {
      this.events.push({ type, time: this.time, ...detail });
    }
  }

  function normaliseSeed(value) {
    if (Number.isFinite(value)) return Number(value) >>> 0;
    const text = String(value ?? "slime-city");
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function angleDifference(target, current) {
    return Math.atan2(Math.sin(target - current), Math.cos(target - current));
  }

  function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
  }

  window.SlimeCityCore = Object.freeze({ SlimeSimulation });
})();
