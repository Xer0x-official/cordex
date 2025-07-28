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

    private ROLES_PRIORITY: string[] = ['miner','transporter','worker','defender','ranged','healer'];

    checkForInitCreeps() {
		if (this.room.name === this.memory.origin && !this.memory.scouted) {
			this.memory.scouted = true;
			this.room.memory.scouted = true;
			// console.log(this.memory.scouted, this.room.memory.scouted);

			this.spawnQueue.push({
				bodyParts: [MOVE, MOVE, MOVE],
                name: `scout_${this.room.name}_${Game.time}`,
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

        if (this.stats.roles.miner < 1) {
			const initMinerName = `init_miner_${this.room.name}_${this.ticks - 1}`;
			const hasInitMiner = this.spawnQueue.some((entry: spawnQueueElement) => entry.name.includes('init'));
            if (!hasInitMiner) {
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
            }
        }

		if (this.stats.roles.transporter < 1) {
			const initTransporterName = `init_transporter_${this.room.name}_${this.ticks - 1}`;
			const hasInitTransporter = this.spawnQueue.some(entry => entry.name.includes('init'));

			if (!hasInitTransporter) {
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
	}

    /** Rückt Creeps vom Spawn weg, auch wenn der Spawn nicht BUSY ist */
    private clearSpawnPad(): void {
        const free = this.spawn.pos.getFreePositions(1, false).length;
        if (free < 1) this.spawn.pos.pushCreepsAway();

        if (free > 0) {
            this.spawn
        }
    }

    /** Erstellt ein Creep aus der Queue und sorgt danach für Platz */
    private spawnCreepFromQueue(): void {
        if (!this.spawn || this.spawn.spawning || this.room.energyAvailable < 300) return;

        // immer Spawnbereich freiräumen, bevor gespawnt wird
        this.clearSpawnPad();

        const job = this.spawnQueue.sort((a) => {
            let a1 = a.name.includes('init');
            return a1 ? -1 : 1;
        })[0];
        const desiredBody = this.getBodyParts(this.room.energyCapacityAvailable, job.memory?.job);
        const body = (job.bodyParts?.length ?? 0) > 0 ? job.bodyParts! : desiredBody;

        // genügende Energie? sonst warten (kein Downsizing)
        if (this.room.energyAvailable < _.sum(body.map(p => BODYPART_COST[p]))) return;

        const result = this.spawn.spawnCreep(body, job.name, { memory: job.memory as CreepMemory });
        if (result === OK) {
            this.spawnQueue.shift();
            // nach jedem Spawn Freiräumen
            this.clearSpawnPad();
        }
    }

    /** Zählt lebende Creeps einer Rolle (optional mit task) */
    private countAlive(role: string, task?: string): number {
        return _.filter(Game.creeps, c => c.memory.job === role && (!task || c.memory.task === task)).length;
    }

    /** Zählt Creeps einer Rolle in der SpawnQueue */
    private countQueued(role: string, task?: string): number {
        return this.spawnQueue.filter(e => e.memory?.job === role && (!task || e.memory.task === task)).length;
    }

    /** Ermittelt, wie viele Miner fehlen: pro Ressource ein Miner */
    private neededMiners(): number {
        const desired = this.stats.resourceCount;
        return Math.max(0, desired - (this.stats.roles.miner + this.countQueued('miner')));
    }

    /** Ermittelt, wie viele Transporter fehlen */
    private neededTransporters(): number {
        const desired = Math.floor((Memory.transportRequests?.length || this.stats.resourceCount) * Memory.settings.transporterPerSource);
        return Math.max(0, desired - (this.stats.roles.transporter + this.countQueued('transporter')));
    }

    /** Ermittelt, welche (Bau-)Aufgabe Worker derzeit brauchen */
    private neededWorkers(): { count: number, task: string } {
        for (const project of this.buildQueue) {
            if (project.cost && project.cost > 0) {
                // Prüfen, ob es sich um ein Controller‑Upgrade handelt
                const isControllerTask = /controller/i.test(project.name);
                // Wenn Logistik stark genug ist, nutze die maximal mögliche Anzahl Positionen
                let required: number;
                if (isControllerTask) {
                    const pos = project.structures[0].pos;
                    required = maxWorkersForTarget(pos, true /* isController */);
                } else {
                    // Bei normalen Projekten weiter wie gehabt
                    required = workersNeededForProject(project, this.room);
                }

                const assigned = this.countAlive('worker', project.name) + this.countQueued('worker', project.name);
                const missing = Math.max(0, required - assigned);
                if (missing > 0) return { count: missing, task: project.name };
            }
        }
        return { count: 0, task: '' };
    }

    /** Bestimmt nach Priorität, welches Creep in die Queue kommt */
    private checkSpawnsNeeded(): void {
        for (const role of this.ROLES_PRIORITY) {
            let missing = 0;
            let task = '';

            switch (role) {
                case 'miner':       missing = this.neededMiners(); break;
                case 'transporter': missing = this.neededTransporters(); break;
                case 'worker':
                    const workerNeed = this.neededWorkers();
                    missing = workerNeed.count;
                    task = workerNeed.task;
                    break;
                // TODO: defender/ranged/healer: Abhängig von Hostiles
            }

            if (missing > 0) {
                const creepName = `${role}_${this.room.name}_${Game.time}`;
                const body = this.getBodyParts(this.room.energyCapacityAvailable, role);
                this.spawnQueue.push({
                    bodyParts: body,
                    name: creepName,
                    memory: {
                        job: role,
                        working: false,
                        target: null,
                        task: task,
                        origin: this.room.name,
                        amountAssigned: 0,
                        lastPositions: [],
                        pathToTarget: []
                    }
                });
                break; // pro Tick nur ein Creep einreihen
            }
        }
    }

    /** Erstellt die Körper entsprechend der Rolle und des Energie-Caps */
    private getBodyParts(energyCap: number, role?: string): BodyPartConstant[] {
        switch (role) {
            case 'miner':
                // maximal 6 WORK und ein MOVE
                const workCount = Math.min(6, Math.floor((energyCap - 50) / 100));
                return Array(workCount).fill(WORK).concat([MOVE]);
            case 'transporter':
                const pairCount = Math.floor(energyCap / 100);
                return Array(pairCount).fill(CARRY).concat(Array(pairCount).fill(MOVE));
            case 'worker':
            default:
                // getBuilderBody nutzt energyCap, um WORK/CARRY/MOVE Verhältnis zu ermitteln
                return getBuilderBody(energyCap);
        }
    }

}
