
export class Transporter implements ICreepClass {
	creep: Creep;
	name: string;
	memory: CreepMemory;
	waitingPositions: RoomPosition[];
	loaded: boolean;
	spawn: StructureSpawn;
	targetObject: any;
	isCreepWaiting: boolean;
	resourcesAround: Resource[];
	energyTarget: Id<StructureWithStorage> | Id<Resource<ResourceConstant>> | null | undefined;

	constructor(creep: Creep, memory: CreepMemory) {
		this.creep = creep;
		this.name = this.creep.name;
		this.memory = memory;
		this.loaded = false;
		/* this.spawn = Game.getObjectById(this.creep.room.colonieMemory.spawns[0] as Id<StructureSpawn>) as StructureSpawn;
		this.waitingPositions = [
			new RoomPosition(this.spawn.pos.x - 1, this.spawn.pos.y + 1, this.creep.room.name),
			new RoomPosition(this.spawn.pos.x + 1, this.spawn.pos.y + 1, this.creep.room.name),
			new RoomPosition(this.spawn.pos.x - 1, this.spawn.pos.y + 3, this.creep.room.name),
			new RoomPosition(this.spawn.pos.x + 1, this.spawn.pos.y + 3, this.creep.room.name),
		]; */

		this.targetObject = null;
		let energyTargetTest = null;
		if (this.memory.energyTarget && this.memory.energyTarget !== null) {
			let energyTargetTest = Game.getObjectById(this.memory.energyTarget)
		}

		if (energyTargetTest !== null) {
			this.energyTarget = this.memory.energyTarget;
		} else {
			this.energyTarget = null;
		}


		if (typeof this.creep.target === 'string') {
			this.targetObject = Game.getObjectById(this.creep.target);
		}

		/* if (typeof this.memory.energyTarget === 'string') {
			this.energyTarget = Game.getObjectById(this.memory.energyTarget);
		} */

		this.isCreepWaiting = this.memory.task === 'waiting';
		this.resourcesAround = [];
		this._run();
	}

	_updateMemory() {
	}

	_run() {
		this.getIsLoaded();

		if (this.targetObject && this.creep.target !== null) {
			let handelReturn = this.handelTarget();

			if (handelReturn === OK) {
				this.memory.energyTarget = null;
				this.creep.memory.energyTarget = null;
				return;
			}

		} else {
			this.memory.target = this.getTarget();
		}



		/* if (this.isCreepWaiting) {
			this.isWaiting();
		} */

		if (!this.loaded && this.memory.target && this.memory.target !== null) {
			this.memory.target = null;
			this.memory.energyTarget = null;
			this.creep.memory.energyTarget = null;
			this.resourcesAround = this.creep.room.lookForAtArea(LOOK_RESOURCES, this.creep.pos.y - 1, this.creep.pos.x - 1, this.creep.pos.y + 1, this.creep.pos.x + 1, true).map(result => result.resource);;

			for (let i = 0; i < this.resourcesAround.length; i++) {
				this.creep.pickup(this.resourcesAround[i]);
			}

			let loadResourceResult = this.creep.loadResource();

			if (loadResourceResult && loadResourceResult !== null) {

				this.memory.energyTarget = loadResourceResult;
				this.creep.memory.energyTarget = loadResourceResult;
			}

		}
	}

	handelTarget() {
		if (!this.loaded) {
			return 2;
		}

		const transferAmount = Math.min(this.targetObject.store.getFreeCapacity(), this.creep.store.getUsedCapacity());
		const transfer = this.creep.transferToTarget(this.targetObject, RESOURCE_ENERGY, transferAmount);
		const isTargetCreep = this.targetObject.body ? true : false;
		const isTargetContainerOrStorage = this.targetObject.structureType === STRUCTURE_STORAGE || this.targetObject.store.getFreeCapacity() < (this.targetObject.store.getCapacity() * 0.5);
		const isTargetAlreadyFull = this.targetObject.store.getFreeCapacity() === 0;

		if (isTargetAlreadyFull || transfer === ERR_FULL || (transfer === OK && (this.creep.store.getUsedCapacity() === 0 || isTargetContainerOrStorage || isTargetCreep))) {
			this.creep.clearTarget();
			this.memory.target = null;
			this.memory.task = '';
			this.memory.lastPositions = [];
			return 0;
		} else if (transfer === 2) {
			return 0;
		}

		return 1;
	}

