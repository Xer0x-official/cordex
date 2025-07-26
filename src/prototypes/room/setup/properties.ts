
export function setupProperties(room: Room, remote: boolean) {
	_.forEach(room.find(FIND_SOURCES), function (source) {
		room.colonieMemory.resources.energy[source.id] = {pos: source.pos, miner: null};
		room.stats.resourceCount++;
	});

	_.forEach(room.find(FIND_MINERALS), function (source) {
		room.colonieMemory.resources.minerals[source.id] = {pos: source.pos, miner: null};
	});


	if (!remote) {
		_.forEach(_.filter(Game.spawns, spawn => spawn.room.name === room.name), spawn => room.colonieMemory.spawns.push(spawn.id));
		room.colonieMemory.myStructurs.push(room.colonieMemory.spawns[0]);
	}

}
