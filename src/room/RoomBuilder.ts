const utils = require('../utils');

export class RoomBuilder implements IBaseRoomClass {
	constructor(room, memory) {
		this.room = room;
		this.memory = memory;
		this.roomControllerUpgradeCost = [200, 45000, 135000, 405000, 1215000, 3645000, 10935000];
		this.rcl = this.room.controller.level;

		this.build();
	}

	build() {
		const controllerUpgradeThreshhold = this.roomControllerUpgradeCost[this.rcl - 1] * (0.1 - (this.rcl / 100));
		const spawn = Game.getObjectById(this.memory.spawn);

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
				this.buildStructure('bunker', { x: spawn.pos.x - 3, y: spawn.pos.y - 1 });
			default:
				this.buildPaths();
				this.buildController(controllerUpgradeThreshhold);
				break;
		}

		this.checkBuildProgress();
	}

	buildStructure(name, positionInit = undefined) {
		if (!this.isBuildAlreadyInQueue(name)) {
			const baseExtensions = this.room.getBaseExtensions();
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

			const position = positionInit || { x: extension.x - 2, y: extension.y - 2 };
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


					constructionErr = this.room.createConstructionSite(project.structures[i].pos.x, project.structures[i].pos.y, project.structures[i].type);

					/* if (constructionErr !== OK) {
						project.structures.splice(i, 1);
					} */
				}

				if (project.structures.length > 0) {
					this.memory.buildQueue.push(project);

				}
			}
		}
	}

	buildController(controllerUpgradeThreshhold) {
		if (!this.isBuildAlreadyInQueue('controller') && (this.room.controller.ticksToDowngrade < 500 || this.room.getStatistics().totalAvailableEnergy > controllerUpgradeThreshhold)) {
			let controllerUpgradeCost = (Math.floor(this.room.getStatistics().totalAvailableEnergy / controllerUpgradeThreshhold) * controllerUpgradeThreshhold) * 0.75;
			controllerUpgradeCost = controllerUpgradeCost > (this.roomControllerUpgradeCost[this.rcl - 1] * 0.25) ? (this.roomControllerUpgradeCost[this.rcl - 1] * 0.25) : controllerUpgradeCost;
			console.log(`ROOM: Tried to add buildingProject controller_${Game.time} with ${controllerUpgradeCost} costs`);
			this.memory.buildQueue.push({ name: `controller_${Game.time}`, cost: controllerUpgradeCost, structures: [this.room.controller], neededCreeps: -1 });
		}
	}

	checkBuildProgress() {
		for (let i = 0; i < this.memory.buildQueue.length; i++) {
			if (this.memory.buildQueue[i].cost <= 0 || this.memory.buildQueue[i].structures.length <= 0) {
				const creepsWithTask = _.filter(Game.creeps, creep => creep.memory.task != null && creep.memory.task == this.memory.buildQueue[i].name);

				if (this.memory.buildQueue.length <= 1) {
					this.memory.spawnQueue = _.remove(this.memory.spawnQueue, spawn => {
						return spawn.task === this.memory.buildQueue[i].name;
					});
				} else {
					this.memory.spawnQueue = _.transform(this.memory.spawnQueue, function(result, n) {
						if (n.task === this.memory.buildQueue[i].name) {
							n.task = null;
						}
						result.push(n);
						return true;
					  }, []);
				}

				this.memory.buildQueue = this.memory.buildQueue.splice(i + 1, 1);
			}
		}
	}

	isBuildAlreadyInQueue(name) {
		return _.some(this.memory.buildQueue, project => project.name.includes(name));
	}

	buildPaths(baseName) {
		// return { name: `${name}_${Game.time}`, cost: costs.cost, structures: structureList, neededCreeps: neededCreeps };
		const buildData = { name: `paths_${Game.time}`, cost: 0, structures: [], neededCreeps: -1 };
		let energy = this.room.memory.statistics.totalAvailableEnergy;
		let roomPaths = utils.utils.getElementsByPattern(Memory.paths[this.room.name], `${this.room.name}_.*`)
		_.remove(roomPaths, function (path) {
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
				} else {
					if (buildData.cost + 300 > energy) {
						this.memory.buildQueue.push(buildData);
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
