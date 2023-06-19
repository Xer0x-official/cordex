import * as utils from "../utilities";

export class Miner implements ICreepClass{
	creep: Creep;
	memory: CreepMemory;
	target: Source | null;
	name: string;

	constructor(creep: Creep, memory: CreepMemory) {
		this.creep = creep;
		this.name = this.creep.name;
		this.memory = memory;
		this.target = Game.getObjectById(this.creep.target as Id<Source>);
		this._run();
	}

	_run() {
		this.creep.say('⛏');

		if (!this.target || this.target == null) {
			let target = this.getSourceTarget();
			if (!target && utils.DEBUG ) {
				console.log(`CREEP (${this.creep.name}): Konnte das Ziel ${target} nicht setzen.`);
			} else {
				this.creep.target = target;
				this.memory.target = this.creep.target;
			}
		}

		if (this.target) {
			let target = this.creep.room.lookForAt(LOOK_SOURCES, this.target.pos.x, this.target.pos.y)[0];
			this.creep.harvestTarget(target);
		}

		this.memory.routing = this.creep.memory.routing;
		this.creep.memory = this.memory;

		if (this.creep.aboutToDie() && this.creep.memory.target) {
			this.creep.room.colonieMemory.resources.energy[this.creep.memory.target as Id<Source>] = null;
		}
	}

	getSourceTarget() {
		//let sourceFlags = _.filter(Game.flags, flag => flag.name.includes('source') && flag.room == this.creep.room);
		let target: Id<Source> | null = null;

		let possibleTargets = Object.keys(this.creep.room.colonieMemory.resources.energy);
		for (const element of possibleTargets) {
			console.log(`${element} -> ${this.creep.room.colonieMemory.resources.energy[element as Id<Source>]}`);
			if (this.creep.room.colonieMemory.resources.energy[element as Id<Source>] === null) {
				target = element as Id<Source>;
				break;
			}
		}

		/* for (let i = 0; i < sourceFlags.length; i++) {
			for (let name in Game.creeps) {
				if (
					sourceFlags[i] &&
					Game.creeps[name].memory.target &&
					Game.creeps[name].memory.target.name &&
					Game.creeps[name].memory.target.name == sourceFlags[i].name
				) {
					sourceFlags.splice(i, 1);
				}
			}
		} */

		if (target !== null) {
			this.creep.room.colonieMemory.resources.energy[target] = this.creep.id;
			return target;
		} else {
			return null;
		}
	}
}
