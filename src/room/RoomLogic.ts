import { HandleSpawn } from "./HandleSpawn";
import { RoomBuilder } from "./RoomBuilder";

export class RoomLogic implements IRoomLogic, IBaseRoomClass {
	room: Room;
	name: string;
	ticks: number;
	memory: RoomMemory;
    visual: RoomVisual;

	constructor(room: Room, name: string) {
		this.room = room;
		this.name = name;
		this.memory = _.cloneDeep(this.room.memory);
		this.ticks = Game.time;
        this.visual = new RoomVisual(room.name);

		this._run();
		this._updateMemory();
	}

	_run() {
		if (this.memory.isSetup && this.name !== this.room.colonieMemory.base) {
			return;
		}

		if (Object.keys(Memory.colonies).length == 0) {
			this.room.setupRoom(false, this.name);
			this.memory.isSetup = this.room.memory.isSetup;
			this.memory.origin = this.room.memory.origin;
            this.memory.buildingPlan = this.room.memory.buildingPlan;
			return;
		}

        if (this.memory.buildingPlan !== undefined) {
            this.memory.buildingPlan.forEach((build: IPlannedStructure) => {
                this.visual.structure(build.position.x, build.position.y, build.type, {opacity: 0.5});
            })
        }

        // if (this.room.buildingMatrix !== undefined) {
        //     for (let y = 0; y < 50; y++) {
        //         for (let x = 0; x < 50; x++) {
        //             let number = this.room.buildingMatrix.get(x, y);
        //             if (number > 0) {
        //                 this.visual.circle(x, y);
        //             }
        //         }
        //     }
        // }

		if (this.ticks < 100 || true) {
			this.room.distanceTransform(true);
		}

        if (this.ticks % 5 === 0) { // alle 5 Ticks prüfen
            const hostiles = this.room.find(FIND_HOSTILE_CREEPS);
            if (hostiles.length > 0) {
                // Prüfen, ob bereits ein Verteidiger in Spawn‑Queue steht
                const hasDefenderQueued = this.room.spawnQueue.some(e => e.memory?.job === 'defender');
                if (!hasDefenderQueued) {
                    const name = `defender_${this.room.name}_${Game.time}`;
                    this.room.spawnQueue.push({
                        bodyParts: [], // wird von getBodyParts() generiert
                        name: name,
                        memory: {
                            job: 'defender',
                            origin: this.room.name,
                            working: false,
                            target: null,
                            task: '',
                            lastPositions: [],
                            pathToTarget: [],
                            amountAssigned: 0
                        }
                    });
                }
            }
        }

		this._loadMemoryStatsForTick();

		this.room.colonieMemory.spawns.forEach(spawnId => {
			const spawn = Game.getObjectById(spawnId);
			const freePositions = spawn?.pos.getFreePositions(1, false);

			if (spawn && freePositions && freePositions.length <= 0) {
				spawn.pos.pushCreepsAway();
			}
		})

		 // Setup room if it hasn't been set up yet
		if (this.ticks % 5 === 0) {
			new HandleSpawn(this.room, this.name, this.memory);
		}

		if (this.ticks % 50 === 0) {
			this.fillRepairQueue();
		}

		if (this.ticks % 90 === 0) {
			this.getMyStructurs();
			new RoomBuilder(this.room, this.name, this.memory);
		}

		this._updateMemory();
	}

	_updateMemory() {
		this.memory.scouted = this.room.memory.scouted;
		this.room.memory = this.memory;
	}

	// TODO Funktion aus dem Room Object rausnehmen in ein eigenes Object
	_loadMemoryStatsForTick() {
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

		for (const key in this.room.colonieMemory.resources.dropped.energy) {
			this.room.colonieMemory.resources.dropped.energy[key as Id<Resource>].transporterCount = 0;
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
				case "transporter": {
					stats.roles.transporter++;
					const energyTarget = Game.creeps[key].memory.energyTarget as Id<Resource>;

					if (this.room.colonieMemory.resources.dropped.energy[energyTarget]) {
						this.room.colonieMemory.resources.dropped.energy[energyTarget].transporterCount++;
					}
					break;
				}

				case "worker":
					stats.roles.worker++;
					break;
				case "scout":
					stats.roles.scouter++;
					break;
			}
		}

		this.room.colonieMemory.stats = stats;

		const containingEnergy: IDroppedResourceMemory = {
			energy: {},
			minerals: {},
		};
		const roomNames = _.cloneDeep(this.room.colonieMemory.remotes);
		if (!roomNames.includes(this.memory.origin)) {
			roomNames.push(this.memory.origin);
		}

		roomNames.forEach((roomName: string) => {
			const room = Game.rooms[roomName];
			if (room) {
				const droppedResources = room.find(FIND_DROPPED_RESOURCES);

				droppedResources.forEach((resource: Resource) => {
					if (resource instanceof Resource && !this.room.colonieMemory.resources.dropped.energy[resource.id]) {
						this.room.colonieMemory.resources.dropped.energy[resource.id] = {pos: resource.pos, transporterCount: 0};
					} else if (resource instanceof Mineral && !this.room.colonieMemory.resources.dropped.minerals[resource.id]) {
						this.room.colonieMemory.resources.dropped.minerals[resource.id] = {pos: resource.pos, transporterCount: 0};
					}
				})
			}
		});

		Object.keys(this.room.colonieMemory.resources.dropped.energy).forEach((resource) => {
			if (!Game.getObjectById(resource as Id<Resource>)) {
				delete this.room.colonieMemory.resources.dropped.energy[resource as Id<Resource>];
			}
		});

		Object.keys(this.room.colonieMemory.resources.dropped.minerals).forEach((mineral) => {
			if (!Game.getObjectById(mineral as Id<Mineral>)) {
				delete this.room.colonieMemory.resources.dropped.minerals[mineral as Id<Mineral>];
			}
		});

	}

	getTotalAvailableEnergy() {
		let energy = 0;

		const containingEnergy: {
			dropped: Resource[],
			container: StructureContainer[],
			storage: StructureStorage[],
			link: StructureLink[],
			terminal: StructureTerminal[],
		} = {
			'dropped': [],
			'container': [],
			'storage': [],
			'link': [],
			'terminal': [],
		};
		const allStructures = this.room.find(FIND_STRUCTURES);

		Object.keys(this.room.colonieMemory.resources.dropped.energy).forEach((resourceId) => {
			let resource = Game.getObjectById(resourceId as Id<Resource>);
			if (resource) {
				containingEnergy['dropped'].push(resource)
			}
		})

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
				if ('store' in obj)
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
			if (!this.room.colonieMemory.myStructurs.includes(structure.id)) {
				this.room.colonieMemory.myStructurs.push(structure.id);
			}
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
