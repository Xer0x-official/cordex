
import { log } from "./utilities/Logger";
import * as utils from "./utilities";
import { RoomLogic } from "room/RoomLogic";
import { CreepLogic } from "creep";
import { StructureLogic } from "structure/StructureLogic";
import { LogLevel } from "./enums/loglevel";
// import './prototypes/room/setup';
import './prototypes/creep';
import './prototypes/room';
import { TransportManager } from "managers/TransportManager";
import { SpawnQueueManager } from "managers/SpawnQueueManager";
const roomSetupOffset = Game.time + 3;

log.alert("✨=== Global Reset ===✨");

export function loop() {
	if (!Memory.settings) {
		Memory.settings = {};
		Memory.settings.loggingLevel = LogLevel.Verbose;
		Memory.settings.user = getUserName();
		Memory.settings.transporterPerSource = 3;
		log.debug("Logging Level set to Verbose");
		log.warning("💎=== Script Loaded ===💎");
	}

    if (!Memory.patrol) {
        Memory.patrol = { points: [  ] };
    }

    if (!Memory.colonies) {
		Memory.colonies = {};
	}

    const cpuStart = Game.cpu.getUsed();

    const cpuBeforeRoom = Game.cpu.getUsed();
	// make a list of all of our colonies
	let colonies = Object.keys(Memory.colonies)
        .flatMap(roomName => {
            const r = Game.rooms[roomName];
            return r ? [r] : [];
        });

    if (colonies.length < 1) {
        colonies = colonies.concat(_.filter(Game.rooms, room => room.controller && room.controller.level > 0 && room.controller.my));
    }

	if (Game.time < roomSetupOffset) {
		return;
	}
	// run logic for any colonies and for any creeps
	_.forEach(colonies, (room: Room) => {
		new RoomLogic(room, room.name, Memory.colonies[room.name]);
		new StructureLogic(room, room.name);
	});

    if (Game.time % 10 === 0 && Object.keys(Memory.colonies).length > 0) {
        Object.keys(Memory.colonies)
            .flatMap(roomName => {
                const r = Game.rooms[roomName];
                return r ? [r] : [];
            }).forEach(room => {
            SpawnQueueManager.recalculateSpawnPriorities(room);
        });
    }
	/* cpuAfterRoom = Game.cpu.getUsed();
	if (cpuAfterRoom > (cpuBeforeRoom * 1.5)) {
		console.log(`CPU-AfterRoom: ${cpuBeforeRoom} -> ${cpuAfterRoom}`);
	} */

    for (let roomsKey in Memory.rooms) {
        let actualRoom: Room = Game.rooms[roomsKey];
        if (actualRoom) {
            TransportManager.collectRequests(actualRoom);
        }
    }
    const cpuAfterRoom = Game.cpu.getUsed();

    const cpuBeforeCreeps = cpuAfterRoom;
    // freie Transporter einsammeln
    const freeTransporters = _.filter(Game.creeps, c => {
        if (c.spawning) return false;
        return c.memory.job === 'transporter' && (!c.memory.transportTask || c.memory.amountAssigned == 0)
    });
    TransportManager.assignTasks(freeTransporters);


    const miner: CreepLogic[] = [];
    const transporter: CreepLogic[] = [];
    const worker: CreepLogic[] = [];

	_.forEach(Game.creeps, creep => {
        if (creep.spawning) {
            return;
        }

        switch (creep.memory.job) {
            case 'miner': { miner.push(new CreepLogic(creep, creep.name)); break;}
            case 'transporter': { transporter.push(new CreepLogic(creep, creep.name)); break;}
            case 'worker': { worker.push(new CreepLogic(creep, creep.name)); break;}
            default: new CreepLogic(creep, creep.name)._run();
        }
	});

    miner.forEach(creep => creep._run())
    transporter.forEach(creep => creep._run())
    worker.forEach(creep => creep._run())

    const cpuAfterCreeps = Game.cpu.getUsed();

	/* cpuAfterCreep = Game.cpu.getUsed();
	if (cpuAfterCreep > (cpuAfterRoom * 3)) {
		log.info(`CPU-AfterCreep: ${cpuAfterRoom} -> ${cpuAfterCreep}`);
	}
 */
/*	cpuAfterMemory = Game.cpu.getUsed();
	if (cpuAfterMemory > (cpuAfterCreep * 1.5)) {
		log.info(`CPU-AfterMemory: ${cpuAfterMemory} -> ${cpuAfterCreep}`);
	}

	if (cpuAfterMemory > 20) {
		log.info(`CPU-WARNING: ${cpuBeforeRoom} -> ${cpuAfterRoom} -> ${cpuAfterCreep} -> ${cpuAfterMemory}`);
	} */

	// log.info(`CPU: ${Game.cpu.getUsed()}`);

    const cpuTotal = cpuAfterCreeps - cpuStart;
    const cpuRoom  = cpuAfterRoom  - cpuBeforeRoom;
    const cpuCreeps = cpuAfterCreeps - cpuBeforeCreeps;
    const x = 1;
    const fontHeight = 0.3;

    colonies.forEach(room => {
        const visual = new RoomVisual(room.name);
        let y = 1;

        visual.text(`CPU Room:  ${cpuRoom.toFixed(2)}`, x, y, {color: 'white', align: 'left', font: fontHeight});
        y += (fontHeight * 1.2);
        visual.text(`CPU Creeps: ${cpuCreeps.toFixed(2)}`, x, y, {color: 'white', align: 'left', font: fontHeight});
        y += (fontHeight * 1.2);
        visual.text(`CPU Total:  ${cpuTotal.toFixed(2)}`, x, y, {color: 'yellow', align: 'left', font: fontHeight});
        y += (fontHeight * 1.2);

        let priorities = Memory.colonies[room.name]!.priorities;
        visual.text(`miner prio: ${priorities['miner']}`, x, y, {color: 'green', align: 'left', font: fontHeight});
        y += (fontHeight * 1.2);
        visual.text(`transporter prio: ${priorities['transporter']}`, x, y, {color: 'green', align: 'left', font: fontHeight});
        y += (fontHeight * 1.2);
        visual.text(`worker prio: ${priorities['worker']}`, x, y, {color: 'green', align: 'left', font: fontHeight});

        y += (fontHeight * 1.2);
        visual.text(`activeRessources: ${Memory.colonies[room.name].stats.activeResources}`, x, y, {color: 'red', align: 'left', font: fontHeight});

    });

}


function getUserName() {
	const spawnNames = Object.keys(Game.spawns);
	if (spawnNames.length === 0) {
		return;
	}
	return Game.spawns[spawnNames[0]].owner.username;
}
