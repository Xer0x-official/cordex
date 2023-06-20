
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
	energyTarget: StructureWithStorage | Resource | null;

	constructor(creep: Creep, memory: CreepMemory) {
		this.creep = creep;
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
		this.energyTarget = null;

		if (typeof this.creep.target === 'string') {
			this.targetObject = Game.getObjectById(this.creep.target);
		}

		if (typeof this.memory.energyTarget === 'string') {
			this.energyTarget = Game.getObjectById(this.memory.energyTarget);
		}

		this.isCreepWaiting = this.memory.task === 'waiting';
		this.resourcesAround = [];
		this._run();
	}

	_run() {
		this.getIsLoaded();

		if (this.targetObject && this.creep.target !== null) {
			let handelReturn = this.handelTarget();

			if (handelReturn === 0) {
				return;
			}

		} else {
			this.memory.target = this.getTarget();
		}

		/* if (this.isCreepWaiting) {
			this.isWaiting();
		} */


		if (!this.loaded) {
			this.memory.energyTarget = null;
			this.creep.memory.energyTarget = null;
			this.resourcesAround = this.creep.room.lookForAtArea(LOOK_RESOURCES, this.creep.pos.y - 1, this.creep.pos.x - 1, this.creep.pos.y + 1, this.creep.pos.x + 1, true).map(result => result.resource);;

			for (let i = 0; i < this.resourcesAround.length; i++) {
				this.creep.pickup(this.resourcesAround[i]);
			}

			let loadResourceResult = this.creep.loadResource();

			if (loadResourceResult && loadResourceResult !== null) {
				this.memory.energyTarget = loadResourceResult.id;
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
		const sequence = [STRUCTURE_EXTENSION, STRUCTURE_SPAWN, STRUCTURE_TOWER, STRUCTURE_CONTAINER, STRUCTURE_LINK, FIND_MY_CREEPS, STRUCTURE_STORAGE];
		let targetWithoutEnoughEnergy: (StructureWithStorage | AnyCreep)[] = [];

		for (let i = 0; i < sequence.length + 1; i++) {
			if (i === 5) {
				targetWithoutEnoughEnergy = _.filter(this.creep.room.find(FIND_MY_CREEPS), (target) => !target.spawning && target.memory.job === 'worker' && target.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
			} else {
				targetWithoutEnoughEnergy = _.filter(this.creep.room.find(FIND_STRUCTURES), (target): target is StructureWithStorage =>
					target.structureType === sequence[i] && target.store !== null &&
					(
						(target.structureType === STRUCTURE_TOWER && target.store.getUsedCapacity(RESOURCE_ENERGY) <= target.store.getCapacity(RESOURCE_ENERGY) * 0.5) ||
						(target.structureType !== STRUCTURE_TOWER && target.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
					)
				) as StructureWithStorage[];
			}

			if (targetWithoutEnoughEnergy.length > 0) {
				break;
			}
		}

		if (targetWithoutEnoughEnergy.length < 1) {
			return null;
		} else if (targetWithoutEnoughEnergy.length === 1) {
			return targetWithoutEnoughEnergy[0].id;
		}

		if (targetWithoutEnoughEnergy[0] instanceof Structure && targetWithoutEnoughEnergy[0].structureType === STRUCTURE_EXTENSION) {
			targetWithoutEnoughEnergy.sort((a, b) => {
				const storeA = a.pos.getRangeTo(this.creep.pos);
				const storeB = b.pos.getRangeTo(this.creep.pos);
				return storeA - storeB;
			});
		} else {
			targetWithoutEnoughEnergy.sort((a, b) => {
				const storeA = a.store.getFreeCapacity(RESOURCE_ENERGY);
				const storeB = b.store.getFreeCapacity(RESOURCE_ENERGY);
				return storeB - storeA;
			});

			Structure
		}

		return targetWithoutEnoughEnergy[0].id;
	}

	getIsLoaded() {
		const isValidTarget = this.targetObject && this.targetObject.store != null;
		if (!isValidTarget) {
			return;
		}
		let energyTargetCapacity = 0;

		if (this.energyTarget) {
			if (this.energyTarget instanceof Structure) {
				energyTargetCapacity = this.energyTarget.store.getUsedCapacity(RESOURCE_ENERGY);
			} else {
				energyTargetCapacity = this.energyTarget.amount;
			}
		}
		const creepCapacity = this.creep.store.getUsedCapacity(RESOURCE_ENERGY);
		//let capacityGreaterThanTarget = creepCapacity >= this.targetObject.store.getFreeCapacity(RESOURCE_ENERGY);
		//let isTargetExtentionOrCreep = this.targetObject.structureType === STRUCTURE_EXTENSION || this.targetObject.body;
		const getResourcePotential = Math.min(this.creep.store.getFreeCapacity(), energyTargetCapacity);

		//console.log(this.energyTarget);

		if ((creepCapacity != 0 && getResourcePotential != 0) && creepCapacity >= getResourcePotential) {
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