	isWaiting() {
		this.memory.task = 'waiting';
		for (let i = 0; i < this.waitingPositions.length; i++) {
			if (this.creep.room.lookForAt(LOOK_CREEPS, this.waitingPositions[i]).length < 1) {
				this.creep.moveToTarget(ERR_NOT_IN_RANGE, { pos: this.waitingPositions[i] });
				break;
			}
		}
	}

	getTarget() {
		const sequence = [STRUCTURE_EXTENSION, STRUCTURE_SPAWN, STRUCTURE_TOWER, FIND_MY_CREEPS, STRUCTURE_CONTAINER, STRUCTURE_LINK, STRUCTURE_STORAGE];
		let targetWithoutEnoughEnergy: (StructureWithStorage | AnyCreep)[] = [];
		const originRoom = Game.rooms[this.creep.memory.origin];

		// Hilfsfunktion zum Prüfen von Energiekapazität
		// Hilfsfunktion zum Prüfen von Energiekapazität
		const isEnoughCapacity = (structure: Structure<StructureConstant>, structureType: string) => {
			if (structure.structureType !== STRUCTURE_TOWER && structure instanceof StructureStorage) {
				return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
			} else if (structure.structureType === STRUCTURE_TOWER && structure instanceof StructureTower) {
				return structure.store.getUsedCapacity(RESOURCE_ENERGY) <= structure.store.getCapacity(RESOURCE_ENERGY) * 0.5;
			}
			return false;
		};


		sequence.find((structureType, i) => {
			if (i === 5) {
				targetWithoutEnoughEnergy = _.filter(originRoom.find(FIND_MY_CREEPS), (target) => !target.spawning && target.memory.job === 'worker' && target.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
			} else {
				targetWithoutEnoughEnergy = this.creep.room.myStructurs
					.map(id => Game.getObjectById(id))
					.filter(structure =>
						structure !== null &&
						structure.structureType === structureType &&
						((structure instanceof StructureStorage || structure instanceof StructureTower) && isEnoughCapacity(structure, structureType))
					) as (AnyCreep | StructureWithStorage)[];

			}
			return targetWithoutEnoughEnergy.length > 0;
		});

		// Kein Ziel gefunden
		if (targetWithoutEnoughEnergy.length < 1) return null;

		// Bei nur einem Ziel, sofort zurückgeben
		if (targetWithoutEnoughEnergy.length === 1) return targetWithoutEnoughEnergy[0].id;

		// Sortierungsmethode wählen
		const sortByDistance = targetWithoutEnoughEnergy[0] instanceof Structure && targetWithoutEnoughEnergy[0].structureType === STRUCTURE_EXTENSION;

		// Sortieren
		targetWithoutEnoughEnergy.sort((a, b) => {
			if (sortByDistance) {
				return a.pos.getRangeTo(this.creep.pos) - b.pos.getRangeTo(this.creep.pos);
			} else {
				return b.store.getFreeCapacity(RESOURCE_ENERGY) - a.store.getFreeCapacity(RESOURCE_ENERGY);
			}
		});

		return targetWithoutEnoughEnergy[0].id;
	}

	getIsLoaded() {
		const isValidTarget = this.targetObject && this.targetObject.store != null;
		if (!isValidTarget) {
			return;
		}
		let energyTargetCapacity = 0;

		if (this.energyTarget) {
			let energyTarget = Game.getObjectById(this.energyTarget);
			if (energyTarget) {
				if (energyTarget instanceof Structure && energyTarget.store) {
					energyTargetCapacity = energyTarget.store.getUsedCapacity(RESOURCE_ENERGY);
				} else if (energyTarget instanceof Resource && energyTarget.amount) {
					energyTargetCapacity = energyTarget.amount;
				}
			}

		}
		const creepCapacity = this.creep.store.getUsedCapacity(RESOURCE_ENERGY);
		const capacityGreaterThanTarget = creepCapacity >= this.targetObject.store.getFreeCapacity(RESOURCE_ENERGY);
		//const isTargetExtentionOrCreep = this.targetObject.structureType === STRUCTURE_EXTENSION || this.targetObject.body;
		const getResourcePotential = Math.min(this.creep.store.getFreeCapacity(), energyTargetCapacity);

		//console.log(this.energyTarget);

		if ((creepCapacity != 0 && getResourcePotential != 0) && (creepCapacity >= getResourcePotential || capacityGreaterThanTarget)) {
			this.loaded = true;
			this.memory.energyTarget = null;
			return;
		}

		this.loaded = this.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0 ||
			(creepCapacity !== 0 && creepCapacity >= getResourcePotential);

		if (this.loaded) {
			this.memory.energyTarget = null;
		}
	}
}
