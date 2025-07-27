import { log } from "utilities/Logger";
import * as utils from "../utilities";
import { RoomLogic } from "./RoomLogic";
import { maxWorkersForTarget, workersNeededForProject, getBuilderBody } from '../utilities/ManagementPlan';

export class HandleSpawn {
	room: Room;
	name: string;
	spawn: StructureSpawn;
	spawnQueue: spawnQueueElement[];
	buildQueue: buildQueueElement[];
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
				bodyParts: [MOVE, MOVE, MOVE],
                name: `scout_W5N8_${Game.time}`,
                memory: {
					job: "scout",
					working: false,
					cost: 150,
					target: null,
					origin: this.room.name,
                    amountAssigned: 0,
					task: '',
					lastPositions: [] as RoomPosition[],
					pathToTarget: [] as number[],
				}
			});
		}

		if (this.stats.creepsCount < 1) {
			const initMinerName = `init_miner_${this.room.name}_${this.ticks - 1}`;
			const initTransporterName = `init_transporter_${this.room.name}_${this.ticks - 1}`;

			const hasInitMiner = this.spawnQueue.some((entry: spawnQueueElement) => entry.name.includes('init'));
			const hasInitTransporter = this.spawnQueue.some(entry => entry.name.includes('init'));

			if (!hasInitMiner)
				this.spawnQueue.push({
					bodyParts: [WORK, MOVE],
                    name: initMinerName,
                    memory: {
						job: "miner",
						working: false,
						cost: 150,
						target: null,
						origin: this.room.name,
                        amountAssigned: 0,
						task: '',
						lastPositions: [] as RoomPosition[],
						pathToTarget: [] as number[],
					}
				});

			if (!hasInitTransporter)
				this.spawnQueue.push({
					bodyParts: [CARRY, CARRY, MOVE],
                    name: initTransporterName,
                    memory: {
						job: "transporter",
						working: false,
						cost: 150,
						target: null,
						origin: this.room.name,
                        amountAssigned: 0,
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
		const worker = this.room.stats.roles.worker;
		let spawnPriorityList: string[][] = [['', 'init']];

		if (transporter <= Memory.settings.transporterPerSource) {
			spawnPriorityList.push(['transporter', ''], ['miner', ''], ['worker', '']);
		} else if (transporter < this.room.stats.roles.miner && (this.room.buildQueue.length <= 0 || this.room.buildQueue.length > 0 && worker > 0)) {
			spawnPriorityList.push(['miner', ''], ['transporter', ''], ['worker', '']);
		} else {
			spawnPriorityList.push(['miner', ''], ['worker', ''], ['transporter', '']);
		}

		spawnPriorityList.push(['scout', '']);
		return spawnPriorityList;
	}

	// spawnCreepFromQueue() {
	// 	let spawnDetails: colonieQueueElement = { name: '' };
	// 	let spawnDetailIndex: number = -1;
	// 	let generatedBodyParts: BodyPartConstant[] = [];
	// 	let spawnBodyParts: BodyPartConstant[] = [];
	// 	const spawnPriorityList: string[][] = this.getSpawnPriorityList();
	// 	const energyCapacity = this.room.getEnergyCapacity();
	// 	let err = 0;
    //
	// 	if (this.room.energyAvailable < 300 || !this.spawn) {
	// 		return;
	// 	}
    //
	// 	for (let i = 0; i < spawnPriorityList.length; i++) {
	// 		spawnDetailIndex = this.checkSpawnQueueForJob(spawnPriorityList[i][0], spawnPriorityList[i][1]);
    //
	// 		if (spawnDetailIndex >= 0) {
	// 			break;
	// 		}
	// 	}
    //
	// 	if (this.room.stats.roles.transporter > 0 && this.room.energyAvailable < energyCapacity && this.room.stats.totalAvailableEnergy >= energyCapacity) {
	// 		return;
	// 	}
    //
	// 	spawnDetails = this.spawnQueue[spawnDetailIndex];
	// 	generatedBodyParts = this.getBodyParts(this.room.energyAvailable, spawnDetails.memory?.job);
    //
	// 	if (spawnDetails.bodyParts && spawnDetails.bodyParts.length > 0) {
	// 		//this.spawnQueue.splice(spawnDetailIndex, 1);
	// 		spawnBodyParts = spawnDetails.bodyParts;
	// 	} else {
	// 		spawnBodyParts = generatedBodyParts;
	// 	}
    //
	// 	err = this.spawn.spawnCreep(spawnBodyParts, spawnDetails.name, { memory: spawnDetails.memory as CreepMemory });
    //
	// 	if (err === ERR_NOT_ENOUGH_ENERGY) {
	// 		err = this.spawn.spawnCreep(generatedBodyParts, spawnDetails.name, { memory: spawnDetails.memory as CreepMemory });
	// 	}
    //
	// 	if (err == OK) {
	// 		this.spawnQueue.splice(spawnDetailIndex, 1);
	// 	} else if (err == ERR_BUSY) {
	// 		this.spawn.pos.pushCreepsAway();
	// 	} else if (utils.DEBUG) {
	// 		log.error(err.toString());
	// 	}
	// }

    public spawnCreepFromQueue(): void {
        if (!this.spawn || this.room.energyAvailable < 150 || this.spawn.spawning) return;

        // Spawn-Plattform frei räumen
        let freePositionAroundSpawn = this.spawn.pos.getFreePositions(1, false).length;
        if (freePositionAroundSpawn < 1) {
            console.log("pushing Creeps!");
            this.spawn.pos.pushCreepsAway();
        }

        const entry = this.spawnQueue[0];
        const body = entry.bodyParts && entry.bodyParts.length > 0
            ? entry.bodyParts
            : this.getBodyParts(this.room.energyAvailable, entry.memory?.job);

        const err = this.spawn.spawnCreep(body, entry.name, { memory: entry.memory as CreepMemory });

        if (err === OK) {
            this.spawnQueue.shift();
            // Nach dem Spawn den frischen Creep vom Spawn schubsen
            this.spawn.pos.pushCreepsAway();
        } else if (err === ERR_NOT_ENOUGH_ENERGY) {
            // Versuche mit abgespecktem Body zu spawnen
            const fallbackBody = this.getBodyParts(this.room.energyAvailable, entry.memory?.job);
            if (this.spawn.spawnCreep(fallbackBody, entry.name, { memory: entry.memory as CreepMemory }) === OK) {
                this.spawnQueue.shift();
                this.spawn.pos.pushCreepsAway();
            }
        } else {
            console.log(`Error while spawning: ${err} with body ${body}`);
        }
        // Bei ERR_BUSY o. ä. wird im nächsten Tick erneut versucht
    }

    // Hilfsfunktionen
    private countAlive(role: string, task?: string): number {
        return _.filter(Game.creeps, c =>
            c.memory.job === role && (!task || c.memory.task === task)
        ).length;
    }

    private countInQueue(role: string, task?: string): number {
        return this.spawnQueue.filter(e =>
            e.memory?.job === role && (!task || e.memory?.task === task)
        ).length;
    }

    private neededMiners(): number {
        return Math.max(0, this.stats.resourceCount - this.stats.roles.miner);
    }

    private neededTransporters(): number {
        const req = Math.floor((Memory.transportRequests?.length || this.stats.resourceCount) *
            Memory.settings.transporterPerSource);
        return Math.max(0, req - this.stats.roles.transporter);
    }

    private neededWorkers(): { count: number, task: string } {
        for (const project of this.buildQueue) {
            if (project.cost && project.cost > 0) {
                const required = workersNeededForProject(project, this.room);
                const assigned = this.countAlive('worker', project.name) + this.countInQueue('worker', project.name);
                const missing = Math.max(0, required - assigned);
                if (missing > 0) {
                    return { count: missing, task: project.name };
                }
            }
        }
        return { count: 0, task: '' };
    }

	checkSpawnsNeeded() {
		let jobs = ['miner', 'transporter', 'worker', 'defender', 'ranged', 'healer'];
		let neededCreeps = 0;
		let task = '';
		let i = 0, j = 0;

		for (i = 0; i < jobs.length; i++) {

			switch (jobs[i]) {
				case "miner":
					neededCreeps = this.neededMiners()
					break;

				case "transporter":
					//neededCreeps = Math.min(Math.floor((this.stats.resourceCount * 2 + (this.stats.roles.worker / 4)) - this.stats.roles.transporter), 20);
                    neededCreeps = this.neededTransporters()
					break;

				case "worker": {
					let neededWorkers = this.neededWorkers();
                    neededCreeps = neededWorkers.count
                    task = neededWorkers.task
                    break;
				}
			}

			_.forEach(this.spawnQueue, spawn => {
				if (spawn.memory && (spawn.memory.job === jobs[i] && spawn.memory.task.includes(task.slice(0, 3)))) {
					neededCreeps--;
				}
			});

            task = (jobs[i] === 'defender' || jobs[i] === 'ranged' || jobs[i] === 'healer') ? '' : task

			for (j = 0; j < Math.min(1, neededCreeps); j++) {
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
                        amountAssigned: 0,
						lastPositions: [],
						pathToTarget: [],
					}
				});
			}
		}
	}

	addPart(body: { parts: BodyPartConstant[] }, available: { energy: number; }, count: number, part: BodyPartConstant) {
		for (let i = 0; i < count; i++) {
            if (available.energy - BODYPART_COST[part] >= 0) {
                body.parts.push(part);
                available.energy -= BODYPART_COST[part];
            }
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

            case 'defender': {
                this.addPart(body, available, 4, TOUGH);
                this.addPart(body, available, 2, MOVE);
                this.addPart(body, available, 2, ATTACK);
                break;
            }

            case 'ranged': {
                this.addPart(body, available, 3, MOVE);
                this.addPart(body, available, 1, RANGED_ATTACK);
                break;
            }

            case 'healer': {
                this.addPart(body, available, 1, MOVE);
                this.addPart(body, available, 1, HEAL);
                break;
            }
		}

		return body.parts;
	}

	calculateBodyParts(energy: number) {

		// const energyAvailable = Math.floor(energy / 50);
		// const isOdd = energyAvailable % 2 !== 0;
		// /* const energyHalf = Math.floor(energyAvailable / 2);
		// const energyFourth = Math.floor(energyHalf / 2); */

		const energyCap = this.room.energyCapacityAvailable;
		const body = getBuilderBody(energyCap);

		const partCount = {
			WORK: 0,
			CARRY: 0,
			MOVE: 0,
		};

		body.forEach(part => {
			switch (part) {
                case "carry":
					partCount.CARRY = partCount.CARRY +1;
                    break;
                case "move":
					partCount.MOVE = partCount.MOVE +1;
                    break;
                case "work":
					partCount.WORK = partCount.WORK +1;
					break;
            }
		})

		// const leftEnergy = energyAvailable - (partCount.CARRY + partCount.MOVE);
		//
		// if (leftEnergy % 2 === 0) {
		// 	partCount.WORK = Math.floor(leftEnergy / 2);
		// } else {
		// 	partCount.WORK = Math.floor(leftEnergy / 2);
		// 	partCount.MOVE += 1;
		// }

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

		// const totalCost = Object.keys(partCount).reduce((sum, part) => {
		// 	return sum + BODYPART_COST[part as BodyPartConstant] * BODYPART_COST[part as BodyPartConstant];
		// }, 0);

		return partCount;
	}

	// getWorkerForTask(task: string) {
	// 	if (!task || task == '') {
	// 		return 0;
	// 	}
	//
	// 	const taskData = this.buildQueue.find((item) => item.name == task);
	// 	if (!taskData || (taskData.cost && taskData.cost <= 0)) {
	// 		return 0;
	// 	}
	//
    //     // Beispiel beim Berechnen der Worker-Anzahl
    //     const positionsAvailable = maxWorkersForTarget(taskData.pos, task.includes('controller'));
    //     // durchschnittliche WORK-Teile pro Creep aus deinem Body‑Design
    //     const averageWorkParts = 5;
    //     const workersNeeded = workersNeededForProject(taskData, this.room);
	// 	return positionsAvailable - workersNeeded;
	//
	// 	// const taskCost: number = taskData.cost as number;
	// 	// const workBodyPartCount = this.calculateBodyParts(this.room.energyCapacityAvailable || this.room.energyAvailable).WORK;
	// 	// const workloadPerThousandTicks = workBodyPartCount * (task.includes('controller') ? 1000 : 5000);
	// 	// let creepSpawnCount = Math.ceil(taskCost / workloadPerThousandTicks);
	// 	//
	// 	// if (taskData.neededCreeps && taskData.neededCreeps <= -1) {
	// 	// 	taskData.neededCreeps = Math.min(creepSpawnCount, 20);
	// 	// } else {
	// 	// 	const creepCount = _.filter(Game.creeps, (creep) => creep.memory.job == 'worker' && creep.getTask() === task).length;
	// 	// 	creepSpawnCount = Math.max(0, (taskData.neededCreeps as number) - creepCount);
	// 	// }
	// 	//
	// 	// creepSpawnCount = Math.min(creepSpawnCount, 20);
	// 	// return creepSpawnCount;
	// }

	getWorkerForTask(task: string): number {
		if (!task) return 0;
		const taskData = this.buildQueue.find(item => item.name === task);
		if (!taskData || !taskData.cost || taskData.cost <= 0) return 0;

		// todo needs to be optimized
		const assignedAlive = _.filter(Game.creeps, c =>
			c.memory.job === 'worker' && c.memory.task === task
		).length;
		const assignedInQueue = this.spawnQueue.filter(s =>
			s.memory?.job === 'worker' && s.memory?.task === task
		).length;
		const needed = workersNeededForProject(taskData, this.room);
		let missing = Math.max(0, needed - assignedAlive - assignedInQueue);

		// Anzahl der notwendigen Worker unter Berücksichtigung von Baupositionen und Projektkosten
		return missing;
	}

}
