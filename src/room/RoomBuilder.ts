const utils = require('../utils');

export class RoomBuilder implements IBaseRoomClass {

room: Room;
	name: string
	memory: RoomMemory;
	rcl: number;
	spawn: StructureSpawn;
	controllerUpgradeThreshhold: number;
	//CONTROLLER_LEVELS


	constructor(room: Room, name: string, memory: RoomMemory) {
		this.room = room;
		this.memory = memory;
		this.rcl = this.room.controller?.level as number;
		this.spawn = Game.getObjectById(this.room.spawns[0]) as StructureSpawn;
		this.controllerUpgradeThreshhold = CONTROLLER_LEVELS[this.rcl] * (0.1 - (this.rcl / 100));

		this._run();
	}

	_run() {
		switch (this.rcl) {
			case 8:
				break;
			case 7:
				break;
			case 6:
				this.buildStructure('extensionPacks_3');
				this.buildStructure('extensionPacks_4');
			case 5:
				this.buildStructure('extensionPacks_1');
				this.buildStructure('extensionPacks_2');
			case 4:
				this.buildStructure('powerBunker');
			case 3:
				this.buildStructure('tower');
			case 2:
				this.buildStructure('bunker', this.spawn.pos);
			default:
				this.buildPaths();
				this.buildController();
				break;
		}

		this.checkBuildProgress();
	}

	_updateMemory() {

	}

	buildStructure(name: string, positionInit: RoomPosition | undefined = undefined): void {
		if (!this.isBuildAlreadyInQueue(name)) {
			const baseExtensions = this.room.baseExtensions;
			let extension = undefined;
			let constructionErr = 0;
			let structuresToDelete = [];
			let i = 0;

			if (name.includes('extensionPack')) {
				const pack = parseInt(name.slice(-1), 10);
				name = 'extensionPack';
				extension = baseExtensions['extensionPacks'][pack];
			} else {
				extension = baseExtensions[name];
			}

			const position = positionInit || new RoomPosition(extension.x - 2, extension.y - 2, this.room.name);
			const project = this.room.buildBlueprint(position, name);

			if (project.structures.length > 0 && project.cost > 0) {
				console.log(`ROOM: Tried to add buildingProject ${project.name} with ${project.cost} costs`);

				for (let i = project.structures.length -1; i >= 0; i--) {
					let lookForStuctures = _.filter(this.room.lookForAt(LOOK_STRUCTURES, project.structures[i].pos), structure =>
						structure.structureType != project.structures[i].type
					);
					let lookConstructionSite = _.filter(this.room.lookForAt(LOOK_CONSTRUCTION_SITES, project.structures[i].pos), constructionSite =>
						constructionSite.structureType != project.structures[i].type
					);
					_.forEach(lookForStuctures, structure => {
						structure.destroy();
					});

					_.forEach(lookConstructionSite, constructionSite => {
						constructionSite.remove();
					});


					constructionErr = this.room.createConstructionSite(project.structures[i].pos.x, project.structures[i].pos.y, project.structures[i].type as BuildableStructureConstant);

					/* if (constructionErr !== OK) {
						project.structures.splice(i, 1);
					} */
				}

				if (project.structures.length > 0) {
					this.room.buildQueue.push(project);

				}
			}
		}
	}

	buildController() {
		if (!this.isBuildAlreadyInQueue('controller') && (this.room.controller && this.room.controller.ticksToDowngrade < 500 || this.room.stats.totalAvailableEnergy > this.controllerUpgradeThreshhold)) {
			let controllerUpgradeCost = (Math.floor(this.room.stats.totalAvailableEnergy / this.controllerUpgradeThreshhold) * this.controllerUpgradeThreshhold) * 0.75;
			controllerUpgradeCost = controllerUpgradeCost > (CONTROLLER_LEVELS[this.rcl] * 0.25) ? (CONTROLLER_LEVELS[this.rcl] * 0.25) : controllerUpgradeCost;
			console.log(`ROOM: Tried to add buildingProject controller_${Game.time} with ${controllerUpgradeCost} costs`);
			this.room.buildQueue.push({ name: `controller_${Game.time}`, cost: controllerUpgradeCost, structures: [{pos: this.room.controller?.pos, type: this.room.controller } as buildBlueprintBuildElement], neededCreeps: -1 });
		}
	}

	checkBuildProgress() {
		for (let i = 0; i < this.room.buildQueue.length; i++) {
			if ( (this.room.buildQueue[i].cost as number) <= 0 || (this.room.buildQueue[i].structures as buildBlueprintBuildElement[]).length <= 0 ) {
				const creepsWithTask = _.filter(Game.creeps, creep => creep.memory.task != null && creep.memory.task == this.room.buildQueue[i].name);

				if (this.room.buildQueue.length <= 1) {
					this.room.spawnQueue = _.remove(this.room.spawnQueue, creepSpawn => {
						return creepSpawn.memory && creepSpawn.memory.task === this.room.buildQueue[i].name;

					});
				} else {
					this.room.spawnQueue = _.transform(this.room.spawnQueue, function(result: colonieQueueElement[], creepSpawn) {
						if (creepSpawn.memory && creepSpawn.memory.task === this.room.buildQueue[i].name) {
							creepSpawn.memory.task = '';
						}
						result.push(creepSpawn);
						return true;
					  }, []);
				}

				this.room.buildQueue = this.room.buildQueue.splice(i + 1, 1);
			}
		}
	}

	isBuildAlreadyInQueue(name: string) {
		return _.some(this.room.buildQueue, project => project.name.includes(name));
	}

	buildPaths(baseName?: string) {
		// return { name: `${name}_${Game.time}`, cost: costs.cost, structures: structureList, neededCreeps: neededCreeps };
		const buildData: colonieQueueElement = { name: `paths_${Game.time}`, cost: 0, structures: [], neededCreeps: -1 };
		let energy = this.room.memory.statistics.totalAvailableEnergy;
		let roomPaths = utils.utils.getElementsByPattern(this.room.colonieMemory.paths, `${this.room.name}_.*`)
		_.remove(roomPaths, function (path: IColoniePath) {
			return path.built;
		});
		let i = 0, j = 0;

		for (i = 0; i < roomPaths.length; i++) {
			for (j = 0; j < roomPaths[i].path.length; j++) {
				let structursAt = this.room.lookForAt(LOOK_STRUCTURES, roomPaths[i].path[j].x, roomPaths[i].path[j].y);
				_.remove(structursAt, function (structure) {
					return structure.structureType == STRUCTURE_ROAD;
				});
				let constructionSitesAt = this.room.lookForAt(LOOK_CONSTRUCTION_SITES, roomPaths[i].path[j].x, roomPaths[i].path[j].y);

				if (structursAt.length > 0 || constructionSitesAt.length > 0) {
					continue;
				} else if (buildData.cost && buildData.structures) {
					if (buildData.cost + 300 > energy) {
						this.room.buildQueue.push(buildData);
						return;
					}
					buildData.cost += 300;
					buildData.structures.push({ pos: new RoomPosition(roomPaths[i].path[j].x, roomPaths[i].path[j].y, roomPaths[i].path[j].roomName), type: STRUCTURE_ROAD });
					this.room.createConstructionSite(roomPaths[i].path[j].x, roomPaths[i].path[j].y, STRUCTURE_ROAD);
				}
			}
			roomPaths[i].built = true;
		}
		//let base = Game.rooms[Memory.bases[this.room.name] || ]

	}
}
