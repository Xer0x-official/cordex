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
	const startX = this.x - range || range;
	const startY = this.y - range || range;

	for (x = startX; x <= this.x + range && x < 49; x++) {
		for (y = startY; y <= this.y + range && y < 49; y++) {
			if (x !== this.x || y !== this.y) {
				positions.push(new RoomPosition(
					(x < 0 ? 0 : (x > 49 ? 49 : x)),
					(y < 0 ? 0 : (y > 49 ? 49 : y)),
					this.roomName));
			}
		}
	}

	return positions;
}

// RoomPosition.prototype.getFreePositions = function (range: number = 1, ignoreCreeps: boolean = true) : RoomPosition[] {
// 	let positions: RoomPosition[] = this.getNearbyPositions(range);
// 	const terrain = Game.map.getRoomTerrain(this.roomName);
//
// 	positions = _.remove(positions, (position: RoomPosition) => {
// 		return terrain.get(position.x, position.y) !== TERRAIN_MASK_WALL;
// 	});
//
// 	positions = _.remove(positions, (position: RoomPosition) => {
// 		let structuresAtPosition = 0;
// 		let creepsAtPosition = 0;
// 		structuresAtPosition = _.remove(position.lookFor(LOOK_STRUCTURES), (structure: Structure) => {
// 			return !structure.isWalkable();
// 		}).length;
//
// 		if (!ignoreCreeps) {
// 			creepsAtPosition = position.lookFor(LOOK_CREEPS).length;
// 		}
//
// 		return structuresAtPosition < 1 && creepsAtPosition < 1;
// 	});
//
// 	return positions;
// }

RoomPosition.prototype.getFreePositions = function(range: number = 1, ignoreCreeps: boolean = true): RoomPosition[] {
    let positions = this.getNearbyPositions(range);
    const terrain = Game.map.getRoomTerrain(this.roomName);

    positions = positions.filter((pos: RoomPosition) => terrain.get(pos.x, pos.y) !== TERRAIN_MASK_WALL);

    positions = positions.filter((pos: RoomPosition) => {
        const structures = pos.lookFor(LOOK_STRUCTURES)
            .filter((s: Structure) => !s.isWalkable());
        const creeps = (!ignoreCreeps) ? pos.lookFor(LOOK_CREEPS).length : 0;
        return structures.length === 0 && creeps === 0;
    });

    return positions;
};

RoomPosition.prototype.pushCreepsAway = function() {
	const spaceAround: RoomPosition[] = this.getNearbyPositions();
	let creepAtPosition;
	let freeCreepPosition: RoomPosition[];

	spaceAround.forEach((position: RoomPosition) => {
		creepAtPosition = Game.rooms[this.roomName].lookForAt(LOOK_CREEPS, position);

		if (creepAtPosition.length > 0 && creepAtPosition[0].getJob() != 'miner') {
			freeCreepPosition = creepAtPosition[0].pos.getFreePositions(1, false)!;
            if (freeCreepPosition.length > 0) {
                let directionTo = freeCreepPosition[0].getDirectionTo(creepAtPosition[0].pos);
                creepAtPosition[0].move(directionTo);
                // console.log(`tried to push ${creepAtPosition[0].name} to ${freeCreepPosition[0]}`);
            }
		}
	})
}
