import { HandleSpawn } from "./HandleSpawn";

export class RoomLogic implements IRoomLogic, IBaseRoomClass {
	room: Room;
	name: string;
	ticks: number;
	memory: RoomMemory;

	constructor(room: Room, name: string) {
		this.room = room;
		this.name = name;
		this.memory = _.cloneDeep(this.room.memory);
		this.ticks = Game.time;

		this._run();
		this._updateMemory();
	}

	_run() {
		if (Object.keys(Memory.colonies).length == 0) {
			this.room.setupRoom(false, this.name);
			this._updateMemory();
			return;
		}

		this.updateRoleCount();

		// Setup room if it hasn't been set up yet
		if (this.ticks % 5 === 0) {
			new HandleSpawn(this.room, this.name);
		}

		if (this.ticks % 50 === 0) {
			this.fillRepairQueue();
		}

		if (this.ticks % 100 === 0) {
			this.getMyStructurs();
			//new RoomBuilder(this.room, this.memory);
		}

		this._updateMemory();
	}

	_updateMemory() {
		this.room.memory = this.memory;
	}

	// TODO Funktion aus dem Room Object rausnehmen in ein eigenes Object
	updateRoleCount() {
		let roles: IColonieStatsRoles = {
			miner: 0,
			transporter: 0,
			worker: 0,
			scouter: 0,
		}
		let stats: IColonieStats = {
			resourceCount: Object.keys(this.room.colonieMemory.resources.energy).length,
			creepsCount: 0,
			roles: roles,
			totalAvailableEnergy: this.getTotalAvailableEnergy(),
		}

		for (const key in Memory.creeps) {
			if (!Game.creeps[key] || Game.creeps[key] === null) {
				delete Game.creeps[key];
				delete Memory.creeps[key];
				continue;
			}

			stats.creepsCount++;
			switch (Game.creeps[key].memory.job) {
				case "miner":
					stats.roles.miner++;
					break;
				case "transporter":
					stats.roles.transporter++;
					break;
				case "worker":
					stats.roles.worker++;
					break;
				case "scout":
					stats.roles.scouter++;
					break;
			}
		}

		this.room.colonieMemory.stats = stats;
	}

	getTotalAvailableEnergy() {
		let energy = 0;

		const containingEnergy: {
			dropped: Resource<RESOURCE_ENERGY>[],
			container: StructureContainer[],
			storage: StructureStorage[],
			link: StructureLink[],
			terminal: StructureTerminal[],
		} = {
			'dropped': this.room.find(FIND_DROPPED_RESOURCES, {
				filter: resource => resource.resourceType === RESOURCE_ENERGY
			}),
			'container': [],
			'storage': [],
			'link': [],
			'terminal': [],
		};
		const allStructures = this.room.find(FIND_STRUCTURES);

		allStructures.forEach((structure: Structure) => {
			if (structure.structureType === STRUCTURE_CONTAINER && (structure as StructureContainer).store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
				containingEnergy['container'].push(structure as StructureContainer);
			} else if (structure.structureType === STRUCTURE_STORAGE && (structure as StructureStorage).store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
				containingEnergy['storage'].push(structure as StructureStorage);
			} else if (structure.structureType === STRUCTURE_LINK && (structure as StructureStorage).store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
				containingEnergy['link'].push(structure as StructureLink);
			} else if (structure.structureType === STRUCTURE_TERMINAL && (structure as StructureTerminal).store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
				containingEnergy['terminal'].push(structure as StructureTerminal);
			}
		});

		for (const value of Object.values(containingEnergy)) {
			for (const obj of value) {
				if ("store" in obj)
					energy += (obj as StructureContainer | StructureStorage | StructureLink | StructureTerminal).store.getUsedCapacity(RESOURCE_ENERGY);
				else
					energy += (obj as Resource<"energy">).amount;
			}
		}

		for (const queue of this.room.buildQueue) {
			if (queue.cost) {
				energy -= queue.cost;
			}
		}

		return Math.max(0, energy);
	}

	getMyStructurs() {
		_.forEach(this.room.find(FIND_STRUCTURES), (structure: Structure) => {
			this.room.colonieMemory.myStructurs.push(structure.id);
		});
	}

	fillRepairQueue() {
		let i = 0;
		let repairQueue: colonieQueueElement[] = [];

		for (i = 0; i < this.room.colonieMemory.myStructurs.length; i++) {
			const structure: Structure | null = Game.getObjectById(this.room.colonieMemory.myStructurs[i] as Id<Structure>);
			if (!structure || structure === null) {
				continue;
			}

			if ((structure.hits < structure.hitsMax && structure.structureType !== STRUCTURE_WALL && structure.structureType !== STRUCTURE_RAMPART) ||
				(structure.hits < 15000 && (structure.structureType === STRUCTURE_RAMPART || structure.structureType === STRUCTURE_WALL))) {
				repairQueue.push({
					name: `repair_${this.name}_${this.ticks + i}`,
					id: this.room.colonieMemory.myStructurs[i],
				});
			}
		}

		this.room.repairQueue = repairQueue.sort((a, b) => {
			let structureA = Game.getObjectById(a.id as Id<Structure>);
			let structureB = Game.getObjectById(b.id as Id<Structure>);
			if (!structureA) { return -1; }
			else if (!structureB) { return 1; }
			return structureA.hits - structureB.hits
		});
	}

}
