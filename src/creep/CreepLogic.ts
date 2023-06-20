
import {Miner} from "./Miner";
import { Transporter } from "./Transporter";
import { Worker } from "./Worker";
import { Scout } from "./Scout";

export class CreepLogic implements ICreepClass {
	creep: Creep;
	name: string;
	memory: CreepMemory;

	constructor(creep: Creep, name: string) {
		this.creep = creep;
		this.name = name;
		this.memory = _.cloneDeep(this.creep.memory);
	}

	_run() {
		if (!this.memory) {
			return;
		}

		switch (this.memory.job) {
			case "miner":
				new Miner(this.creep, this.memory);
				break;
			case "transporter":
				new Transporter(this.creep, this.memory);
				break;
			case "scout":
				new Scout(this.creep, this.memory);
				break;
			case "worker":
				new Worker(this.creep, this.memory);
				break;

			default:
				this.creep.suicide();
		}

		this._updateMemory();
	}

	_updateMemory() {
		if (this.creep.memory._trav) {
			this.memory._trav = this.creep.memory._trav;
		}

		this.memory.routing = this.creep.memory.routing;
		this.memory.energyTarget = this.creep.memory.energyTarget;
		this.creep.memory = this.memory;
	}
}
