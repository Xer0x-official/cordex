

export class Worker implements ICreepClass {
	creep: Creep;
	name: string;
	memory: CreepMemory;
	state: string;
	stateCounter: number;
	target: any;
	immerNochEnergieFlag: boolean;

	constructor(creep: Creep, memory: CreepMemory) {
		this.creep = creep;
		this.name = this.creep.name;
		this.memory = memory;
		this.stateCounter = 0;
		this.state = '';
		this.immerNochEnergieFlag = false;

		if (this.creep.spawning) {
			return;
		}

		this._run();
	}

	_run() {
		this.state = 'start';

		if (this.hatZiel()) {
			this.hatGenugEnergie();
		} else {
			this.sucheZiel();
		}
	}

	_updateMemory() {
		console.log("mem Update");
	}

	hatZiel() {
		// Pruefe, ob ein Ziel vorhanden ist
		// Rueckgabe: true oder false

	}

	hatGenugEnergie() {
		this.state = 'hetGenugEnegie';
		if (this.genugEnergie()) {
			if (this.istZielInDerNaehe()) {
				this.ausfuehren();
			} else {
				this.brauchtZielImmerNochEnergie();
			}
		} else {
			this.sucheEnergieQuelle();
		}
	}

	sucheZiel() {
		this.state = 'sucheZiel';

		if (this.hatZiel()) {
			this.hatGenugEnergie();
		} else {
			if (this.stateCounter <= 2) {
				this.zielSuche();
			} else {
				this.ausfuehren();
			}
		}
	}

	genugEnergie() {
		// Pruefe, ob genug Energie vorhanden ist
		// Rueckgabe: true oder false
		const creepCapacity = this.creep.store.getUsedCapacity();

		if (creepCapacity === 0) {
			return false;
		}

		if (this.target instanceof StructureController) {
			return this.creep.store.getFreeCapacity() === 0;
		}

		const targetProgress = this.target.progressTotal - this.target.progress;
		const neededEnergy = Math.min(targetProgress, this.creep.store.getCapacity());

		return creepCapacity === neededEnergy;
	}

	istZielInDerNaehe() {
		// Pruefe, ob das Ziel in der Naehe ist
		// Rueckgabe: true oder false
		this.state = 'istZielInDerNaehe';

		return this.creep.pos.getRangeTo(this.target.pos) <= 3;
	}

	brauchtZielImmerNochEnergie() {
		this.state = 'brauchtZielImmerNochEnergie';
		if (this.immerNochEnergieFlag) {
			this.end();
		}

		if (this.brauchZielNochEnergie()) {
			this.ausfuehren();
		} else {
			this.immerNochEnergieFlag = true;
			this.sucheZiel();
		}
	}

	sucheEnergieQuelle() {
		this.state = 'sucheEnergieQuelle';
		if (this.energieQuelleGefunden()) {
			if (this.energieQuelleInDerNaehe()) {
				this.ausfuehren();
			} else {
				if (this.istQuelleNochValide()) {
					this.sucheEnergieQuelle();
				} else {
					this.ausfuehren();
				}
			}
		} else {
			if (this.sucheWiederholen()) {
				this.sucheEnergieQuelle();
			} else {
				this.end();
			}
		}
	}

	brauchZielNochEnergie() {
		if (this.target) {
			return true;
		}

		this.target = null;
		this.memory.target = null;
		return false;
	}

	zielGefunden() {
		// Pruefe, ob ein Ziel gefunden wurde
		// Rueckgabe: true oder false
	}

	sucheWiederholen() {
		// Pruefe, ob die Suche wiederholt werden soll
		// Rueckgabe: true oder false
	}

	energieQuelleGefunden() {
		// Pruefe, ob eine Energiequelle gefunden wurde
		// Rueckgabe: true oder false
		return this.creep.getResourceTarget()
	}

	energieQuelleInDerNaehe() {
		// Pruefe, ob die Energiequelle in der Naehe ist
		// Rueckgabe: true oder false
	}

	istQuelleNochValide() {
		// Pruefe, ob die Energiequelle noch gueltig ist
		// Rueckgabe: true oder false
	}

	ausfuehren() {
		// Fuehre die Aktion aus
		let err = 0;

		switch(this.state) {
			case 'istZielInDerNähe': {

				if (this.target instanceof StructureController) {
					err = this.creep.upgradeController(this.target);
				} else {
					err = this.creep.build(this.target);
				}

				if (err === OK) {
					this.updateBuildQueueCost();
				}

				this.end();
				break;
			}

			case 'brauchtZielImmerNochEnergie': {
				this.creep.travelTo(this.target, {ignoreCreeps: false, preferHighway: true, range: 3});
				this.end()
				break;
			}

			case 'sucheZiel': {
				this.creep.getRescycled();
				this.end();
				break;
			}
		}
	}

	end() {
		// Endzustand
		this._updateMemory();
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

	getTask() {
		if (this.creep.room.getBuildQueueTask(this.creep.memory.task)) {
			return this.creep.memory.task;
		}

		if (this.creep.room.buildQueue.length < 1) {
			return '';
		}

		return this.creep.room.buildQueue[0].name;
	}

	zielSuche() {
		this.stateCounter++;

		if (this.stateCounter > 2) {
			return;
		}

		const task = this.getTask();
		const buildQueue = this.creep.room.buildQueue;
		let taskStructures = [];
		let i = 0;

		if (task === '') {
			this.zielSuche()
			return;
		} else {
			this.creep.memory.task = task;
		}

		if (!buildQueue || buildQueue.length < 1) {
			this.zielSuche()
			return;
		}

		taskStructures = this.creep.room.getBuildQueueTask(task).structures;

		for (i = 0; i < taskStructures.length; i++) {
			const lookRoom = Game.rooms[taskStructures[i].pos.roomName];
			if (!lookRoom) {
				continue;
			}
			const positionAtTarget = lookRoom.lookForAt(LOOK_CONSTRUCTION_SITES, taskStructures[i].pos);

			if (positionAtTarget.length > 0) {
				this.memory.target = positionAtTarget[0].id;
				return;
			}

		}

		this.zielSuche();
		return;
	}

}
