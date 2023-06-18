
import { Tower } from "./Tower";

export class StructureLogic implements IBaseRoomClass {
	room: Room;
	name: string;

	constructor(room: Room, name: string) {
		this.room = room;
		this.name = name;

		this._run();
	}

	_run() {
		const towers: StructureTower[] = this.room.find(FIND_MY_STRUCTURES, { filter: (structure) => structure.structureType == STRUCTURE_TOWER });
		let i = 0;

		for (i = 0; i < towers.length; i++) {
			new Tower(this.room, this.name, STRUCTURE_TOWER, towers[i]);
		}
	}

	_updateMemory() {

	}
}
