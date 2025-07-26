import * as utils from "../utilities";

export class Miner implements ICreepClass {
	creep: Creep;
	memory: CreepMemory;
	target: Id<Source> | null;
	name: string;

	constructor(creep: Creep, memory: CreepMemory) {
		this.creep = creep;
		this.name = this.creep.name;
		this.memory = memory;
		//this.target = Game.getObjectById(this.creep.target as Id<Source>);
		this._run();
		this.cleanResources();
	}

	_run() {
		if (!this.memory.target) {
			let target = this.getSourceTarget();

			if (!target) {
				console.log(`CREEP (${this.creep.name}): Konnte das Ziel ${target} nicht setzen.`);
				this.creep.suicide();
			} else {
				this.creep.target = target;
				this.memory.target = target;
			}
		}

		// let targetObject = Game.getObjectById(this.creep.target as Id<Source>);
        let target = this.creep.room.colonieMemory.resources.energy[this.memory.target as Id<Source>];

		if (this.creep.room && target.pos.roomName !== this.creep.room.name) {
			this.creep.say('🗺️');
            this.creep.harvestTarget(this.creep.room.colonieMemory.resources.energy[this.memory.target as Id<Source>], true);
		} else {
			let targetObject = Game.getObjectById(this.creep.target as Id<Source>);
			if (targetObject !== null) {
				let target = this.creep.room.lookForAt(LOOK_SOURCES, targetObject.pos.x, targetObject.pos.y)[0];
				this.creep.harvestTarget(target, false);
				this.creep.say('⛏');
			}
		}
/*
		if (this.memory.target !== null && this.creep.room.colonieMemory.resources.energy[this.memory.target as Id<Source>].pos.roomName !== this.creep.room.name) {
			this.creep.say('🗺️');
			this.creep.harvestTarget(this.creep.room.colonieMemory.resources.energy[this.memory.target as Id<Source>]);
		} */

		this.memory.routing = this.creep.memory.routing;
		this.creep.memory = this.memory;

		if (this.creep.aboutToDie() && this.creep.memory.target) {
			this.creep.room.colonieMemory.resources.energy[this.creep.memory.target as Id<Source>].miner = null;
		}
	}

	cleanResources() {
		_.forEach(Object.keys(this.creep.room.colonieMemory.resources.energy), resource => {
			if (Game.getObjectById(this.creep.room.colonieMemory.resources.energy[resource as Id<Source>].miner as Id<Creep>) === null) {
				this.creep.room.colonieMemory.resources.energy[resource as Id<Source>].miner = null;
			}
		});
	}

	getSourceTarget() {
		//let sourceFlags = _.filter(Game.flags, flag => flag.name.includes('source') && flag.room == this.creep.room);
		let target: Id<Source> | null = null;
		let possibleTargets = this.creep.room.colonieMemory.resources.energy;
		let possibleTargetsKeys = Object.keys(possibleTargets);

		_.remove(possibleTargetsKeys, (key: Id<Source>) => {
			return possibleTargets[key].miner !== null;
		});

		if (possibleTargetsKeys.length > 0) {
			target = possibleTargetsKeys[0] as Id<Source>;
		}
		/* 	for (const element of possibleTargets) {
				// console.log(`${element} -> ${this.creep.room.colonieMemory.resources.energy[element as Id<Source>]}`);
				if (this.creep.room.colonieMemory.resources.energy[element as Id<Source>] === null) {
					target = element as Id<Source>;
					break;
				}
			}
	 */
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
			this.creep.room.colonieMemory.resources.energy[target].miner = this.creep.id;
			return target;
		} else {
			return null;
		}
	}
}
