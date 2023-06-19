
export function setupProperties(room: Room) {
	_.forEach(room.find(FIND_SOURCES), function (source) {
		room.colonieMemory.resources.energy[source.id] = null;
		room.colonieMemory.stats.resourceCount++;
	});

	_.forEach(room.find(FIND_MINERALS), function (source) {
		room.colonieMemory.resources.minerals[source.id] = null;
	});

	_.forEach(_.filter(Game.spawns, spawn => spawn.room.name === room.name), spawn => room.colonieMemory.spawns.push(spawn.id));

	room.colonieMemory.myStructurs.push(room.colonieMemory.spawns[0]);
}
