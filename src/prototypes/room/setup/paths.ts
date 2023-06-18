
export function setupPaths(room: Room, spawn: StructureSpawn, origin: string = '') {
	const controllerPos: RoomPosition = room.controller ? room.controller.pos : new RoomPosition(0, 0, origin);
	let sourceCounter = 0;
	let paths = room.colonieMemory.paths;

	room.find(FIND_SOURCES_ACTIVE).forEach(function (source) {
		sourceCounter++;
		paths[`${room.name}_source_${sourceCounter}_${Game.time}`] = {built: false, path: PathFinder.search(spawn.pos, source.pos).path};
	});

	if (origin === null) {
		let name = `${room.name}_controller_${Game.time+sourceCounter + 1}`;
		paths[name] = {
			built: false,
			path: PathFinder.search(spawn.pos, controllerPos).path,
		};
	}

	room.colonieMemory.paths = paths;
}
