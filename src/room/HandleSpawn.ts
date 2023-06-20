import { log } from "tools/Logger";
import * as utils from "../utilities";
import { RoomLogic } from "./RoomLogic";

export class HandleSpawn {
	room: Room;
	name: string;
	spawn: StructureSpawn;
	spawnQueue: colonieQueueElement[];
	buildQueue: colonieQueueElement[];
	stats: IColonieStats;
	memory: RoomMemory;
	ticks: number;

	constructor(room: Room, name: string, memory: RoomMemory) {
		this.room = room;
		this.name = name;
		this.memory = memory;
		this.spawn = Game.getObjectById(this.room.colonieMemory.spawns[0]) as StructureSpawn;
		this.spawnQueue = _.cloneDeep(this.room.spawnQueue);
		this.buildQueue = _.cloneDeep(this.room.buildQueue);
		this.stats = _.cloneDeep(this.room.stats);

		this._run();
		this._updateMemory();
	}

	_run(): void {
		this.ticks = Game.time;
		this.checkForInitCreeps();
		this.checkSpawnsNeeded();

		if (this.spawnQueue.length > 0) {
			this.spawnCreepFromQueue();
		}

	}

	_updateMemory(): void {
		this.room.buildQueue = this.buildQueue;
		this.room.spawnQueue = this.spawnQueue;
		this.room.memory.scouted = this.memory.scouted;
		this.room.stats = this.stats;
	}

	checkForInitCreeps() {
		if (this.room.name === this.memory.origin && !this.memory.scouted) {
			this.memory.scouted = true;
			this.room.memory.scouted = true;
			// console.log(this.memory.scouted, this.room.memory.scouted);

			this.spawnQueue.push({
				bodyParts: [MOVE, MOVE, MOVE], name: `scout_W5N8_${Game.time}`, memory: {
					job: "scout",
					working: false,
					target: null,
					origin: this.room.name,
					task: '',
					lastPositions: [] as RoomPosition[],
					pathToTarget: [] as number[],
				}
			});
		}

		if (this.stats.creepsCount < 1) {
			const initMinerName = `init_miner_${this.room.name}_${this.ticks - 1}`;
			const initTransporterName = `init_transporter_${this.room.name}_${this.ticks - 1}`;

			const hasInitMiner = this.spawnQueue.some((entry: colonieQueueElement) => entry.name.includes('init'));
			const hasInitTransporter = this.spawnQueue.some(entry => entry.name.includes('init'));

			if (!hasInitMiner)
				this.spawnQueue.push({
					bodyParts: [WORK, MOVE], name: initMinerName, memory: {
						job: "miner",
						working: false,
						target: null,
						origin: this.room.name,
						task: '',
						lastPositions: [] as RoomPosition[],
						pathToTarget: [] as number[],
					}
				});

			if (!hasInitTransporter)
				this.spawnQueue.push({
					bodyParts: [CARRY, CARRY, MOVE], name: initTransporterName, memory: {
						job: "transporter",
						working: false,
						target: null,
						origin: this.room.name,
						task: '',
						lastPositions: [] as RoomPosition[],
						pathToTarget: [] as number[],
					}
				});
		}
	}

	checkSpawnQueueForJob(job: string, name: string): number {
		for (let i = 0; i < this.spawnQueue.length; i++) {
			if (this.spawnQueue[i].memory?.job == job || (name !== '' && this.spawnQueue[i].name.includes(name)))
				return i;
		}
		return -1;
	}

	getSpawnPriorityList(): string[][] {
		const transporter = this.room.stats.roles.transporter;
		let spawnPriorityList: string[][] = [['', 'init']];

		if (transporter <= 0) {
			spawnPriorityList.push(['transporter', ''], ['miner', ''], ['worker', '']);
		} else if (transporter <= Memory.settings.transporterPerSource * 2) {
			spawnPriorityList.push(['miner', ''], ['transporter', ''], ['worker', '']);
		} else {
			spawnPriorityList.push(['miner', ''], ['worker', ''], ['transporter', '']);
		}

		spawnPriorityList.push(['scout', '']);
		return spawnPriorityList;
	}

