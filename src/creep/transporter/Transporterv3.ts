import { TransportManager } from "managers/TransportManager";

enum State {
	Start,
	HasTarget,
	FindTarget,
	HasEnergy,
	IsTargetNear,
	DoesTargetNeedEnergy,
	FindEnergySource,
	IsSourceNear,
	Execute,
	End
}

enum Execute {
	Pickup,
	Transfer,
	MoveTarget,
	MoveSource,
}

export class Transporter implements ICreepClass {
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
		this.stateGraph = [this.name];

		this._run();
		// console.log(this.stateGraph);
	}

	_run() {
		try {
			while (this.state !== State.End) {
				this.runAutomat();
			}
		} catch(err) {
			console.log(`Failed on exetuting Automat ${err}`);
		}

		this._updateMemory();
	}

	_updateMemory() {
		this.memory.energyTarget = this.creep.memory.energyTarget;
	}

	runAutomat() {
		switch (this.state) {
			case State.Start: {
				this.state = State.HasEnergy;
				this.stateGraph.push('Start');
				break;
			}
            // case State.Start: {
            //     const task = TransportManager.getTaskForCreep(this.creep);
            //     if (task) {
            //         this.memory.energyTarget = task.originId;
            //         this.memory.target = task.targetId;
            //         this.memory.amountAssigned = task.amount;
            //     }
            //     this.state = State.HasEnergy;
            //     break;
			// }

			case State.HasTarget: {
				if (this.memory.target && this.memory.target !== null) {
					this.target = Game.getObjectById(this.memory.target);

					if (this.target) {
						this.state = State.IsTargetNear;
						this.stateGraph.push('IsTargetNear');
						break;
					}
				}

				this.target = null;
				this.state = State.FindTarget;
				this.stateGraph.push('FindTarget');
				break;
			}

			case State.FindTarget: {
				for (let i = 0; i < 3; i++) {
					if (this.findTarget() && this.memory.target) {
						this.target = Game.getObjectById(this.memory.target);
						if (this.target) {
							this.state = State.IsTargetNear;
							this.stateGraph.push('FindTarget/IsTargetNear');
							break;
						}
					}
				}

				if (this.state !== State.IsTargetNear) {
					this.state = State.End;
					this.stateGraph.push('FindTarget/End');
				}
				break;
			}

			case State.HasEnergy: {
				if (this.hatGenugEnergie()) {
					this.state = State.HasTarget;
					this.stateGraph.push('HasTarget');
				} else {
					this.state = State.FindEnergySource;
					this.stateGraph.push('FindEnergySource');
				}

				break;
			}

			case State.IsTargetNear: {
				if (this.creep.pos.getRangeTo(this.target.pos) <= 1) {
					this.execute = Execute.Transfer;
					this.state = State.Execute;
					this.stateGraph.push('Transfer');
					break;
				}

				this.state = State.DoesTargetNeedEnergy;
				this.stateGraph.push('DoesTargetNeedEnergy');
				break;
			}

			case State.DoesTargetNeedEnergy: {
				if (this.target) {
					this.execute = Execute.MoveTarget;
					this.state = State.Execute;
					this.stateGraph.push('MoveToTarget');
					break;
				}


				this.target = null;
				this.memory.target = null;
				if (this.doesTargetNeedEnergyAttempts === 0) {
					this.state = State.FindTarget;
					this.doesTargetNeedEnergyAttempts++;
					this.stateGraph.push('DoesTargetNeedEnergy/FindTarget');
				} else {
					this.state = State.End;
					this.stateGraph.push('DoesTargetNeedEnergy/End');
				}

				break;
			}

			case State.FindEnergySource: {
				for (let i = 0; i < 3; i++) {
					if (this.creep.getResourceTarget() && this.creep.memory.energyTarget) {
						this.state = State.IsSourceNear;
						this.stateGraph.push('IsSourceNear');
						break;
					}
				}

				if (this.state !== State.IsSourceNear) {
					this.memory.energyTarget = null;
					this.state = State.End;
					this.stateGraph.push('FindEnergySource/End');
				}
				break;
			}

			case State.IsSourceNear: {
				if (this.creep.memory.energyTarget) {
					const energyTarget = Game.getObjectById(this.creep.memory.energyTarget);

					if (energyTarget && this.creep.pos.getRangeTo(energyTarget.pos) <= 1) {
						this.execute = Execute.Pickup;
						this.state = State.Execute;
						this.stateGraph.push('Pickup');
						break;
					}
				}

				this.execute = Execute.MoveSource;
				this.state = State.Execute;
				this.stateGraph.push('IsSourceNear/End');
				break;
			}

			case State.Execute: {
				this.executeActions();
				this.state = State.End;
				this.stateGraph.push('Execute/End');
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

		if (creepCapacity === 0) {
			this.memory.working = false;
			return false;
		}

		if (this.memory.working) {
			return true;
		}

		if (this.target) {
			const targetNeedenEnergy = this.target.store.getFreeCapacity();
			const neededEnergy = Math.min(targetNeedenEnergy, this.creep.store.getCapacity());
			const hasEnoughEnergy = creepCapacity >= neededEnergy;

			this.memory.working = hasEnoughEnergy;
			return hasEnoughEnergy;
		} else if ( this.creep.store.getFreeCapacity() === 0) {
			this.memory.working = true;
			return true;
		}
		return false;
	}

	getTask() {
		if (this.creep.room.getBuildQueueTask(this.creep.memory.task)) {
			return this.creep.memory.task;
		}

		if (this.creep.room.buildQueue.length < 1) {
			return '';
		}

		return this.creep.room.buildQueue[0].name;
	}

	findTarget() {
		const sequence = [STRUCTURE_EXTENSION, STRUCTURE_SPAWN, STRUCTURE_TOWER, FIND_MY_CREEPS, STRUCTURE_CONTAINER, STRUCTURE_LINK, STRUCTURE_TERMINAL, STRUCTURE_STORAGE];
		let targetWithoutEnoughEnergy: (StructureWithStorage | AnyCreep)[] = [];
		const originRoom = Game.rooms[this.creep.memory.origin];

		// Hilfsfunktion zum Prüfen von Energiekapazität
		const isEnoughCapacity = (structure: Structure<StructureConstant>) => {
			if (structure.structureType !== STRUCTURE_TOWER && structure instanceof StructureStorage) {
				return structure.store.getFreeCapacity(RESOURCE_ENERGY) <= 0;
			} else if (structure.structureType === STRUCTURE_TOWER && structure instanceof StructureTower) {
				return structure.store.getFreeCapacity(RESOURCE_ENERGY) <= structure.store.getCapacity(RESOURCE_ENERGY) * 0.5;
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
						structure && structure.structureType === structureType &&
						(((structure instanceof StructureStorage || structure instanceof StructureTower) && !isEnoughCapacity(structure)) ||
						!(structure instanceof StructureStorage || structure instanceof StructureTower) && (structure as StructureWithStorage).store.getFreeCapacity(RESOURCE_ENERGY) > 0)
					) as StructureWithStorage[];
			}
			return targetWithoutEnoughEnergy.length > 0;
		});

		// Kein Ziel gefunden
		if (targetWithoutEnoughEnergy.length < 1) return false;

		// Bei nur einem Ziel, sofort zurückgeben
		if (targetWithoutEnoughEnergy.length === 1) {
			this.memory.target = targetWithoutEnoughEnergy[0].id;
			return true;
		}

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

		if (targetWithoutEnoughEnergy[0]) {
			this.memory.target = targetWithoutEnoughEnergy[0].id;
			return true;
		}
		return false;
	}

	executeActions() {
		switch (this.execute) {
			case Execute.Pickup: {
				if (this.creep.memory.energyTarget) {
					let energyTarget = Game.getObjectById(this.creep.memory.energyTarget);
					if (energyTarget === null) {
						break;
					}

					let err = 0;
					if (energyTarget instanceof Resource) {
						err = this.creep.pickup(energyTarget);
					} else {
						let targetCapacity = energyTarget.store.getUsedCapacity();
						if (targetCapacity !== null) {
							err = this.creep.withdraw(energyTarget, RESOURCE_ENERGY, Math.min(this.creep.store.getFreeCapacity(), targetCapacity));
						}
					}

					if (err === ERR_NOT_ENOUGH_RESOURCES || err === ERR_INVALID_TARGET) {
						this.memory.energyTarget = null;
					}
				}
				break;
			}

			case Execute.Transfer: {
				if (this.memory.target) {
					let transferTarget = Game.getObjectById(this.memory.target) as StructureWithStorage;
					if (!transferTarget || !transferTarget.store) {
						this.stateGraph.push('cansel Transfer')
						break;
					}

					const transferTargetFreeCapacity = transferTarget.store.getFreeCapacity();
					let err = this.creep.transfer(transferTarget, RESOURCE_ENERGY, Math.min(this.creep.store.getUsedCapacity(), (transferTargetFreeCapacity === null ? 0 : transferTargetFreeCapacity)))

					this.memory.target = null;
					this.stateGraph.push(`made Transfer with err:${err}`);
					break;
				}
				this.stateGraph.push('done nothing');
				break;
			}

			case Execute.MoveTarget: {
				if (this.memory.target) {
					let transferTarget = Game.getObjectById(this.memory.target);

					if (transferTarget !== null) {
						this.creep.travelTo(transferTarget, { ignoreCreeps: false, preferHighway: true, range: 1 });
					}
				}
				break;
			}

			case Execute.MoveSource: {
				if (this.creep.memory.energyTarget) {
					let energyTarget = Game.getObjectById(this.creep.memory.energyTarget);

					if (energyTarget !== null) {
						this.creep.travelTo(energyTarget, { ignoreCreeps: false, preferHighway: true, range: 1 });
					}
				}
				break;
			}
		}
	}
}
