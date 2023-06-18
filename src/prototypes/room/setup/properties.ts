
export function setupProperties(room: Room) {
	_.forEach(room.find(FIND_SOURCES), function (source) {
		room.colonieMemory.resources.energy.push(source.id);
		room.colonieMemory.stats.resourceCount++;
	});

	_.forEach(room.find(FIND_MINERALS), function (source) {
		room.colonieMemory.resources.minerals.push(source.id);
	});

	_.forEach(_.filter(Game.spawns, spawn => spawn.room.name === room.name), spawn => room.colonieMemory.spawns.push(spawn.id));

	room.colonieMemory.myStructurs.push(room.colonieMemory.spawns[0]);
}