	spawnCreepFromQueue() {
		let spawnDetails: colonieQueueElement = { name: '' };
		let spawnDetailIndex: number = -1;
		let generatedBodyParts: BodyPartConstant[] = [];
		let spawnBodyParts: BodyPartConstant[] = [];
		const spawnPriorityList: string[][] = this.getSpawnPriorityList();
		const energyCapacity = this.room.getEnergyCapacity();
		let err = 0;

		if (this.room.energyAvailable < 300 || !this.spawn) {
			return;
		}

		for (let i = 0; i < spawnPriorityList.length; i++) {
			spawnDetailIndex = this.checkSpawnQueueForJob(spawnPriorityList[i][0], spawnPriorityList[i][1]);

			if (spawnDetailIndex >= 0) {
				break;
			}
		}

		if (this.room.stats.roles.transporter > 0 && this.room.energyAvailable < energyCapacity && this.room.stats.totalAvailableEnergy >= energyCapacity) {
			return;
		}

		spawnDetails = this.spawnQueue[spawnDetailIndex];
		generatedBodyParts = this.getBodyParts(this.room.energyAvailable, spawnDetails.memory?.job);

		if (spawnDetails.bodyParts && spawnDetails.bodyParts.length > 0) {
			//this.spawnQueue.splice(spawnDetailIndex, 1);
			spawnBodyParts = spawnDetails.bodyParts;
		} else {
			spawnBodyParts = generatedBodyParts;
		}

		err = this.spawn.spawnCreep(spawnBodyParts, spawnDetails.name, { memory: spawnDetails.memory as CreepMemory });

		if (err === ERR_NOT_ENOUGH_ENERGY) {
			err = this.spawn.spawnCreep(generatedBodyParts, spawnDetails.name, { memory: spawnDetails.memory as CreepMemory });
		}

		if (err == OK) {
			this.spawnQueue.splice(spawnDetailIndex, 1);
		} else if (err == ERR_BUSY) {
			this.spawn.pos.pushCreepsAway();
		} else if (utils.DEBUG) {
			log.error(err.toString());
		}
	}

	checkSpawnsNeeded() {
		let jobs = ['miner', 'transporter', 'worker'];
		let neededCreeps = 0;
		let task = '';
		let i = 0, j = 0;

		for (i = 0; i < jobs.length; i++) {

			switch (jobs[i]) {
				case "miner":
					neededCreeps = (this.stats.resourceCount - this.stats.roles.miner);
					break;

				case "transporter":
					//neededCreeps = Math.min(Math.floor((this.stats.resourceCount * 2 + (this.stats.roles.worker / 4)) - this.stats.roles.transporter), 20);
					neededCreeps = Math.min(Math.floor(this.stats.resourceCount * Memory.settings.transporterPerSource) - this.stats.roles.transporter, 20);
					break;

				case "worker": {
					for (let i = 0; i < this.buildQueue.length; i++) {
						if ((this.buildQueue[i].cost as number) > 0) {
							neededCreeps = this.getWorkerForTask(this.buildQueue[i].name);

							if (neededCreeps > 0) {
								task = this.buildQueue[i].name;
								break;
							}
						}
					}
				}
			}

			_.forEach(this.spawnQueue, spawn => {
				if (spawn.memory && (spawn.memory.job == jobs[i] && spawn.memory.task == task)) {
					neededCreeps--;
				}
			});

			for (j = 0; j < neededCreeps; j++) {
				const creepName = `${jobs[i]}_${this.room.name}_${Game.time + j}`;

				console.log(`SPAWN (${neededCreeps}): Added creep ${creepName} with Task ${task} to spawnQueue`);
				this.spawnQueue.push({
					bodyParts: this.getBodyParts(this.room.energyCapacityAvailable,
						jobs[i]),
					name: creepName,
					memory: {
						job: jobs[i],
						working: false,
						target: null,
						task: task,
						origin: this.room.name,
						lastPositions: [],
						pathToTarget: [],
					}
				});
			}
		}
	}

