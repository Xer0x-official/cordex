import { TransportManager } from "logistics/TransportManager";

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
    task: TransportTask | null = null;

	constructor(creep: Creep, memory: CreepMemory) {
		this.creep = creep;
		this.memory = memory
		this.name = this.creep.name;
		this.state = State.Start;
		this.stateGraph = [this.name];
        this.task = TransportManager.getTaskForCreep(this.creep);

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
                if (!this.task) {
                    // keine Aufgabe – nichts zu tun
                    this.state = State.End;
                    break;
                }
                // Setze Energie‑ und Ziel‑ID aus der Aufgabe
                this.memory.energyTarget = this.task.originId;
                this.memory.target = this.task.targetId;
                // merke dir, wie viel Energie du holen sollst
                this.memory.amountAssigned = this.task.amount;
                this.memory.working = false;
                this.state = State.HasEnergy;
                break;
            }

            case State.HasEnergy: {
                // Prüfe, ob genügend Energie für diese Aufgabe vorhanden ist

                const target = Game.getObjectById(this.memory.target!);
                if (!target) {
                    // Ziel existiert nicht mehr, Aufgabe aufgeben
                    this.clearTask();
                    this.state = State.End;
                    break;
                }

                let neededEnergy = -1;
                if ('store' in target) neededEnergy = target.store.getFreeCapacity(RESOURCE_ENERGY);

                let creepCapacity = this.creep.store.getUsedCapacity();

                const enough = (neededEnergy > 0 && creepCapacity >= neededEnergy) ||
                    (creepCapacity >= this.memory.amountAssigned) ||
                    this.creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0;

                if (enough) {
                    this.state = State.IsTargetNear;
                } else {
                    this.state = State.FindEnergySource; // Energie holen
                }
                break;
            }

            // In IsTargetNear:
            case State.IsTargetNear: {
                const target = Game.getObjectById(this.memory.target!);
                if (!target) {
                    // Ziel existiert nicht mehr, Aufgabe aufgeben
                    this.clearTask();
                    this.state = State.End;
                    break;
                }
                if (this.creep.pos.getRangeTo(target.pos) <= 1) {
                    this.execute = Execute.Transfer;
                } else {
                    this.execute = Execute.MoveTarget;
                }
                this.state = State.Execute;
                break;
            }

            // In FindEnergySource:
            case State.FindEnergySource: {
                // Hol die zugewiesene Energiequelle
                const source = Game.getObjectById(this.memory.energyTarget!);
                if (!source) {
                    this.clearTask();
                    this.state = State.End;
                    break;
                }

                if (this.creep.pos.getRangeTo(source.pos) <= 1) {
                    this.execute = Execute.Pickup;
                } else {
                    this.execute = Execute.MoveSource;
                }
                this.state = State.Execute;
                break;
            }

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

			case State.IsSourceNear: {
				if (this.memory.energyTarget) {
					const energyTarget = Game.getObjectById(this.memory.energyTarget);

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
                const source: any = Game.getObjectById(this.memory.energyTarget!);
                if (!source) {
                    this.clearTask();
                }

				const amount = Math.min(this.memory.amountAssigned!, this.creep.store.getFreeCapacity());
				if (source instanceof Resource) {
					this.creep.pickup(source);
				} else {
					let withdraw = this.creep.withdraw(source, RESOURCE_ENERGY, amount);
					if (withdraw == ERR_NOT_ENOUGH_ENERGY) {
                        this.clearTask();
                    }
                }
                break;
            }

            case Execute.Transfer: {
                // Neu: Versuche zunächst, Energie an anderen Transporter zu übergeben
                if (this.attemptTransferToTransporter()) {
                    // wir haben die Energie übergeben; Aufgabe beendet, daher break
                    console.log("transfer transfer");
                    break;
                }

                const target: any = Game.getObjectById(this.memory.target!);
                if (target && 'store' in target) {
                    const amount = Math.min(this.memory.amountAssigned!, target.store.getFreeCapacity(RESOURCE_ENERGY), this.creep.store.getUsedCapacity());
                    this.creep.transfer(target, RESOURCE_ENERGY, amount);
                    this.memory.amountAssigned! -= amount;
                }

                if (this.memory.amountAssigned! < 1 || !target || target.store.getFreeCapacity(RESOURCE_ENERGY) < 1) {
                    this.clearTask(); // Aufgabe erledigt oder Ziel tot
                }
                break;
            }

			case Execute.MoveTarget: {
                // Neu: Wenn wir noch nicht beim Ziel sind, prüfen, ob ein anderer Transporter vor uns steht
                if (this.attemptTransferToTransporter()) {
                    console.log("move transfer");
                    // Übergabe hat stattgefunden; wir müssen nicht mehr zum Ziel laufen
                    break;
                }

				if (this.memory.target) {
					let transferTarget = Game.getObjectById(this.memory.target);

					if (transferTarget !== null) {
						this.creep.travelTo(transferTarget, { ignoreCreeps: false, preferHighway: true, range: 1 });
					}
				}
				break;
			}

			case Execute.MoveSource: {
				if (this.memory.energyTarget) {
					let energyTarget = Game.getObjectById(this.memory.energyTarget);

					if (energyTarget !== null) {
						this.creep.travelTo(energyTarget, { ignoreCreeps: false, preferHighway: true, range: 1 });
					}
				}
				break;
			}
		}
	}

    private clearTask() {
        delete this.creep.memory.transportTask;
        delete this.memory.target;
        this.memory.energyTarget = null;
        this.memory.amountAssigned = 0;
        this.task = null;
        this.memory.working = false;
    }

    private attemptTransferToTransporter(): boolean {
        // Kein Ziel hinterlegt? Dann können wir nichts übergeben.
        const myTargetId = this.memory.target;
        if (!myTargetId) return false;

        const transferTarget = Game.getObjectById(myTargetId);
        if (!transferTarget) return false;

        // Finde andere Transporter in Reichweite 1
        const others: Creep[] = this.creep.pos.findInRange(FIND_MY_CREEPS, 1).filter(c =>
            c.id !== this.creep.id &&
            c.memory.job === 'transporter' &&
            c.memory.target === myTargetId
        );
        // Suche den, der näher am Ziel steht
        let recipient: Creep | null = null;
        for (const other of others) {
            if (other.pos.getRangeTo(transferTarget.pos) < this.creep.pos.getRangeTo(transferTarget.pos)) {
                if (other.store.getFreeCapacity() > 0) {
                    recipient = other;
                    break;
                }
            }
        }
        if (!recipient) return false;

        const amount = Math.min(this.creep.store.getUsedCapacity(), recipient.store.getFreeCapacity());
        if (amount <= 0) return false;

        const result = this.creep.transfer(recipient, RESOURCE_ENERGY, amount);
        if (result === OK) {
            // Aufgabe bei uns als erledigt markieren
            if (this.memory.amountAssigned !== undefined) {
                this.memory.amountAssigned -= amount;
            }
            // optional: dem Empfänger mitteilen, dass er mehr liefern soll
            if (recipient.memory.amountAssigned !== undefined) {
                recipient.memory.amountAssigned += amount;
            }
            // Aufgabe löschen
            this.clearTask();
            return true;
        }
        return false;
    }

}
