export class Defender implements ICreepClass {
    name: string;
    creep: Creep;
    memory: CreepMemory;

    constructor(creep: Creep, memory: CreepMemory) {
        this.creep = creep;
        this.memory = memory;
        this._run();
    }

    /** Haupt‑Logik des Defenders */
    _run(): void {
        // Spawning: nichts tun
        if (this.creep.spawning) return;

        // 1. Ziel suchen: feindlichen Creep im aktuellen Raum (Baseraum oder remote)
        const hostile = this.creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS);
        if (hostile) {
            // Wenn Gegner gefunden, angreifen
            if (this.creep.attack(hostile) === ERR_NOT_IN_RANGE) {
                // Pathvisualisierung optional
                this.creep.travelTo(hostile);
            }
            return;
        }

        // 2. Patrouille: falls kein Gegner vorhanden,
        //    bewege dich zu einem Patrouillenpunkt aus Memory oder zu deiner Heimat
        const patrolPoints = Memory.patrol?.points as RoomPosition[] | undefined;
        if (patrolPoints && patrolPoints.length > 0) {
            // Den aktuellen Index aus der Creep‑Memory holen; Standard = 0
            const idx = (this.memory.patrolIndex ?? 0) % patrolPoints.length;
            const targetPos = patrolPoints[idx];
            // Erreichen des Patrouillenpunkts prüfen
            if (this.creep.pos.isEqualTo(targetPos)) {
                this.memory.patrolIndex = (idx + 1) % patrolPoints.length;
            } else {
                this.creep.travelTo(targetPos);
            }
        } else {
            // Fallback: zum Spawn zurückkehren
            const origin = this.memory.origin || this.creep.room.name;
            const spawn = Game.rooms[origin]?.find(FIND_MY_SPAWNS)[0];
            if (spawn) this.creep.travelTo(spawn);
        }
    }
}