	addPart(body: { parts: BodyPartConstant[] }, available: { energy: number; }, count: number, part: BodyPartConstant) {
		for (let i = 0; i < count; i++) {
			body.parts.push(part);
			available.energy -= BODYPART_COST[part];
		}
	}

	getBodyParts(availableEnergy: number, job?: string): BodyPartConstant[] {
		const body = { parts: [] };
		const available = { energy: availableEnergy };
		let firstPart = 0;

		switch (job) {
			case 'miner':
				firstPart = Math.floor((availableEnergy - 50) / 100);

				this.addPart(body, available, (firstPart >= 6 ? 6 : firstPart), WORK);
				this.addPart(body, available, 1, MOVE);
				break;

			case 'transporter':
				firstPart = Math.floor((availableEnergy / 2) / 50);

				this.addPart(body, available, firstPart, MOVE);
				this.addPart(body, available, Math.floor(available.energy / 50), CARRY);
				break;

			case 'worker':
				const firstPartCount = this.calculateBodyParts(availableEnergy);

				this.addPart(body, available, firstPartCount.WORK, WORK);
				this.addPart(body, available, firstPartCount.CARRY, CARRY);
				this.addPart(body, available, firstPartCount.MOVE, MOVE);
				break;
		}

		return body.parts;
	}

	calculateBodyParts(energy: number) {
		const energyAvailable = Math.floor(energy / 50);
		const isOdd = energyAvailable % 2 !== 0;
		const energyHalf = Math.floor(energyAvailable / 2);
		const energyFourth = Math.floor(energyHalf / 2);

		const partCount = {
			WORK: energyFourth,
			CARRY: energyFourth,
			MOVE: energyFourth,
		};

		/*
		const energyHalf = Math.floor(energyAvailable / 2);
		const partCount = {
			WORK: Math.ceil(energyHalf / 4),
			CARRY: 0,
			MOVE: Math.floor(energyHalf / 2) + (isOdd ? 1 : 0),
		};

		let remainingEnergy = energyAvailable - (partCount.WORK * 2 + partCount.MOVE);

		if (remainingEnergy > 0) {
			partCount.CARRY = Math.floor(remainingEnergy / 2);
			partCount.MOVE += remainingEnergy - partCount.CARRY;
		} */

		const totalCost = Object.keys(partCount).reduce((sum, part) => {
			return sum + BODYPART_COST[part as BodyPartConstant] * BODYPART_COST[part as BodyPartConstant];
		}, 0);

		return partCount;
	}

	getWorkerForTask(task: string) {
		if (!task || task == '') {
			return 0;
		}

		const taskData = this.buildQueue.find((item) => item.name == task);
		if (!taskData || (taskData.cost && taskData.cost <= 0)) {
			return 0;
		}

		const taskCost: number = taskData.cost as number;
		const workBodyPartCount = this.calculateBodyParts(this.room.energyCapacityAvailable || this.room.energyAvailable).WORK;
		const workloadPerThousandTicks = workBodyPartCount * (task.includes('controller') ? 1000 : 5000);
		let creepSpawnCount = Math.ceil(taskCost / workloadPerThousandTicks);

		if (taskData.neededCreeps && taskData.neededCreeps <= -1) {
			taskData.neededCreeps = Math.min(creepSpawnCount, 20);
		} else {
			const creepCount = _.filter(Game.creeps, (creep) => creep.memory.job == 'worker' && creep.getTask() == task).length;
			creepSpawnCount = Math.max(0, (taskData.neededCreeps as number) - creepCount);
		}

		creepSpawnCount = Math.min(creepSpawnCount, 20);
		return creepSpawnCount;
	}

}
