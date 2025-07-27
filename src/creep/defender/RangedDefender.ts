export class RangedDefender implements ICreepClass {
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

        // Gegner in Reichweite finden (bis 3 Felder)
        const hostile = this.creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (hostile) {
            // kiten: Distanz halten und schießen
            if (this.creep.pos.getRangeTo(hostile) <= 3) {
                this.creep.rangedAttack(hostile);
                // Rückzug wenn Gegner zu nah (<2)
                if (this.creep.pos.getRangeTo(hostile) <= 2) {
                    // Versuche ein Feld weg zu gehenH
                    this.creep.travelTo(hostile, { range: 3 });
                }
            } else {
                // Außer Reichweite: annähern
                this.creep.travelTo(hostile);
            }
            return;
        }

        // kein Gegner: Patrouillenlogik wie beim Nahkämpfer
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
