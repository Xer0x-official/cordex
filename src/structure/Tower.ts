
export class Tower implements ITower, IBaseRoomClass {
	room: Room;
	name: string;
	structureType: StructureConstant;
	tower: StructureTower

	constructor (room: Room, name: string, structureType: StructureConstant = STRUCTURE_TOWER, tower: StructureTower) {
		this.room = room;
		this.name = name;
		this.tower = tower;
		this.structureType = structureType;

		this._run();
	}

	_run() {
		let enemies: Creep[] = [];
		let target: Structure | null = null;
		let targets: colonieQueueElement[] = [];
		let i = 0;
		let err = 0;

        enemies = this.room.find(FIND_HOSTILE_CREEPS);
        if (enemies.length > 0) {
            // Heiler oder am nächsten zur Steuerung
            const target = _.min(enemies, (c) => {
                // Heiler höher priorisieren (negativ = höhere Priorität)
                const healParts = c.body.filter(p => p.type === HEAL).length;
                return healParts > 0 ? -healParts : c.pos.getRangeTo(this.tower);
            });
            this.tower.attack(target);
            return;
        }

		if (this.room.repairQueue.length > 0) {
			targets = this.room.repairQueue;

			for (i = 0; i < targets.length; i++) {
				if (this.tower.id !== targets[i].id) {
					target = Game.getObjectById(targets[i].id as Id<Structure>);
					break;
				}
			}

			if (!target) {
				return;
			}

			err = this.tower.repair(target);

			if (err === ERR_INVALID_TARGET || target.hits === target.hitsMax) {
				this.room.repairQueue.splice(this.room.repairQueue.indexOf(targets[i]), 1);
			}
		}
	}

	_updateMemory() {

	}
}
