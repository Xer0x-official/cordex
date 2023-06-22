
export {};

Object.defineProperty(Room.prototype, 'buildingMatrix', {
	get: function (): CostMatrix {
		return PathFinder.CostMatrix.deserialize(this.colonieMemory.buildingMatrix);
	},
	set: function (value: CostMatrix) {
		this.colonieMemory.buildingMatrix = value.serialize();
	},
	enumerable: true,
	configurable: true
});

Object.defineProperty(Room.prototype, 'colonieMemory', {
	get: function () {
		const key:string = this.memory.origin || this.name;
		const memory = Memory.colonies[key];

		return memory;
	},
	set: function (value) {
		return null;
	},
	enumerable: true,
	configurable: true
});

Object.defineProperty(Room.prototype, 'buildQueue', {
	get: function (): colonieQueueElement[] {
		try {
			return this.colonieMemory.queues.build;
		} catch (err) {
			console.log(this.name, this.colonieMemory, this.memory.origin);
			console.log(err)
		}
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
	set: function (value: IBaseExtensions) {
		return this.colonieMemory.baseExtensions = value;
	},
	enumerable: true,
	configurable: true
});

Object.defineProperty(Room.prototype, 'myStructurs', {
	get: function (): Id<Structure>[] {
		return this.colonieMemory.myStructurs;
	},
	set: function (value: Id<Structure>[]) {
		return this.colonieMemory.myStructurs = value;
	},
	enumerable: true,
	configurable: true
});
