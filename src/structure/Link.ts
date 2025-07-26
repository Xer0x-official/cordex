
export class Link implements ILink, IBaseRoomClass {
	structureType: StructureConstant;
	link: StructureLink;
	room: Room;
	name: string;

	constructor (room: Room, name: string, link: StructureLink, structureType: StructureConstant) {
		this.room = room;
		this.name = name;
		this.link = link;
		this.structureType = structureType;
	}

	_run() {

	}

	_updateMemory() {

	}
}
