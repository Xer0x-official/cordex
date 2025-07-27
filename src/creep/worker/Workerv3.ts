enum State {
    Start,
    HasTarget,
    FindTarget,
    HasEnergy,
    IsTargetNear,
    DoesTargetNeedEnergy,
    FindEnergySource,
	FindEnergySourceInRemote,
    IsSourceNear,
    Execute,
    End
}

enum Execute {
	Recycle,
	Pickup,
	Build,
	MoveTarget,
	MoveSource,
}

export class Worker implements ICreepClass{
    creep: Creep;
    state: State;
	name: string;
	memory: CreepMemory;
	target: any;
	execute: Execute;
    doesTargetNeedEnergyAttempts: number;
	stateGraph: string[];

    constructor(creep: Creep, memory: CreepMemory) {
        this.creep = creep;
		this.memory = memory
		this.name = this.creep.name;
        this.state = State.Start;
		this.stateGraph = [];

		this._run();
    }

	_run() {
		if (this.creep.spawning) {
			return;
		}

		while (this.state !== State.End) {
			this.runAutomat();
		}
		this._updateMemory();
	}

	_updateMemory() {
		this.memory.energyTarget = this.creep.memory.energyTarget;
	}

	runAutomat() {
		switch (this.state) {
			case State.Start: {
				this.state = State.HasTarget;
				break;
			}

            case State.HasTarget: {
				if (this.memory.target) {
					this.target = Game.getObjectById(this.memory.target);
					if (this.target) {
						this.state = State.IsTargetNear;
						break;
					}
				}

				this.target = null;
				this.state = State.FindTarget;
                break;
			}

            case State.FindTarget: {
				for (let i = 0; i < 3; i++) {
					if (this.findTarget() && this.memory.target) {
						this.target = Game.getObjectById(this.memory.target);
						if (this.target) {
							this.state = State.HasEnergy;
							break;
						}
					}
				}

				if (this.state !== State.HasEnergy) {
					this.execute = Execute.Recycle;
					this.state = State.Execute;
				}
                break;
			}

            case State.HasEnergy: {
                if (this.hatGenugEnergie()) {
                    this.execute = Execute.Build;
                    this.state = State.Execute;
                } else {
                    this.state = State.FindEnergySource;
                }

                break;
			}

            case State.IsTargetNear: {
				if (this.creep.pos.getRangeTo(this.target.pos) <= 3 && this.creep.pos.roomName === this.target.pos.roomName) {
                    this.state = State.HasEnergy
					break;
				}

				this.state = State.DoesTargetNeedEnergy;
                break;
			}

            case State.DoesTargetNeedEnergy: {
				if (this.target) {
					this.execute = Execute.MoveTarget;
					this.state = State.Execute;
					break;
				}

				this.target = null;
				this.memory.target = null;
				if (this.doesTargetNeedEnergyAttempts === 0) {
					this.state = State.FindTarget;
					this.doesTargetNeedEnergyAttempts++;
				} else {
					this.state = State.End;
				}

                break;
			}

            case State.FindEnergySource: {
				for (let i = 0; i < 3; i++) {
					if (this.creep.getResourceTarget(RESOURCE_ENERGY, false)) {
						this.state = State.IsSourceNear;
						break;
					}
				}

				if (this.state !== State.IsSourceNear) {
					this.state = State.FindEnergySourceInRemote;
				}
                break;
			}

			case State.FindEnergySourceInRemote: {
				for (let i = 0; i < 3; i++) {
					if (this.creep.getResourceTarget(RESOURCE_ENERGY, true)) {
						this.state = State.IsSourceNear;
						break;
					}
				}

				if (this.state !== State.IsSourceNear) {
					this.execute = Execute.Recycle;
					this.state = State.Execute;
				}
                break;
			}

            case State.IsSourceNear: {
				if (this.creep.memory.energyTarget) {
					const energyTarget = Game.getObjectById(this.creep.memory.energyTarget);

					if (energyTarget && this.creep.pos.getRangeTo(energyTarget.pos) <= 1) {
						this.execute = Execute.Pickup;
						this.state = State.Execute;
						break;
					}
				}

				this.execute = Execute.MoveSource;
				this.state = State.Execute;
                break;
			}

            case State.Execute: {
				this.executeActions();
				this.state = State.End;
                break;
			}

            case State.End: {
				this._updateMemory();
                break;
			}
        }
    }

	hatGenugEnergie() {
		// Pruefe, ob genug Energie vorhanden ist
		// Rueckgabe: true oder false
		const creepCapacity = this.creep.store.getUsedCapacity();

		if (creepCapacity === 0 || this.target === null) {
			this.memory.working = false;
			return false;
		}

		if (this.memory.working) {
			return true;
		}

		/* if (this.target instanceof StructureController) {
			this.memory.working = creepCapacity > 0;
			return creepCapacity > 0;
		} */

		const targetProgress = this.target.progressTotal - this.target.progress;
		const neededEnergy = Math.min(targetProgress, this.creep.store.getCapacity());

		this.memory.working = creepCapacity >= neededEnergy;
		return creepCapacity >= neededEnergy;

	}

