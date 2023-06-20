
export class Scout implements ICreepClass {
	creep: Creep;
	name: string;
	memory: CreepMemory;
	_updateMemory?: Function | undefined;

	constructor(creep: Creep, memory: CreepMemory) {
		this.creep = creep;
		this.name = this.creep.name;
		this.memory = memory;

		this._run();
	}

	_run() {
		if (!this.memory.scoutingTargets) {
			this.memory.scoutingTargets = _.remove(this.creep.room.getAdjacentRooms(), room => {
				let route = Game.map.findRoute(this.creep.room, room);
				if (route !== ERR_NO_PATH) {
					let range = route.length
					let alreadyScouted = Object.keys(this.creep.room.colonieMemory.remotes).includes(room);
					return range <= 3 && !alreadyScouted;
				}
				return false;
			});
		}

		if (this.memory.scoutingTargets && this.memory.target === null) {
			const targets = this.memory.scoutingTargets.sort((a: string, b: string) => {
				const distA = Game.map.getRoomLinearDistance(this.creep.room.name, a);
				const distB = Game.map.getRoomLinearDistance(this.creep.room.name, b);
				return distA - distB;
			});

			this.memory.target = targets[0];
		}

		this.memory.routing = this.creep.memory.routing;
		this.creep.memory = this.memory;
		this.getToScoutingRoom()
	}

	getToScoutingRoom() {
		const roomName = this.creep.room.name;

		if (this.memory.scoutingTargets.includes(roomName)) {
			this.creep.room.setupRoom(true, this.memory.origin);
			this.memory.scoutingTargets.splice(this.memory.scoutingTargets.indexOf(roomName), 1)
			if (roomName === this.creep.memory.target) {
				this.creep.memory.target = null;
			}
			console.log(`SCOUT: Room ${roomName} found.`);
		}

		if (this.memory.target && this.memory.target !== null) {
			let targetPosition = new RoomPosition(25, 25, this.memory.target.toString());
			let err = this.creep.moveToTarget(ERR_NOT_IN_RANGE, { pos: targetPosition });
			Game.map.visual.line(this.creep.pos, targetPosition, { color: '#ff0000', lineStyle: 'dashed' });
		}


		// Game.rooms['W5N8'].spawnQueue.push({ bodyParts: [MOVE], name: `scout_W5N8_${Game.time}`, memory: { job: "scout", working: false, target: null, origin: 'W5N8', task: '', lastPositions: [], pathToTarget: []}});
		// Game.creep[''].moveTo(new RoomPosition(10, 10, 'W3N5'))
	}
}
