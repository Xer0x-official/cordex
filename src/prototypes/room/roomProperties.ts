
export {};

Object.defineProperty(Room.prototype, 'buildingMatrix', {
	get: function (): CostMatrix {
		return PathFinder.CostMatrix.deserialize(this.colonieMemory.buildingMatrix);
	},
	set: function (value: CostMatrix) {
		if (value !== undefined) {
			if (value === null) {
				this.colonieMemory.buildingMatrix = undefined;
				return 1;
			} else {
				this.colonieMemory.buildingMatrix = value.serialize();
				return 0;
			}
		}
		return 1;
	},
	enumerable: true,
	configurable: true
});

Object.defineProperty(Room.prototype, 'colonieMemory', {
	get: function () {
		const key:string = this.memory.origin || this.name;
		const memory = Memory.colonies[key];

		return memory !== undefined ? memory : undefined;
	},
	set: function (value) {
		return null;
	},
	enumerable: true,
	configurable: true
});

Object.defineProperty(Room.prototype, 'buildQueue', {
	get: function (): colonieQueueElement[] {
		return this.colonieMemory.queues.build;
	},
	set: function (value: colonieQueueElement[]) {
		return this.colonieMemory.queues.build = value;
	},
	enumerable: true,
	configurable: true
});

Object.defineProperty(Room.prototype, 'repairQueue', {
	get: function (): colonieQueueElement[] {
		return this.colonieMemory.queues.repair;
	},
	set: function (value: colonieQueueElement[]) {
		return this.colonieMemory.queues.repair = value;
	},
	enumerable: true,
	configurable: true
});

Object.defineProperty(Room.prototype, 'spawnQueue', {
	get: function (): colonieQueueElement[] {
		return this.colonieMemory.queues.spawn;
	},
	set: function (value: colonieQueueElement[]) {
		return this.colonieMemory.queues.spawn = value;
	},
	enumerable: true,
	configurable: true
});


Object.defineProperty(Room.prototype, 'spawns', {
	get: function (): Id<StructureSpawn>[] {
		return Memory.colonies[this.memory.origin].spawns;
	},
	set: function (value) {
		return null;
	},
	enumerable: true,
	configurable: true
});

Object.defineProperty(Room.prototype, 'isSetup', {
	get: function (): boolean {
		return this.memory.isSetup;
	},
	set: function (value: boolean) {
		return this.memory.isSetup = value;
	},
	enumerable: true,
	configurable: true
});

Object.defineProperty(Room.prototype, 'stats', {
	get: function (): IColonieStats {
		return this.colonieMemory.stats;
	},
	set: function (value: IColonieStats) {
		return this.colonieMemory.stats = value;
	},
	enumerable: true,
	configurable: true
});

Object.defineProperty(Room.prototype, 'baseExtensions', {
	get: function (): IBaseExtensions {
		return this.colonieMemory.baseExtensions;
	},
	set: function (value) {
		return null
	},
	enumerable: true,
	configurable: true
});
