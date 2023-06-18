/**
 * Creep prototypes
 */

import { Traveler } from "./Traveler";
const stuckMaxCounter = 3;

Creep.prototype.hasState = function (): boolean {
	return this.memory.state !== undefined;
};

Creep.prototype.getState = function (): number {
	return this.memory.state;
};

Creep.prototype.setState = function (state: number): void {
	this.memory.state = state;
};

Creep.prototype.getHomeroom = function (): string {
	return this.memory.homeroom;
};

Creep.prototype.isInHomeroom = function (): boolean {
	return this.memory.homeroom === this.room.name;
};

Creep.prototype.hasEnergy = function (): boolean {
	if (this._hasEnergy === undefined) {
		this._hasEnergy = this.store[RESOURCE_ENERGY] !== 0;
	}
	return this._hasEnergy;
};

Creep.prototype.isEmpty = function (): boolean {
	if (this._isEmpty === undefined) {
		this._isEmpty = this.store.getUsedCapacity() === 0;
	}
	return this._isEmpty;
};

Creep.prototype.isFull = function (): boolean {
	if (this._isFull === undefined) {
		this._isFull = this.store.getFreeCapacity() === 0;
	}
	return this._isFull;
};

//#region getAtribute
Creep.prototype.getTask = function getTask() {
	return (this.memory.task && this.memory.task != '' ? this.memory.task : '');
}

Creep.prototype.setTask = function setTask(task: string = '') {
	if (!task || task == '')
		return -1
	else
		this.memory.task = task;
	return 0;
}

Creep.prototype.getJob = function getJob() {
	return (this.memory.job && this.memory.job != '' ? this.memory.job : '');
}

Object.defineProperty(Creep.prototype, 'target', {
	get: function (): any {
		return this.memory.target;
	},
	set: function (value: any) {
		if (value !== undefined && value === null) {
			this.memory.target = value;
		}
	},
	enumerable: true,
	configurable: true
});
//#endregion

Creep.prototype.clearTarget = function clearTarget() {
	this.memory.target = '';
	this.memory.task = '';
	this.memory.lastPositions = [];
	this.memory.pathToTarget = [];

	return 0;
}

Creep.prototype.getCountOfBodyPart = function getCountOfBodyPart(partType: BodyPartConstant) {
	let i = 0, partCount = 0;
	for (i = 0; i < this.body.length; i++) {
		if (this.body[i].type == partType)
			partCount++;
	}
	return partCount;
}

/**
 *
 * @param {*} resourceType
 * @default {RESSOURCE_ENERGY} resourceType
 * @returns {boolean} is creep.store.getFreeCapacity() == 0
 */
Creep.prototype.loadResource = function loadResource(resourceType = RESOURCE_ENERGY): Resource | StructureContainer | StructureStorage | null {
	const isCreepFull = this.store.getFreeCapacity() === 0;

	if (isCreepFull)
		return null;

	const resourceSources: {
		[name: string]: any;
		dropped: Resource;
		container: StructureContainer;
		storage: StructureStorage;
	} = {
		dropped: _.chain(this.room.find(FIND_DROPPED_RESOURCES))
			.filter((resource: Resource) => resource.resourceType === resourceType)
			.sortBy((resource: Resource) => -resource.amount)
			.head(),
		container: _.chain(this.room.find(FIND_STRUCTURES))
			.filter((structure: Structure) => structure.structureType === STRUCTURE_CONTAINER &&
				(!this.target || this.target == null || (this.target && this.target != null && this.target.structureType && this.target.structureType !== STRUCTURE_CONTAINER && this.target.structureType !== STRUCTURE_STORAGE)) &&
				(structure as StructureContainer).store.getUsedCapacity() > 0)
			.sortBy((structure: StructureContainer) => -structure.store.getUsedCapacity(resourceType))
			.head(),
		storage: (this.room.storage && this.room.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0 &&
			(!this.target || this.target === null || (!this.target.structureType || this.target.structureType !== STRUCTURE_CONTAINER))) ? this.room.storage : undefined,
	};
	const sequence: string[] = [];
	let i = 0;

	switch (this.memory.job) {
		case 'transporter':
			if (this.target && this.target.structureType && this.target.structureType != null && (this.target.structureType == STRUCTURE_EXTENSION || this.target.structureType == STRUCTURE_SPAWN))
				sequence.push('container', 'storage', 'dropped');
			else
				sequence.push('container', 'dropped', 'storage');

			for (i = 0; i < sequence.length; i++) {
				const source = resourceSources[sequence[i]].value();
				if (source) {
					this.memory.energyTarget = source.id;
					if (sequence[i] === 'dropped') {
						this.pickupResource(source);
					} else {
						this.withdrawFromTarget(source, resourceType);
					}
					break;
				}
			}
			break;

		case 'worker':
			sequence.push('storage', 'container', 'dropped');
			for (i = 0; i < sequence.length; i++) {
				const source = resourceSources[sequence[i]].value();
				if (source) {
					switch (sequence[i]) {
						case 'dropped':
							this.pickupResource(source);
							break;
						case 'storage':
						case 'container':
							this.withdrawFromTarget(source, resourceType);
							break;
					}
					break;
				}
			}
			break;
	}

	return this.memory.energyTarget;
}

// assigns a function to Creep.prototype: creep.travelTo(destination)
Creep.prototype.travelTo = function (destination: RoomPosition | { pos: RoomPosition }, options?: TravelToOptions) {
	return Traveler.travelTo(this, destination, options);
};
