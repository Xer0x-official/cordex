
import {Miner} from "./Miner";
import { Transporter } from "./Transporter";

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
/* 			case "scout":
				new Scout(this.creep, this.memory);
				break;
			case "worker":
				worker(this.creep);
				break; */

			default:
				this.creep.suicide();
		}

		this._updateMemory();
	}

	_updateMemory() {
		this.memory.routing = this.creep.memory.routing;
		this.creep.memory = this.memory;
	}
}
