/**
 * RoomPosition prototypes
 */

export {};

RoomPosition.prototype.isEdge = function () {
	if (this._isEdge === undefined) {
		this._isEdge = this.x === 0 || this.x === 49 || this.y === 0 || this.y === 49;
	}
	return this._isEdge;
};

RoomPosition.prototype.isNearEdge = function () {
	if (this._isNearEdge === undefined) {
		this._isNearEdge = this.x === 1 || this.x === 48 || this.y === 1 || this.y === 48;
	}
	return this._isNearEdge;
};

RoomPosition.prototype.getNearbyPositions = function (range: number = 1) {
	let positions: RoomPosition[] = [];
	let x = 0, y = 0;
	const startX = this.x - 1 || 1;
	const startY = this.y - 1 || 1;

	for (x = startX; x <= this.x + 1 && x < 49; x++) {
		for (y = startY; y <= this.y + 1 && y < 49; y++) {
			if (x !== this.x || y !== this.y) {
				positions.push(new RoomPosition(x, y, this.roomName));
			}
		}
	}

	return positions;
}

RoomPosition.prototype.getFreePositions = function (range: number = 1) {
	let positions: RoomPosition[] = this.getNearbyPositions(range);
	const terrain = Game.map.getRoomTerrain(this.roomName);

	positions = _.remove(positions, (position: RoomPosition) => {
		return terrain.get(position.x, position.y) !== TERRAIN_MASK_WALL;
	});

	positions = _.remove(positions, (position: RoomPosition) => {
		return _.remove(position.lookFor(LOOK_STRUCTURES), (structure: Structure) => {
			return !structure.isWalkable();
		}).length <= 0;
	});

	return positions;
}
