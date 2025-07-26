export class DefenseCreepController {
	maxCreeps = 20;
	maxInvaderDefenders = 8;
	spawnQueue: colonieQueueElement[] = []; // TODO: Dies sollte auf Ihre aktuelle SpawnQueue verweisen
	invaderCoreDestroyTime = 500; // Ticks
	enegyAvailable: number;
	room: Room;

	constructor(room: Room) {
		this.room = room
	}

	public run(): void {
		if (Game.time % 3 !== 0) return; // Führe diesen Code alle 3 Ticks aus

		const hostiles = this.room.find(FIND_HOSTILE_CREEPS);
		const invaderCore: StructureInvaderCore[] = this.room.find(FIND_HOSTILE_STRUCTURES, {
			filter: s => s instanceof StructureInvaderCore
		});

		hostiles.forEach(creep => {
			this.addToSpawnQueue(this.getCounterCreepBody(creep), this.room.name, creep.id);
		});

		invaderCore.forEach((core: StructureInvaderCore) => {
			// Erstelle genügend Creeps, um den InvaderCore in unter 500 Ticks zu zerstören
			let requiredDamage = core.hits / this.invaderCoreDestroyTime;
			while (requiredDamage > 0) {
				let creepBody = this.getCounterCoreBody();
				requiredDamage -= (ATTACK_POWER * _.filter(creepBody, body => body === ATTACK).length) + (RANGED_ATTACK_POWER * _.filter(creepBody, body => body === RANGED_ATTACK).length); // TODO: adjust this according to the actual body you add
				this.addToSpawnQueue(creepBody, this.room.name, core.id);
			}
		});

	}

	private getCounterCreepBody(creep: Creep): BodyPartConstant[] {
		return [];
	}

	private getCounterCoreBody(): BodyPartConstant[] {
		// TODO: Implementiere die Logik, um den Creep-Körper basierend auf dem InvaderCore zu berechnen
		return [];
	}

	private addToSpawnQueue(body: BodyPartConstant[], roomName: string, targetId: Id<AnyCreep> | Id<StructureInvaderCore>): void {
		if (this.spawnQueue.length >= this.maxCreeps) return; // Wenn die max. Anzahl erreicht ist, füge keine weiteren Creeps hinzu

		this.spawnQueue.push({
			name: `defender_${roomName}_${Game.time}`,
			bodyParts: body,
			memory: {
				job: 'defender',
				working: false,
				target: targetId,
				task: '',
				origin: roomName,
			}
		});
	}
}
