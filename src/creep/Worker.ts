import { run } from "operations/Test";

export class Worker implements ICreepClass {
	creep: Creep;
	name: string;
	memory: CreepMemory;

	constructor(creep: Creep, memory: CreepMemory) {
		this.creep = creep;
		this.name = this.creep.name;
		this.memory = memory;

		this._run();
	}

	_run() {
		// TODO es sollen zuerst Resourcen berücksichtig werde die im abstand von 2 feldern liegen
		if (this.creep.spawning)
			return;

		if (!this.creep.room.getBuildQueueTask(this.creep.memory.task)) {
			this.memory.task = '';
			this.creep.memory.task = '';
		}

		if (this.creep.memory.task === null || this.creep.memory.task === '') {
			const buildQueue = this.creep.room.buildQueue;
			if (buildQueue && this.creep.room.buildQueue.length > 0) {
				this.creep.memory.task = buildQueue[0].name;
				this.memory.task = buildQueue[0].name;
			} else {
				this.memory.task = 'rescycle';
				this.creep.memory.task = 'rescycle';
			}
		}

		if (this.creep.memory.task == 'rescycle') {
			this.creep.getRescycled();
		} else if (this.creep.memory.task.includes('controller')) {
			this.upgradeController();
		} else { // creep.memory.task.includes('bunker')
			this.buildBunker();
		}

	}

	updateBuildQueueCost() {
		let workCost = this.creep.getCountOfBodyPart(WORK) * (this.creep.getTask().includes('controller') ? 1 : 5);
		let i = 0;

		for (i = 0; i < this.creep.room.buildQueue.length; i++) {
			if (this.creep.room.buildQueue[i].name.includes(this.creep.getTask())) {
				break;
			}
		}

		if (this.creep.room.buildQueue[i]) {
			if (workCost <= this.creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
				(this.creep.room.buildQueue[i].cost as number) -= workCost;
			} else {
				(this.creep.room.buildQueue[i].cost as number) -= this.creep.store.getUsedCapacity(RESOURCE_ENERGY) - (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) % this.creep.getCountOfBodyPart(WORK));
			}

		}
	}

	updateBuildQueueStructures() {
		let i = 0, j = 0;
		let workingStructures: buildBlueprintBuildElement[] = [];

		for (i = 0; i < this.creep.room.buildQueue.length; i++) {
			workingStructures = this.creep.room.buildQueue[i].structures as buildBlueprintBuildElement[];
			if (!this.creep.room.buildQueue || !this.creep.room.buildQueue[i]) {
				continue;
			}

			if (workingStructures.length < 1) {
				this.creep.room.buildQueue.splice(i, 1);
				continue;
			}

			if (this.creep.room.buildQueue[i].name !== this.creep.getTask())
				continue;


			_.remove(workingStructures, (structure) => {
				return this.creep.room.lookForAt(LOOK_CONSTRUCTION_SITES, structure.pos.x, structure.pos.y).length < 1;
			})

			this.creep.room.buildQueue[i].structures = workingStructures;
		}
	}

	upgradeController() {
		if (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0) {
			this.creep.loadResource(RESOURCE_ENERGY, true);
		} else {
			const colonieController = Game.rooms[this.memory.origin].controller;
			if (colonieController && this.creep.moveToTarget(this.creep.upgradeController(colonieController), colonieController) == OK) {
				this.updateBuildQueueCost();
			}
		}
	}

	buildBunker() {
		let taskPositions: RoomPosition[] = [];
		let i = 0, j = 0;
		let taskStructures = [];
		let target = null;
		let workingStructures: buildBlueprintBuildElement[] = [];
		let targetObject;

		if (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0) {
			this.creep.loadResource(RESOURCE_ENERGY, true);
			return;
		}

		if (!this.creep.target || this.creep.target === null) {
			if (!this.creep.room.getBuildQueueTask(this.creep.getTask()) || this.creep.room.getBuildQueueTask(this.creep.getTask()) == null) {
				return;
			}

			taskStructures = this.creep.room.getBuildQueueTask(this.creep.getTask()).structures;

			for (i = 0; i < taskStructures.length; i++) {
				taskPositions.push(this.creep.room.getPositionAt(taskStructures[i].pos.x, taskStructures[i].pos.y) as RoomPosition);
			}

			target = this.creep.pos.findClosestByPath(taskPositions);
			this.creep.target = target;
		}

		if (this.creep.buildTarget() == OK) {
			this.updateBuildQueueCost();
		}
		//this.updateBuildQueueStructures();


		if (typeof this.creep.target === 'string') {
			targetObject = Game.getObjectById(this.creep.target);
		} else if (this.creep.target instanceof RoomPosition) {
			targetObject = this.creep.target;
		} else {
			console.log(`${this.creep.target} ist keine RoomPosition oder Id`);
			return;
		}

		if (!targetObject || targetObject == null) {
			return;
		}

		outerLoop: for (i = 0; i < this.creep.room.buildQueue.length; i++) {
			if (this.creep.room.buildQueue[i].name != this.creep.getTask()) {
				continue;
			}

			workingStructures = this.creep.room.buildQueue[i].structures as buildBlueprintBuildElement[];
			for (j = 0; j < workingStructures.length; j++) {
				if (this.creep.target && this.creep.target != null) {
					if ((targetObject instanceof RoomPosition ? targetObject : targetObject.pos) === workingStructures[j].pos) {
						break outerLoop;
					}
				}
			}

			this.creep.memory.target = null;
			this.memory.target = null;
		}

	}
}
