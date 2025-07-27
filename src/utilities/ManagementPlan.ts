/**
 * This file contains helper functions and examples showing how to integrate
 * a more intelligent construction and worker management system into the
 * existing cordex code base.  The goal is to reduce the number of
 * simultaneously open construction sites, better prioritise build tasks
 * based on controller level (RCL) and available energy, spawn an
 * appropriate number of worker creeps per project, and improve energy
 * acquisition for workers.
 *
 * To adopt these changes you should:
 *
 *  - Import the helpers where needed (e.g. in HandleSpawn and Worker
 *    logic).
 *  - Replace simple heuristics with calls to the provided functions.
 *  - Adjust the constants below to suit your own play style.
 */

/** Maximum concurrent building projects per room.  Keep this small so
 * that your creeps finish important structures quickly instead of
 * scattering energy across many unfinished sites.  You can scale this
 * with controller level or available energy if desired. */
export const MAX_ACTIVE_BUILD_PROJECTS = 2;

/** Energy thresholds used to decide whether to accept more building
 * projects.  These are ratios of total available energy (including
 * dropped, container and storage) relative to the cost of pending
 * projects.  If the room’s energy would dip below this fraction after
 * starting a new project, it is deferred. */
export const BUILD_ENERGY_THRESHOLD = 0.5;

/** Determine whether the room should create a new construction project.
 * Returns true if the number of active projects is below
 * MAX_ACTIVE_BUILD_PROJECTS and there is enough free energy to cover the
 * expected cost.  You can call this before pushing new entries onto
 * `room.buildQueue` in `RoomBuilder.buildStructure()`. */
export function canScheduleNewProject(room: Room): boolean {
    const activeProjects = room.buildQueue.filter(q => q.structures && q.structures.length > 0);
    if (activeProjects.length >= MAX_ACTIVE_BUILD_PROJECTS) return false;
    const pendingCost = activeProjects.reduce((sum, q) => sum + (q.cost || 0), 0);
    const available = room.stats.totalAvailableEnergy;
    return available * BUILD_ENERGY_THRESHOLD > pendingCost;
}

/**
 * Compute the maximum number of workers that can effectively build at a
 * target.  For normal construction sites, eight creeps can work in
 * parallel because there are eight surrounding tiles; for controllers
 * only five positions are in range of upgrade.  If there are walls or
 * terrain blocking positions, this function returns a lower number.
 *
 * @param pos Position of the structure or construction site
 * @param isController true if the target is a controller upgrade
 */
export function maxWorkersForTarget(pos: RoomPosition, isController: boolean): number {
    // Maximum positions allowed by game rules
    const hardMax = isController ? 5 : 8;
    let free = 0;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const x = pos.x + dx;
            const y = pos.y + dy;
            if (x < 0 || x > 49 || y < 0 || y > 49) continue;
            const terrain = Game.map.getRoomTerrain(pos.roomName);
            if (terrain.get(x, y) !== TERRAIN_MASK_WALL) free++;
        }
    }
    return Math.min(free, hardMax);
}

/**
 * Suggest a balanced worker body composition for building/upgrading.  It
 * allocates as many WORK parts as possible, followed by a few CARRY and
 * MOVE parts to keep the creep mobile and able to accept energy.  The
 * ratios are tuned so that creeps move at normal speed on roads and
 * carry just enough energy for continuous building.
 *
 * @param availableEnergy Amount of energy available for spawning
 */
