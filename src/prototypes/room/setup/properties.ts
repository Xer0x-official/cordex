
export function setupProperties(room: Room, remote: boolean, originSpawnPos: RoomPosition) {
	_.forEach(room.find(FIND_SOURCES), function (source) {
		room.colonieMemory.resources.energy[source.id] = initResource(originSpawnPos, source, remote);
	});

	_.forEach(room.find(FIND_MINERALS), function (source) {
		room.colonieMemory.resources.minerals[source.id] = initResource(originSpawnPos, source, remote);
	});

	if (!remote) {
		_.forEach(_.filter(Game.spawns, spawn => spawn.room.name === room.name), spawn => room.colonieMemory.spawns.push(spawn.id));
		room.colonieMemory.myStructurs.push(room.colonieMemory.spawns[0]);
	}
}

function initResource(originSpawnPos: RoomPosition, source: Source | Mineral, remote: boolean): ISourceMemory {
    let sourcePath = {
        built: false,
        path: PathFinder.search(originSpawnPos, {pos: source.pos, range: 1}).path
    }
    return {
        resourcePath: sourcePath,
        distance: sourcePath.path.length,
        pos: source.pos,
        miner: null,
        active: remote,
    };
}