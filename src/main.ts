
import { log } from "./utilities/Logger";
import * as utils from "./utilities";
import { RoomLogic } from "room/RoomLogic";
import { CreepLogic } from "creep";
import { StructureLogic } from "structure/StructureLogic";
import { LogLevel } from "./enums/loglevel";
// import './prototypes/room/setup';
import './prototypes/creep';
import './prototypes/room';
import { TransportManager } from "logistics/TransportManager";
const roomSetupOffset = Game.time + 3;

log.alert("✨=== Global Reset ===✨");

export function loop() {
	if (!Memory.settings) {
		Memory.settings = {};
		Memory.settings.loggingLevel = LogLevel.Verbose;
		Memory.settings.user = getUserName();
		Memory.settings.transporterPerSource = 4;
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
	// make a list of all of our rooms
	let rooms = _.filter(Game.rooms, room => room.controller && room.controller.level > 0 && room.controller.my);

	if (Game.time < roomSetupOffset) {
		return;
	}
	// run logic for any rooms and for any creeps
	_.forEach(rooms, (room: Room) => {
		new RoomLogic(room, room.name);
		new StructureLogic(room, room.name);
	});

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

    rooms.forEach(room => {
        const visual = new RoomVisual(room.name);
        let y = 1;

        visual.text(`CPU Room:  ${cpuRoom.toFixed(2)}`, x, y, {color: 'white', align: 'left', font: fontHeight});
        y += (fontHeight * 1.2);
        visual.text(`CPU Creeps: ${cpuCreeps.toFixed(2)}`, x, y, {color: 'white', align: 'left', font: fontHeight});
        y += (fontHeight * 1.2);
        visual.text(`CPU Total:  ${cpuTotal.toFixed(2)}`, x, y, {color: 'yellow', align: 'left', font: fontHeight});
    });

}


function getUserName() {
	const spawnNames = Object.keys(Game.spawns);
	if (spawnNames.length === 0) {
		return;
	}
	return Game.spawns[spawnNames[0]].owner.username;
}
