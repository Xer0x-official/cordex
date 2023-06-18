
import * as Core from "./managers/Core";
import { log } from "./tools/Logger";
import * as utils from "./utilities";
import { RoomLogic } from "room/RoomLogic";
import { StructureLogic } from "structure/StructureLogic";
import { LogLevel } from "./enums/loglevel";
// import './prototypes/room/setup';
import './prototypes/creep';
import './prototypes/room';

log.alert("✨=== Global Reset ===✨");

export function loop() {
    //Core.run();

	if (!Memory.settings) {
        Memory.settings = {};
        log.warning("💎=== Script Loaded ===💎");
    }

    if (!Memory.settings.loggingLevel) {
        Memory.settings.loggingLevel = LogLevel.Verbose;
        log.debug("Logging Level set to Verbose");
    }

    if (!Memory.settings.user) {
        Memory.settings.user = getUserName();
    }

	if (!Memory.colonies) {
		Memory.colonies = {};
	}

	let cpuBeforeRoom = Game.cpu.getUsed();
	let cpuAfterRoom = 0;
	let cpuAfterCreep = 0;
	let cpuAfterMemory = 0;

	// make a list of all of our rooms
	let rooms = _.filter(Game.rooms, room => room.controller && room.controller.level > 0 && room.controller.my);

	if (Game.time < 50) {
		return;
	}
	// run logic for any rooms and for any creeps
	_.forEach(rooms, (room: Room) => {
		new RoomLogic(room, room.name);
		new StructureLogic(room, room.name);
	});

	cpuAfterRoom = Game.cpu.getUsed();
	if (cpuAfterRoom > (cpuBeforeRoom * 1.5)) {
		console.log(`CPU-AfterRoom: ${cpuBeforeRoom} -> ${cpuAfterRoom}`);
	}

	/* _.forEach(Game.creeps, creep => {
		const creepLogicRun = new creepLogic.CreepLogic();
		if (!creep.spawning) {
			creepLogicRun.run(creep, MemoryObject);
		}
	});
	*/

	cpuAfterCreep = Game.cpu.getUsed();
	if (cpuAfterCreep > (cpuAfterRoom * 3)) {
		log.info(`CPU-AfterCreep: ${cpuAfterRoom} -> ${cpuAfterCreep}`);
	}

	cpuAfterMemory = Game.cpu.getUsed();
	if (cpuAfterMemory > (cpuAfterCreep * 1.5)) {
		log.info(`CPU-AfterMemory: ${cpuAfterMemory} -> ${cpuAfterCreep}`);
	}

	if (cpuAfterMemory > 20) {
		log.info(`CPU-WARNING: ${cpuBeforeRoom} -> ${cpuAfterRoom} -> ${cpuAfterCreep} -> ${cpuAfterMemory}`);
	}

}


function getUserName() {
    const spawnNames = Object.keys(Game.spawns);
    if (spawnNames.length === 0) {
        return;
    }
    return Game.spawns[spawnNames[0]].owner.username;
}
