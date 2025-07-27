/**
 * Creep prototypes
 */

import { Traveler } from "../Traveler";
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
Creep.prototype.loadResource = function loadResource(resourceType = RESOURCE_ENERGY, lookInRoom: boolean = false): Id<Resource> | Id<StructureContainer> | Id<StructureStorage> | null {
	const isCreepFull = this.store.getFreeCapacity() === 0;
	const colonieMemory = this.room.colonieMemory;

	if (isCreepFull || !colonieMemory) {
		return this.memory.energyTarget;
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

	let resourcesInOrigin: Resource[] = [];
	let resourcesInRemotes: Resource[] = [];

	Object.keys(colonieMemory.resources.dropped.energy).forEach((resourceId) => {
		let resource = Game.getObjectById(resourceId as Id<Resource>);

		if (resource) {
			if (resource.pos.roomName === this.memory.origin) {
				resourcesInOrigin.push(resource);
			} else {
				resourcesInRemotes.push(resource);
			}
		}
	})
	resourcesInOrigin.sort((a: Resource, b: Resource) => b.amount - a.amount);
	resourcesInRemotes.sort((a: Resource, b: Resource) => b.amount - a.amount);

	resourceSources.dropped = resourcesInOrigin;

	if (!lookInRoom) {
		resourceSources.dropped.concat(resourcesInRemotes);
	}

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

			if (this.memory.energyTarget && colonieMemory.resources.dropped.energy[this.memory.energyTarget] && colonieMemory.resources.dropped.energy[this.memory.energyTarget].transporterCount <= Memory.settings.transporterPerSource) {
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
			console.log('check2');

			sources: for (i = 0; i < sequence.length; i++) {
				if (resourceSources[sequence[i]].length <= 0) {
					continue;
				}

				for (let j = 0; j < resourceSources[sequence[i]].length; j++) {
					const source = resourceSources[sequence[i]][j];

					// if (sequence[i] === 'dropped' && source && energyTargetCounted[source.id] > Memory.settings.transporterPerSource) {
						// continue;
						/* for (let j = 0; j < resourceSources[sequence[i]].length; j++) {
							if (energyTargetCounted[resourceSources[sequence[i]][j].id] < 2) {
								source = resourceSources[sequence[i]][j];
							}
						} */
					// }

					//const source = resourceSources[sequence[i]][0];

					if (source) {
						if (colonieMemory.resources.dropped.energy[source.id].transporterCount > Memory.settings.transporterPerSource) {
							continue;
						}

						this.memory.energyTarget = source.id;

						if (sequence[i] === 'dropped') {
							this.pickupResource(source);
						} else {
							this.withdrawFromTarget(source, resourceType);
						}
						break sources;
					}
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


/**
 *
 * @param {*} resourceType
 * @default {RESSOURCE_ENERGY} resourceType
 * @returns {boolean} is creep.store.getFreeCapacity() == 0
 */
Creep.prototype.getResourceTarget = function getResourceTarget(resourceType = RESOURCE_ENERGY, lookInRoom: boolean = false): boolean {
	const colonieMemory = this.room.colonieMemory;
	const targetObject: AnyStructure = Game.getObjectById(this.target as Id<AnyStructure>) as AnyStructure;
	let source: any = {};
	let i = 0;

	if (!colonieMemory) {
		return false;
	}

	const resourceSources = getResources(this.room, lookInRoom, colonieMemory, this, targetObject);

	switch (this.memory.job) {
		case 'transporter':

			// resourceSources.dropped.filter((resource: Resource) => colonieMemory.resources.dropped.energy[resource.id].transporterCount < Memory.settings.transporterPerSource);
			_.remove(resourceSources.dropped, (resource: Resource) => colonieMemory.resources.dropped.energy[resource.id].transporterCount >= Memory.settings.transporterPerSource);

			source = setTransporterTarget(this, source, resourceSources,
				targetObject && targetObject instanceof Structure && (targetObject.structureType == STRUCTURE_EXTENSION || targetObject.structureType == STRUCTURE_SPAWN)
			);

			if (source && source !== null && Game.getObjectById(source.id) instanceof Resource) {
				this.room.colonieMemory.resources.dropped.energy[source.id].transporterCount++;
				colonieMemory.resources.dropped.energy[source.id].transporterCount++;
			}

			break;

		case 'worker':
			source = setWorkerTarget(this, source, resourceSources);
			break;
	}

	if (source && source !== null) {
		this.memory.energyTarget = source.id;
		return true;
	}

	return false;
}

function getResources(room: Room, lookInRoom: boolean, colonieMemory: IColonieMemory, creep: Creep, targetObject: AnyStructure) {

	//const energyTargetCounted = _.countBy(Game.creeps, (creep) => creep.memory.energyTarget || 'undefined');
	const resourceSources: resourceSources = {
		dropped: [],
		container: [],
		storage: [],
	};

	let droppedResources = Object.keys(colonieMemory.resources.dropped.energy)
		.map((resourceId) => Game.getObjectById(resourceId as Id<Resource>))
		.filter((resource): resource is Resource =>
		resource !== null);

	let resourcesInOrigin = droppedResources.filter(resource => resource.pos.roomName === creep.memory.origin)
		.sort((a: Resource, b: Resource) => b.amount - a.amount);

	let resourcesInRemotes = droppedResources.filter(resource => resource.pos.roomName !== creep.memory.origin)
		.sort((a: Resource, b: Resource) => b.amount - a.amount);

	// resourcesInOrigin.sort((a: Resource, b: Resource) => b.amount - a.amount);
	// resourcesInRemotes.sort((a: Resource, b: Resource) => b.amount - a.amount);

	resourceSources.dropped = lookInRoom ? resourcesInOrigin : resourcesInOrigin.concat(resourcesInRemotes);

	// Suche nach Containern
	const containers: StructureContainer[] = room.find(FIND_STRUCTURES, {
		filter: (structure: Structure) => structure.structureType === STRUCTURE_CONTAINER && (structure as StructureContainer).store.getUsedCapacity() > 0 &&
			(!targetObject || (targetObject && targetObject.structureType && targetObject.structureType !== STRUCTURE_CONTAINER && targetObject.structureType !== STRUCTURE_STORAGE))
	});
	resourceSources.container.push(...containers);

	// Suche nach der Storage
	if (room.storage && room.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0 &&
		(!targetObject || (targetObject.structureType !== STRUCTURE_CONTAINER))) {
		resourceSources.storage.push(room.storage);
	}

	return resourceSources;
}

function setTransporterTarget(creep: Creep, source: any, resourceSources: resourceSources, isPriorityTarget: boolean) {
	const sequence: string[] = [];
	let i = 0;

	if (isPriorityTarget) {
		sequence.push('container', 'storage', 'dropped');
	} else {
		sequence.push('dropped', 'container', 'storage');
	}

	/* if (this.memory.energyTarget && this.room.colonieMemory.resources.energy[this.memory.energyTarget].transporterCount <= Memory.settings.transporterPerSource) {
		 */
	if (creep.memory.energyTarget ) {//&& colonieMemory.resources.dropped.energy[this.memory.energyTarget] && colonieMemory.resources.dropped.energy[this.memory.energyTarget].transporterCount <= Memory.settings.transporterPerSource) {
		source = Game.getObjectById(creep.memory.energyTarget);
		if (source && (((source instanceof StructureContainer || source instanceof StructureStorage) && source.store.getUsedCapacity() >= 0) ||
			(source instanceof Resource && source.amount >= 0))
		) {
			creep.memory.energyTarget = source.id;
			return source;
		}
	}

	for (i = 0; i < sequence.length; i++) {
		if (resourceSources[sequence[i]].length <= 0) {
			continue;
		}

		for (let j = 0; j < resourceSources[sequence[i]].length; j++) {
			source = resourceSources[sequence[i]][j];

			/* if (sequence[i] === 'dropped' && source && energyTargetCounted[source.id] > Memory.settings.transporterPerSource) {
				continue;
			} */

			if (source) {
				return source;
			}
		}
	}

	return null;
}

function setWorkerTarget(creep: Creep, source: any, resourceSources: resourceSources) {
	const sequence: string[] = [];
	let i = 0;

	sequence.push('container', 'storage', 'dropped');
	// sequence.push('container', 'storage');

	for (i = 0; i < sequence.length; i++) {
		if (!resourceSources[sequence[i]] || resourceSources[sequence[i]].isEmpty) {
			continue;
		}

		if (sequence[i] === 'container') {
			resourceSources[sequence[i]].sort((a: Resource, b: Resource) => {
				const rangeA = creep.pos.getRangeTo(a.pos);
				const rangeB = creep.pos.getRangeTo(b.pos);
				return rangeA - rangeB;
			});
		}

		source = resourceSources[sequence[i]][0];
		if (source) {
			return source;
		}
	}

	return null;
}
