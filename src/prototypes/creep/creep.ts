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
	get: function (): Id<Source> | Id<Mineral> | Id<AnyStructure> | Id<AnyCreep> | Id<Resource> | RoomPosition | null {
		return this.memory.target;
	},
	set: function (value: Id<Source> | Id<Mineral> | Id<AnyStructure> | Id<AnyCreep> | Id<Resource> | RoomPosition | null) {
		if (value !== undefined) {
			this.memory.target = value;
		}
	},
	enumerable: true,
	configurable: true
});
//#endregion

Creep.prototype.clearTarget = function clearTarget() {
	this.memory.target = null;
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
Creep.prototype.loadResource = function loadResource(resourceType = RESOURCE_ENERGY, lookInRoom: boolean = false): Resource | StructureContainer | StructureStorage | null {
	const isCreepFull = this.store.getFreeCapacity() === 0;
	const colonieMemory = this.room.colonieMemory;

	if (isCreepFull || !colonieMemory) {
		return null;
	}

	const energyTargetCounted = _.countBy(Game.creeps, (creep) => creep.memory.energyTarget || 'undefined');

	const resourceSources: {
		[name: string]: any;
		dropped: Resource[];
		container: StructureContainer[];
		storage: StructureStorage[];
	} = {
		dropped: [],
		container: [],
		storage: [],
	};

	Object.keys(colonieMemory.resources.dropped.energy).forEach((resourceId) => {
		let resource = Game.getObjectById(resourceId as Id<Resource>);

		if (resource && (lookInRoom && resource.pos.roomName === this.memory.origin || !lookInRoom)) {
			resourceSources.dropped.push(resource)
		}
	})

	resourceSources.dropped.sort((a: Resource, b: Resource) => b.amount - a.amount);

	// Suche nach Containern
	const containers = this.room.find(FIND_STRUCTURES, {
		filter: (structure: Structure) => structure.structureType === STRUCTURE_CONTAINER &&
			(!this.target || this.target == null || (this.target && this.target != null && this.target.structureType && this.target.structureType !== STRUCTURE_CONTAINER && this.target.structureType !== STRUCTURE_STORAGE)) &&
			(structure as StructureContainer).store.getUsedCapacity() > 0,
	});
	resourceSources.container.push(...containers);

	// Suche nach der Storage
	if (this.room.storage && this.room.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0 &&
		(!this.target || this.target === null || (!this.target.structureType || this.target.structureType !== STRUCTURE_CONTAINER))) {
		resourceSources.storage.push(this.room.storage);
	}

	const sequence: string[] = [];
	let i = 0;

	switch (this.memory.job) {
		case 'transporter':
			if (this.target && this.target.structureType && this.target.structureType != null && (this.target.structureType == STRUCTURE_EXTENSION || this.target.structureType == STRUCTURE_SPAWN))
				sequence.push('container', 'storage', 'dropped');
			else
				sequence.push('container', 'dropped', 'storage');

			if (this.memory.energyTarget && this.memory.energyTarget !== null) {
				const source = Game.getObjectById(this.memory.energyTarget);

				if (source) {
					if (source instanceof Resource) {
						this.pickupResource(source);
					} else {
						this.withdrawFromTarget(source, resourceType);
					}
				}

				return this.memory.energyTarget;
			}

			for (i = 0; i < sequence.length; i++) {
				if (resourceSources[sequence[i]].length <= 0) {
					continue;
				}
				let source = resourceSources[sequence[i]][0];

				if (sequence[i] === 'dropped') {

					for (let j = 0; j < resourceSources[sequence[i]].length; j++) {
						if (energyTargetCounted[resourceSources[sequence[i]][j].id] < 2 || !energyTargetCounted[resourceSources[sequence[i]][j].id]) {
							source = resourceSources[sequence[i]][j];
							break;
						}
					}
				}

				//const source = resourceSources[sequence[i]][0];

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
				if (resourceSources[sequence[i]].length <= 0) {
					continue;
				}

				const source = resourceSources[sequence[i]][0];
				if (source) {
					this.memory.energyTarget = source.id;
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
}

Creep.prototype.aboutToDie = function () {
	return this.ticksToLive === 1;
}
