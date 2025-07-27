export class Healer implements ICreepClass {
    name: string;
    creep: Creep;
    memory: CreepMemory;

    constructor(creep: Creep, memory: CreepMemory) {
        this.creep = creep;
        this.memory = memory;
        this._run();
    }

    _run(): void {
        if (this.creep.spawning) return;

        // Heilen von verwundeten Alliierten (inkl. sich selbst)
        const injured = this.creep.pos.findClosestByPath(FIND_MY_CREEPS, {
            filter: (c) => c.hits < c.hitsMax,
        });
        if (injured) {
            if (this.creep.heal(injured) === ERR_NOT_IN_RANGE) {
                this.creep.travelTo(injured);
            }
            return;
        }

        // Kein Verwundeter -> folge deinem Squad‑Leader oder patrouilliere
        const leaderId = this.memory.leader as Id<Creep> | undefined;
        if (leaderId) {
            const leader = Game.getObjectById(leaderId);
            if (leader) {
                // hinter dem Leader bleiben
                if (this.creep.pos.getRangeTo(leader) > 1) {
                    this.creep.travelTo(leader);
                }
                return;
            }
        }

        // Fallback: patrouillieren
        const patrol = Memory.patrol?.points as RoomPosition[] | undefined;
        if (patrol && patrol.length > 0) {
            const idx = (this.memory.patrolIndex ?? 0) % patrol.length;
            const pos = patrol[idx];
            if (this.creep.pos.isEqualTo(pos)) {
                this.memory.patrolIndex = (idx + 1) % patrol.length;
            } else {
                this.creep.travelTo(pos);
            }
        }
    }
}
