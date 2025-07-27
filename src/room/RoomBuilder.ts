import { Console } from "console";
import * as utils from "../utilities";
import { canScheduleNewProject, BUILD_ENERGY_THRESHOLD } from '../utilities/ManagementPlan';

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
		this.name = name;
		this.memory = memory;
		this.rcl = this.room.controller?.level as number;
		this.spawn = Game.getObjectById(this.room.spawns[0]) as StructureSpawn;
		this.controllerUpgradeThreshhold = CONTROLLER_LEVELS[this.rcl] * (0.1 - (this.rcl / 100));

		this._run();
	}

	_run() {
		this.checkBuildProgress();

		switch (this.rcl) {
			case 8:
				// break;
			case 7:
				// break;
			case 6:
				this.buildStructure('extensionPacks_6');
				this.buildStructure('extensionPacks_5');
			case 5:
				this.buildStructure('extensionPacks_4');
			case 4:
                this.buildStructure('extensionPacks_3');
				this.buildStructure('powerBunker');
			case 3:
				this.buildStructure('tower');
                this.buildStructure('extensionPacks_2');
			case 2:
                this.buildStructure('extensionPacks_1');
				this.buildStructure('bunker', new RoomPosition(this.spawn.pos.x - 3, this.spawn.pos.y - 1, this.name));
			default:
				this.buildPaths();
				this.buildController();
				break;
		}
	}

	_updateMemory() {
	}

	buildStructure(name: string, positionInit: RoomPosition | undefined = undefined): void {
		let pack = 0;

		// Beispiel innerhalb von buildStructure() oder buildController():
		if (!canScheduleNewProject(this.room)) {
			return; // Abbruch – keine neuen Projekte starten
		}

		if (name.includes('extensionPack')) {
			pack = parseInt(name.slice(-1), 10);
			name = 'extensionPack';
		}

		if (!this.isBuildAlreadyInQueue(name)) {
			const baseExtensions = this.room.baseExtensions;
			let extension = undefined;
			let constructionErr = 0;

			if (name.includes('extensionPack')) {
				extension = baseExtensions['extensionPacks'][pack];
			} else {
				extension = baseExtensions[name];
			}

			const position = positionInit || new RoomPosition(extension.x -1, extension.y -1, this.name);
			const blueprintData = this.room.buildBlueprint(position, name);
			const project: buildQueueElement = {
                name: blueprintData.name,
                cost: blueprintData.cost,
                pos: new RoomPosition(0, 0, this.room.name),
                id: "",
                structures: blueprintData.structures,
                neededCreeps: blueprintData.neededCreeps,
            };

			if (project.structures.length > 0 && project.cost > 0) {
				console.log(`ROOM: Tried to add buildingProject ${project.name} with ${project.cost} costs`);


				for (let i = project.structures.length - 1; i >= 0; i--) {


					let lookForStuctures = _.filter(this.room.lookForAt(LOOK_STRUCTURES, project.structures[i].pos), structure =>
						structure.structureType != project.structures[i].type ||
                        (structure.structureType != STRUCTURE_ROAD && project.structures[i].type == STRUCTURE_CONTAINER) ||
                        (structure.structureType != STRUCTURE_CONTAINER && project.structures[i].type == STRUCTURE_ROAD)
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

	// buildController() {
	// 	if (!canScheduleNewProject(this.room)) {
	// 		return; // Abbruch – keine neuen Projekte starten
	// 	}
    //
	// 	if (!this.isBuildAlreadyInQueue('controller') && (this.room.controller && this.room.controller.ticksToDowngrade < 500 || this.room.stats.totalAvailableEnergy > this.controllerUpgradeThreshhold)) {
	// 		let controllerUpgradeCost = (Math.floor(this.room.stats.totalAvailableEnergy / this.controllerUpgradeThreshhold) * this.controllerUpgradeThreshhold) * 0.75;
	// 		controllerUpgradeCost = controllerUpgradeCost > (CONTROLLER_LEVELS[this.rcl] * 0.25) ? (CONTROLLER_LEVELS[this.rcl] * 0.25) : controllerUpgradeCost;
	// 		console.log(`ROOM: Tried to add buildingProject controller_${Game.time} with ${controllerUpgradeCost} costs`);
	// 		const roomController = this.room.controller;
	// 		let containerAroundController: number = 0;
	// 		if (roomController) {
	// 			containerAroundController = this.room.lookForAtArea(LOOK_STRUCTURES, roomController.pos.x -2, roomController.pos.y -2, roomController.pos.x +2, roomController.pos.y +2, true)
	// 			.filter(structure => structure && structure.structure.structureType === STRUCTURE_CONTAINER).length;
	// 		}
    //
	// 		const buildData: buildQueueElement = {
    //             name: `controller_${Game.time}`,
    //             cost: controllerUpgradeCost,
    //             structures: [{ pos: this.room.controller?.pos, type: undefined } as buildBlueprintBuildElement],
    //             neededCreeps: -1,
    //             pos: new RoomPosition(0, 0, this.room.name),
    //             id: ""
    //         };
    //
	// 		if (roomController && containerAroundController <= 0 && this.rcl >= 2) {
	// 			const spawn = Game.getObjectById(this.room.colonieMemory.spawns[0]);
	// 			const containerPosition = this.findOptimalContainerPosition(spawn as StructureSpawn, roomController);
    //
	// 			if (containerPosition) {
	// 				buildData.cost += 5000;
	// 				buildData.structures.unshift({pos: containerPosition, type: STRUCTURE_CONTAINER});
	// 				this.room.createConstructionSite(containerPosition, STRUCTURE_CONTAINER);
	// 			}
	// 		}
    //
	// 		this.room.buildQueue.push(buildData);
	// 	}
	// }

    containerNearController(): boolean {
        const containerRange = 3;
        let containerAroundController: number = 0;
        let roomController = this.room.controller;
        if (roomController) {
            containerAroundController = this.room.lookForAtArea(LOOK_STRUCTURES, roomController.pos.x -containerRange, roomController.pos.y -containerRange, roomController.pos.x +containerRange, roomController.pos.y +containerRange, true)
            .filter(structure => structure && structure.structure.structureType === STRUCTURE_CONTAINER).length;
        }

        return containerAroundController > 0;
    }

    buildController(): void {
        const controller = this.room.controller;
        if (!controller || this.isBuildAlreadyInQueue('controller')) return;
        if (!canScheduleNewProject(this.room)) return;

        // 1. Containerbau forcieren, falls Level ≥ 2 und keiner vorhanden
        // if (this.rcl > 1 && !this.containerNearController()) {
        //     const containerPos = this.findOptimalContainerPosition(this.spawn, controller);
        //     if (containerPos) {
        //         const containerProject: buildQueueElement = {
        //             name: `controller_container_${Game.time}`,
        //             cost: 5000,
        //             structures: [{ pos: containerPos, type: STRUCTURE_CONTAINER }],
        //             neededCreeps: -1,
        //             pos: containerPos,
        //             id: ""
        //         };
        //         this.room.buildQueue.push(containerProject);
        //         return; // erst Container bauen
        //     }
        // }

        // 2. Upgradebudget festlegen
        const remaining = controller.progressTotal - controller.progress;
        let invest: number;
        if (controller.level < 4) {
            // Frühphase: möglichst schnell hochleveln
            invest = Math.min(remaining, controller.progressTotal * 0.25);
        } else {
            // Später: bei Downgrade‑Gefahr oder Energieüberschuss upgraden
            const downgradeThreshold = CONTROLLER_DOWNGRADE[this.rcl] * 0.5;
            if (controller.ticksToDowngrade > downgradeThreshold &&
                this.room.stats.totalAvailableEnergy < this.controllerUpgradeThreshhold) {
                return; // kein Upgrade nötig
            }
            invest = Math.min(remaining, controller.progressTotal * 0.10);
        }

        if (invest <= 0) return;

        const upgradeProject: buildQueueElement = {
            name: `controller_${Game.time}`,
            cost: invest,
            structures: [{ pos: controller.pos, type: undefined } as buildBlueprintBuildElement],
            neededCreeps: -1,
            pos: new RoomPosition(0, 0, this.room.name),
            id: ""
        };
        this.room.buildQueue.push(upgradeProject);
    }

	checkBuildProgress() {
		for (let i = 0; i < this.room.buildQueue.length; i++) {
			_.remove((this.room.buildQueue[i].structures as buildBlueprintBuildElement[]), (structure) => {
				const lookRoom = Game.rooms[structure.pos.roomName];
				return !lookRoom || (structure.type && lookRoom.lookForAt(LOOK_CONSTRUCTION_SITES, structure.pos.x, structure.pos.y).length <= 0);
			});

			if (!this.room.buildQueue[i].structures) {
				continue;
			}

			if ((this.room.buildQueue[i].structures as buildBlueprintBuildElement[]).length <= 0 ||
				(this.room.buildQueue[i].name.includes("controller") && (this.room.buildQueue[i].cost as number) <= 0 )) {

				_.remove(this.room.spawnQueue, creepSpawn => {
					return creepSpawn.memory && creepSpawn.memory.task === this.room.buildQueue[i].name;
				});

				// if (this.room.buildQueue.length <= 1) {
				// 	_.remove(this.room.spawnQueue, creepSpawn => {
				// 		return creepSpawn.memory && creepSpawn.memory.task === this.room.buildQueue[i].name;
				// 	});
				// } else {
				// 	_.transform(this.room.spawnQueue, function (result: colonieQueueElement[], creepSpawn) {
				// 		if (creepSpawn.memory && creepSpawn.memory.task === this.room.buildQueue[i].name) {
				// 			creepSpawn.memory.task = '';
				// 		}
				// 		result.push(creepSpawn);
				// 		return true;
				// 	}, []);
				// }

				this.room.buildQueue = this.room.buildQueue.splice(i + 1, 1);
			}
		}
	}

	isBuildAlreadyInQueue(name: string) {
		return _.some(this.room.buildQueue, project => project.name.includes(name));
	}

	buildPaths(baseName?: string) {
		if (this.isBuildAlreadyInQueue('paths')) { return }

		// return { name: `${name}_${Game.time}`, cost: costs.cost, structures: structureList, neededCreeps: neededCreeps };
		const buildData: buildQueueElement = {
            name: `paths_${Game.time}`,
            cost: 0,
            structures: [],
            neededCreeps: -1,
            pos: new RoomPosition(0, 0, this.room.name),
            id: ""
        };
		const energy = this.room.stats.totalAvailableEnergy;
		let roomPaths;
		let i = 0, j = 0;
		let lookRoom;
		let lastStructuresBuild = 0;

		roomPaths = utils.getElementsByPattern(this.room.colonieMemory.paths, `${this.room.name}_.*`)
		_.remove(roomPaths, function (path: IColoniePath) {
			return path.built || path.path.length <= 0;
		});

		for (i = 0; i < roomPaths.length; i++) {
			for (j = 0; j < roomPaths[i].path.length; j++) {
				lookRoom = Game.rooms[roomPaths[i].path[j].roomName];
				if (!lookRoom) {
					continue;
				}

				let buildPosition = new RoomPosition(roomPaths[i].path[j].x, roomPaths[i].path[j].y, roomPaths[i].path[j].roomName);
				let constructionSitesAt = lookRoom.lookForAt(LOOK_CONSTRUCTION_SITES, buildPosition);
				let structursAt = lookRoom.lookForAt(LOOK_STRUCTURES, buildPosition);

				if (structursAt.length > 0 || constructionSitesAt.length > 0 || buildPosition.isEdge()) {
					continue;
				}

				if (buildData.cost !== undefined && buildData.structures !== undefined) {

					buildData.cost += 300;
					buildData.structures.push({ pos: buildPosition, type: STRUCTURE_ROAD });
					lookRoom.createConstructionSite(buildPosition, STRUCTURE_ROAD);
				}
			}

			// if (buildData.structures && buildData.structures.length === 0) {
			// 	roomPaths[i].built = true;
			// }
		}
		//let base = Game.rooms[Memory.bases[this.room.name] || ]
		if (buildData.structures && buildData.structures.length > 0) {
			this.room.buildQueue.push(buildData);
		}
	}

	/* findOptimalContainerPosition(spawn: StructureSpawn, controller: StructureController): RoomPosition | null {
		// Pfad vom Spawner zum Controller ermitteln
		const path = PathFinder.search(spawn.pos, controller.pos).path;

		// Position zwei Schritte vom Controller entfernt ermitteln
		const posIndex = path.findIndex(pos => pos.getRangeTo(controller.pos) === 2);

		// Überprüfen, ob eine geeignete Position gefunden wurde
		if (posIndex !== -1) {
			const containerPos = path[posIndex];

			// Überprüfen, ob der Standort für den Bau eines Containers geeignet ist
			const terrain = new Room.Terrain(containerPos.roomName);
			if (terrain.get(containerPos.x, containerPos.y) !== TERRAIN_MASK_WALL) {
				// Überprüfen, ob alle umliegenden Positionen frei sind
				const freePositions = containerPos.getFreePositions();

				console.log("func", freePositions);
				if (freePositions.length === 8) {  // eine Position hat maximal 8 Nachbarn in einem Quadratgitter
					return containerPos;
				}
			}
		}

		return null;
	} */

	findOptimalContainerPosition(spawn: StructureSpawn, controller: StructureController): RoomPosition | null {
		const freeControllerPositions = controller.pos.getFreePositions(2);
		const containerBuildPositions = freeControllerPositions.filter(position => position.getFreePositions().length === 8);

		containerBuildPositions.sort((a,b) => {
			const spawnDistanceA = a.getRangeTo(spawn.pos);
			const spawnDistanceB = b.getRangeTo(spawn.pos);
			return spawnDistanceA - spawnDistanceB;
		})

		if (containerBuildPositions.length >= 0) {
			return containerBuildPositions[0];
		}

		return null;
	}
}