export function getBuilderBody(availableEnergy: number): BodyPartConstant[] {
    // Ensure a minimum of 200 energy for WORK + CARRY + MOVE
    let energy = Math.max(availableEnergy, 200);
    const body: BodyPartConstant[] = [];
    // Reserve one CARRY and one MOVE initially
    if (energy >= 100) {
        body.push(CARRY);
        body.push(MOVE);
        energy -= 100;
    }
    // Fill with as many WORK/CARRY pairs as possible while maintaining
    // a MOVE roughly every two parts.  This yields 2/3 move ratio on
    // roads and 1/2 elsewhere.
    let workParts = 0;
    let carryParts = 1;
    let moveParts = 1;
    while (energy >= 100) {
        // Add WORK part if there is energy; each costs 100
        body.push(WORK);
        workParts++;
        energy -= 100;
        // Add CARRY if enough energy and fewer carry than work/3
        if (energy >= 50 && carryParts < Math.ceil(workParts / 3)) {
            body.push(CARRY);
            carryParts++;
            energy -= 50;
        }
        // Add MOVE every two parts to maintain speed
        if (energy >= 50 && moveParts < Math.ceil((workParts + carryParts) / 2)) {
            body.push(MOVE);
            moveParts++;
            energy -= 50;
        }
    }
    return body;
}

/**
 * Find the best energy source for a worker.  This function orders
 * possible sources by preference: dropped energy within a short range,
 * then nearby containers/storage, and finally remote sources if the
 * previous categories are empty.  It returns the id of the target or
 * undefined if none found.  You should store the return value in
 * `creep.memory.energyTarget`.
 *
 * Example usage in Workerv3:
 * ```ts
 * const targetId = findEnergyTarget(this.creep);
 * if (targetId) this.creep.memory.energyTarget = targetId;
 * else { /* no energy available, consider recycling */ /* }
 * ```
 */
export function findEnergyTarget(creep: Creep):
    Id<StructureContainer | StructureStorage | Resource | StructureLink | StructureTerminal> | null | undefined {
    const room = creep.room;
    // 1. Dropped energy within 6 tiles
    const dropped = room.find(FIND_DROPPED_RESOURCES, {
        filter: r => r.resourceType === RESOURCE_ENERGY && r.amount >= creep.store.getCapacity() / 2
    });
    if (dropped.length > 0) {
        const closest = creep.pos.findClosestByPath(dropped);
        return closest?.id;
    }
    // 2. Containers/storage with energy
    const targets: (StructureContainer | StructureStorage | StructureLink | StructureTerminal)[] = [];
    const structures = room.find(FIND_STRUCTURES);
    for (const s of structures) {
        if ('store' in s && s.store.getUsedCapacity(RESOURCE_ENERGY) > 50) {
            targets.push(s as any);
        }
    }
    if (targets.length > 0) {
        const closest = creep.pos.findClosestByPath(targets);
        return closest?.id;
    }
    // 3. Fallback to harvesting a source in this room
    // const sources = room.find(FIND_SOURCES_ACTIVE);
    // if (sources.length > 0) {
    //     const closest = creep.pos.findClosestByPath(sources);
    //     return closest?.id;
    // }
    // No energy found
    return undefined;
}

/**
 * Determine how many worker creeps should be spawned for a given build
 * project.  The calculation takes into account the total cost of the
 * project (i.e. total build progress remaining), the number of WORK
 * parts a typical worker will carry, and the number of positions where
 * workers can stand.  This prevents spawning more workers than can
 * physically build simultaneously.
 *
 * @param project The build queue entry from room.buildQueue
 * @param room    The room in which the project exists
 */
export function workersNeededForProject(project: buildQueueElement, room: Room): number {
    if (!project || !project.cost || project.cost <= 0) return 0;
    // Determine free positions for the first structure in the project
    const first = project.structures[0];
    const pos = first.pos;
    const isController = !!project.name.match(/controller/);
    const maxPositions = maxWorkersForTarget(pos, isController);
    // Estimate how much work one creep can do per 1000 ticks
    const energyCapacity = room.energyCapacityAvailable;
    const parts = getBuilderBody(energyCapacity);
    const workCount = parts.filter(p => p === WORK).length;
    const workPerTick = isController ? workCount : workCount * 5;
    // Simplify: one tick per part; one thousand ticks per full lifespan of builder
    const ticks = 1000;
    const workload = workPerTick * ticks;
    const creepCount = Math.ceil((project.cost as number) / workload);
    return Math.min(creepCount, maxPositions);
}