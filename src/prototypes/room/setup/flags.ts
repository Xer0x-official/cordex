
export function setupFlags(room: Room) {
	room.find(FIND_SOURCES_ACTIVE).forEach(function (source) {
		_.forEach(source.pos.getFreePositions(), position => {
			room.createFlag(position, `${room.name}_mine_${position.x}_${position.y}`);
		});

		room.createFlag(source.pos, `${room.name}_source_${source.pos.x}_${source.pos.y}`);
	})
}
