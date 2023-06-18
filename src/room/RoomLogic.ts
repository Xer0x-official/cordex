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

		this._run();
		this._updateMemory();
	}

	_run() {
		this.ticks = Game.time;
		//this.getMemory(this.room, this.memory);

		if (Object.keys(Memory.colonies).length == 0) {
			//this.room.setupRoom();
			return;
		}

		// Setup room if it hasn't been set up yet
		if (this.ticks % 5 === 0) {
			new HandleSpawn(this.room, this.name);
		}

		/*
		if (this.ticks % 50 === 0) {
			this.fillRepairQueue();
		}

		if (this.ticks % 100 === 0) {
			this.getMyStructurs();
			//new RoomBuilder(this.room, this.memory);
		} */

		this._updateMemory();
	}

	_updateMemory() {
		this.room.memory = this.memory;
	}

	/* getMemory(room, memory) {
		this.room = room;
		this.name = this.room.name;
		this.memory = this.room.memory;
		this.fullMemory = memory;
		this.updateRoleCount();
	} */

	/* updateRoleCount() {
		let statistics = {
			miner: 0,
			transporter: 0,
			worker: 0,
			creepCount: 0,
			totalAvailableEnergy: this.getTotalAvailableEnergy(),
			sourceCount: this.memory.statistics.sourceCount,
		}

		//const creeps = Object.values(this.fullMemory.creeps);

		for (const key in Game.creeps) {
			if (!Game.creeps[key] || Game.creeps[key] === null) {
				delete Game.creeps[key];
				delete Memory.creeps[key];
			} else {
				statistics.creepCount++;
				switch (Game.creeps[key].memory.job) {
					case "miner":
						statistics.miner++;
						break;
					case "transporter":
						statistics.transporter++;
						break;
					case "worker":
						statistics.worker++;
						break;
				}
			}
		}

		this.memory.statistics = statistics;
	} */

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

	/* getMyStructurs() {
		this.myStructurs = [];

		_.forEach(this.room.find(FIND_STRUCTURES), structure => {
			this.myStructurs.push(structure.id);
		});
	} */

	/* fillRepairQueue() {
		let i = 0;
		let repairQueue = [];

		for (i = 0; i < this.room.colonieMemory.myStructurs.length; i++) {
			const structure: Structure | null = Game.getObjectById(this.room.colonieMemory.myStructurs[i]);
			if (!structure || structure === null) {
				continue;
			}

			if ((structure.hits < structure.hitsMax && structure.structureType !== STRUCTURE_WALL && structure.structureType !== STRUCTURE_RAMPART) ||
				(structure.hits < 15000 && (structure.structureType === STRUCTURE_RAMPART || structure.structureType === STRUCTURE_WALL))) {
					repairQueue.push(this.memory.myStructurs[i]);
			}
		}

		this.memory.repairQueue = repairQueue.sort((a,b) => a.hits - b.hits);
	} */

}