	getTask() {
		if (this.creep.memory.task !== '' && this.creep.room.getBuildQueueTask(this.creep.memory.task)) {
			return this.creep.memory.task;
		}

		if (this.creep.room.buildQueue.length < 1) {
			return '';
		}

		return this.creep.room.buildQueue[0].name;
	}

	setTask(taskName: string) {
		if (this.creep.room.getBuildQueueTask(taskName)) {
			this.creep.memory.task = taskName;
		}
	}

	findTarget() {
		const buildQueue = this.creep.room.buildQueue;
		let task = this.getTask();
		let taskStructures: AnyStructure[] = [];
		let i = 0;

		if (task === '' && buildQueue.length <= 0 || !buildQueue) { // || buildQueue.length <= 1
			return false;
		} else {
			this.memory.task = task;
		}

		let queueTask = this.creep.room.getBuildQueueTask(task);

		if (queueTask.structures.length <= 0 && buildQueue.length <= 1) {
			return false;
		}

		if (queueTask.structures.length <= 0 && buildQueue.length > 1) {
			let filteredTasks = buildQueue.filter((element) => element.name != task);
			this.setTask(filteredTasks[0].name);
		}

		// if (task.includes('controller')) {
		// 	if (this.creep.room.controller) {
		// 		this.memory.target = this.creep.room.controller.id;
		// 		return true;
		// 	} else {
		// 		return false;
		// 	}

		// }

		taskStructures = this.creep.room.getBuildQueueTask(task).structures;
		try {
			if (!task.includes('controller')) {
				taskStructures.sort((structureA: AnyStructure, structureB: AnyStructure) => {
					return (structureA instanceof StructureContainer ? (structureB instanceof StructureContainer ? 0 : -1) : (structureB instanceof StructureContainer ? 1 : 0));
				});

				taskStructures.sort((structureA: AnyStructure, structureB: AnyStructure) => {
					return (structureA instanceof StructureRoad ? (structureB instanceof StructureRoad ? 0 : 1) : (structureB instanceof StructureRoad ? -1 : 0));
				});
			}
		} catch {
			console.log("WORKER: Fehler beim sortieren.");
		}


		for (i = 0; i < taskStructures.length; i++) {
			const lookRoom = Game.rooms[taskStructures[i].pos.roomName];
			if (!lookRoom) {
				continue;
			}

			const positionAtTarget = lookRoom.lookForAt(LOOK_CONSTRUCTION_SITES, taskStructures[i].pos.x, taskStructures[i].pos.y);

			if (positionAtTarget.length && positionAtTarget.length > 0) {
				this.memory.target = positionAtTarget[0].id;
				return true;
			} else if (task.includes('controller') && lookRoom.lookForAt(LOOK_STRUCTURES, taskStructures[i].pos.x, taskStructures[i].pos.y).length >= 1) {
				if (this.creep.room.controller) {
					this.memory.target = this.creep.room.controller.id;
					return true;
				} else {
					return false;
				}
			}
		}

		return false;
	}

	executeActions() {
		switch (this.execute) {
			case Execute.Recycle: {
				this.creep.getRescycled();
				break;
			}

			case Execute.Pickup: {
				if (this.creep.memory.energyTarget) {
					let energyTarget = Game.getObjectById(this.creep.memory.energyTarget);
					if (energyTarget === null) {
						break;
					}

					if (energyTarget instanceof Resource) {
						this.creep.pickup(energyTarget);
					} else {
						let targetCapacity = energyTarget.store.getUsedCapacity();
						if (targetCapacity !== null) {
							this.creep.withdraw(energyTarget, RESOURCE_ENERGY, Math.min(this.creep.store.getFreeCapacity(), targetCapacity));
						}

					}
				}
				break;
			}

			case Execute.Build: {
				if (this.memory.target) {
					let buildTarget = Game.getObjectById(this.memory.target);
					let err = -1;
					if (buildTarget === null) {
						break;
					}

					if (buildTarget instanceof StructureController) {
						err = this.creep.upgradeController(buildTarget);
					} else if (buildTarget instanceof ConstructionSite) {
						err = this.creep.build(buildTarget);
					}

					if (err === OK || err === ERR_FULL) {
						this.updateBuildQueueCost()
					}
				}
				break;
			}

			case Execute.MoveTarget: {
				if (this.memory.target) {
					let buildTarget = Game.getObjectById(this.memory.target);

					if (buildTarget !== null) {
						this.creep.travelTo(buildTarget, {ignoreCreeps: false, preferHighway: true,
							range: (buildTarget.pos.roomName === this.creep.pos.roomName || this.creep.pos.isEdge() ? 3 : 0)});
					}
				}
				break;
			}

			case Execute.MoveSource: {
				if (this.creep.memory.energyTarget) {
					let energyTarget = Game.getObjectById(this.creep.memory.energyTarget);

					if (energyTarget !== null && !(energyTarget instanceof Resource)) {
						this.creep.travelTo(energyTarget, {ignoreCreeps: false, preferHighway: true, range: 1});
					}
				}
				break;
			}
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
}
