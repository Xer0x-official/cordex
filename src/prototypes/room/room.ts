/**
 * Room prototypes
 */

export {};

import * as roomBlueprints from '../../room/blueprints';
const roomDimensions: number = 50;

Room.prototype.getMySpawns = function () {
	if (this._mySpawns === undefined) {
		this._mySpawns = this.find(FIND_MY_SPAWNS);
	}
	return this._mySpawns;
};

Room.prototype.getSpawn = function () {
	if (!this._firstSpawn) {
		this._firstSpawn = this.getMySpawns()?.[0];
	}
	return this._firstSpawn;
};

Room.prototype.getSources = function () {
	if (!this._sources) {
		this._sources = this.find(FIND_SOURCES);
	}
	return this._sources;
};

Room.prototype.getMineral = function () {
	if (this._mineral === undefined) {
		this._mineral = this.find(FIND_MINERALS)?.[0];
	}
	return this._mineral;
};

//#region getAttributes

Room.prototype.getBuildQueueTask = function getBuildQueueTask(name = '') {
	let i = 0;
	if (!name || !this.colonieMemory || !this.buildQueue) {
		return null;
	}

	for (i = 0; i < this.buildQueue.length; i++) {
		if (this.buildQueue[i].name == name)
			return this.buildQueue[i];
	}
	return null;
}
//#endregion


/* Room.prototype.testRoom = function testRoom(distance: number = 1, startPos: RoomPosition): void {
	// Annahme: Die gewünschte Distanz ist 4
	const n = 4;

	// Berechnung des Zentrumspunkts für die Raute
	const centerX = roomDimensions / 2 - 0.5;
	const centerY = roomDimensions / 2 - 0.5;

	// Annahme: Raum-Objekt ist bereits erstellt und in der Variable "room" gespeichert
	const distanceCM = this.distanceTransform(false);

	// Überprüfe, ob die Zellen in alle Richtungen die gewünschte Entfernung haben
	let isRhombousFree = true;

	for (let dx = centerX - n; dx <= centerX + n; dx++) {
		for (let dy = centerY - n; dy <= centerY + n; dy++) {
			if (Math.abs(centerX - dx) + Math.abs(centerY - dy) !== n && distanceCM.get(dx, dy) !== 1) {
				isRhombousFree = false;
				break;
			}
		}
	}

	if (isRhombousFree) {
		console.log("Die Raute mit Entfernung", n, "von der Mitte ist frei.");
	} else {
		console.log("Die Raute mit Entfernung", n, "von der Mitte ist nicht frei.");
	}
} */

/* Room.prototype.testRoom2 = function testRoom2(
	spaceNeeded: number = 5,
	rect: boolean = true,
	isOdd: boolean = false,
	sourcePoint: RoomPosition[] = [this.controller.pos]): void {

	const floodMatrix = this.floodFill(sourcePoint);
	const distanceMatrix = this.distanceTransform(false, rect);

	const centerOffset = Math.floor(spaceNeeded / 2);
	const checkMatrix = generateCheckMatrix(spaceNeeded);

	let possibleBuildingSpots = [];
	let x, y, dx, dy, centerX, centerY;

	for (y = 44; y >= 5; --y) {
		posX: for (x = 44; x >= 5; --x) {
			if (rect) {
				if (distanceMatrix.get(x, y) >= spaceNeeded) {
					possibleBuildingSpots.push({ pos: new RoomPosition(x, y, this.name), distanceFromSource: floodMatrix.get(x, y) });
				}
			} else {

				centerX = x - centerOffset;
				centerY = y - centerOffset;

				for (dx = centerX; dx < centerX + checkMatrix.length; dx++) {
					for (dy = centerY; dy < centerY + checkMatrix.length; dy++) {
						const checkX = dx - centerX;
						const checkY = dy - centerY;

						if (distanceMatrix.get(dx, dy) !== 1 && checkMatrix[checkX][checkY] === 1) {
							continue posX;
						}
					}
				}

				possibleBuildingSpots.push({ pos: new RoomPosition(x, y, this.name), distanceFromSource: floodMatrix.get(x, y) });
			}
		}
	}

	possibleBuildingSpots.sort((a, b) => a.distanceFromSource - b.distanceFromSource);
	console.log(possibleBuildingSpots.length);
	if (possibleBuildingSpots.length > 0)
		console.log(possibleBuildingSpots[0].pos);
}
 */

Room.prototype.getPositionForBuild = function getPositionForBuild(spaceNeeded = 5, sourcePoint: RoomPosition[] = [this.controller.pos], rect = true, buildingMatrix: CostMatrix | undefined = undefined) {
	const floodMatrix: CostMatrix = this.floodFill(sourcePoint, false);
	const distanceMatrix: CostMatrix = this.distanceTransform(false, rect, buildingMatrix);

	const centerOffset = Math.floor(spaceNeeded / 2);
	// const checkMatrix = generateCheckMatrix(rect, spaceNeeded);

	let possibleBuildingSpots = [];
	let x, y, dx, dy, centerX, centerY;
	let positionWeight = 0;

	for (y = 44; y >= 5; --y) {
		for (x = 44; x >= 5; --x) {
            let canBuild = false;
            let buildX: number, buildY: number;
			if (rect) {
                buildX = x;
                buildY = y;
				positionWeight = distanceMatrix.get(x, y);
                canBuild = positionWeight >= spaceNeeded;
			} else {
                buildX = x - centerOffset;
                buildY = y - centerOffset;
                canBuild = distanceMatrix.get(x, y) >= (spaceNeeded - centerOffset);
			}

            if (canBuild) {
                possibleBuildingSpots.push({ pos: new RoomPosition(buildX, buildY, this.name), distanceFromSource: floodMatrix.get(x, y) });
            }

		}
	}

	possibleBuildingSpots.sort((a, b) => a.distanceFromSource - b.distanceFromSource);
	return possibleBuildingSpots[0].pos;
}

Room.prototype.distanceTransform = function (enableVisuals = false, rect = true, buildingMatrix: CostMatrix = this.buildingMatrix , x1 = 0, y1 = 0, x2 = roomDimensions - 1, y2 = roomDimensions - 1): CostMatrix {
	// let transform = undefined;

	// if (rect) {
	// 	transform = this.rectengularDistanceTransform(x1, y1, x2, y2, buildingMatrix);
	// } else {
	// 	transform = this.diagonalDistanceTransform(x1, y1, x2, y2, buildingMatrix);
	// }

    let transform: CostMatrix = this.fixedDistanceTransform();

	if (enableVisuals) {
		this.createVisual(x1, y1, x2, y2, transform);
	}

	return transform;
};

Room.prototype.fixedDistanceTransform = function() {
    const D = new PathFinder.CostMatrix();
    const INF = 1e6;

    // Initialisierung
    for (let y = 0; y < 50; y++) {
        for (let x = 0; x < 50; x++) {
            const isObstacle = this.getTerrain().get(x, y) > 0 || this.buildingMatrix.get(x, y) > 10;
            D.set(x, y, isObstacle ? 0 : INF);
        }
    }

    // Gewichte
    const w1 = 1, w2 = Math.SQRT2;

    // Vorwärtspass
    for (let y = 0; y < 50; y++) {
        for (let x = 0; x < 50; x++) {
            let v = D.get(x, y);
            if (x > 0) v = Math.min(v, D.get(x - 1, y) + w1);
            if (y > 0)       v = Math.min(v, D.get(x,y-1)   + w1);
            if (x>0 && y>0)  v = Math.min(v, D.get(x-1,y-1) + w2);
            if (x<49 && y>0) v = Math.min(v, D.get(x+1,y-1) + w2);
            D.set(x,y, v);
        }
    }

    // Rückwärtspass
    for (let y = 49; y >= 0; y--) {
        for (let x = 49; x >= 0; x--) {
            let v = D.get(x,y);
            if (x < 49)      v = Math.min(v, D.get(x+1,y)   + w1);
            if (y < 49)      v = Math.min(v, D.get(x,y+1)   + w1);
            if (x<49 && y<49) v = Math.min(v, D.get(x+1,y+1) + w2);
            if (x>0  && y<49) v = Math.min(v, D.get(x-1,y+1) + w2);
            D.set(x,y, v);
        }
    }

    return D;
};


/**
 * This is good for anything that isn't a diagonal, as searches all adjacent tiles when finding distance
 */
Room.prototype.rectengularDistanceTransform = function (x1 = 0, y1 = 0, x2 = roomDimensions - 1, y2 = roomDimensions - 1, buildingMatrix: CostMatrix = this.buildingMatrix): CostMatrix {
	const room = this
	const terrain = new Room.Terrain(this.name);
	const initialCM = new PathFinder.CostMatrix;

	const planingMatrix = (buildingMatrix ? buildingMatrix : new PathFinder.CostMatrix());

    // Fill CostMatrix with default terrain costs for future analysis:
	for (let y = 0; y < 50; y++) {
		for (let x = 0; x < 50; x++) {
			const tile = terrain.get(x, y);
			const flags = room.lookForAt(LOOK_FLAGS, x, y);
			const weight =
				(tile === TERRAIN_MASK_WALL || planingMatrix.get(x, y) != 0 || flags.length > 0) ? 255 : // wall  => unwalkable (structures.length > 1 || ( structures.length == 1 && structures[0].structureType != STRUCTURE_ROAD))
					tile === TERRAIN_MASK_SWAMP ? 1 : // swamp => weight:  5
						1; // plain => weight:  1
			initialCM.set(x, y, weight);
		}
	}

	// Use a costMatrix to record distances
	const distanceCM = new PathFinder.CostMatrix();
	let x = 0, y = 0;

	for (x = Math.max(x1 - 1, 0); x < Math.min(x2 + 1, roomDimensions - 1); x += 1) {
		for (y = Math.max(y1 - 1, 0); y < Math.min(y2 + 1, roomDimensions - 1); y += 1) {
			distanceCM.set(x, y, initialCM.get(x, y) === 255 ? 0 : 255);
		}
	}

	let top = 0, left = 0, topLeft = 0, topRight = 0, bottomLeft = 0;

	// Loop through the xs and ys inside the bounds
	for (x = x1; x <= x2; x += 1) {
		for (y = y1; y <= y2; y += 1) {
			top = distanceCM.get(x, y - 1);
			left = distanceCM.get(x - 1, y);
			topLeft = distanceCM.get(x - 1, y - 1);
			topRight = distanceCM.get(x + 1, y - 1);
			bottomLeft = distanceCM.get(x - 1, y + 1);

			distanceCM.set(x, y, Math.min(Math.min(top, left, topLeft, topRight, bottomLeft) + 1, distanceCM.get(x, y)));
		}
	}

	let bottom = 0, right = 0, bottomRight = 0;

	// Loop through the xs and ys inside the bounds
	for (x = x2; x >= x1; x -= 1) {
		for (y = y2; y >= y1; y -= 1) {
			bottom = distanceCM.get(x, y + 1);
			right = distanceCM.get(x + 1, y);
			bottomRight = distanceCM.get(x + 1, y + 1);
			topRight = distanceCM.get(x + 1, y - 1);
			bottomLeft = distanceCM.get(x - 1, y + 1);

			distanceCM.set(x, y, Math.min(Math.min(bottom, right, bottomRight, topRight, bottomLeft) + 1, distanceCM.get(x, y)));
		}
	}

	return distanceCM;
}

/**
 * This is good for finding open diamond-shaped areas, as it voids adjacent diagonal tiles when finding distance
 */
Room.prototype.diagonalDistanceTransform = function (x1 = 0, y1 = 0, x2 = roomDimensions - 1, y2 = roomDimensions - 1, buildingMatrix: CostMatrix = this.buildingMatrix): CostMatrix {
	const room: Room = this;

	// Use a costMatrix to record distances
	const terrain = new Room.Terrain(this.name);
	const distanceCM = new PathFinder.CostMatrix();
	const planingMatrix = (buildingMatrix ? buildingMatrix : new PathFinder.CostMatrix());

	let x = 0, y = 0;

	for (x = x1; x <= x2; x++) {
		for (y = y1; y <= y2; y++) {
			const tile = terrain.get(x, y);
			const flags = room.lookForAt(LOOK_FLAGS, x, y);
			const weight =
				(tile === TERRAIN_MASK_WALL || planingMatrix.get(x, y) != 0 || flags.length > 0) ? 255 : // wall  => unwalkable (structures.length > 1 || ( structures.length == 1 && structures[0].structureType != STRUCTURE_ROAD))
					tile === TERRAIN_MASK_SWAMP ? 1 : // swamp => weight:  5
						1; // plain => weight:  1
			distanceCM.set(x, y, weight);
		}
	}

	let top = 0, left = 0;

	// Loop through the xs and ys inside the bounds
	for (x = x1; x <= x2; x += 1) {
		for (y = y1; y <= y2; y += 1) {
			top = distanceCM.get(x, y - 1);
			left = distanceCM.get(x - 1, y);

			distanceCM.set(x, y, Math.min(Math.min(top, left) + 1, distanceCM.get(x, y)));
		}
	}

	let bottom = 0, right = 0;

	// Loop through the xs and ys inside the bounds
	for (x = x2; x >= x1; x -= 1) {
		for (y = y2; y >= y1; y -= 1) {
			bottom = distanceCM.get(x, y + 1);
			right = distanceCM.get(x + 1, y);

			distanceCM.set(x, y, Math.min(Math.min(bottom, right) + 1, distanceCM.get(x, y)));
		}
	}

	return distanceCM;
}

/*
Room.prototype.checkBlueprintCosts = function checkBlueprintCosts(startPos, name) {
	const startPosition = new RoomPosition(startPos.x, startPos.y, this.name);
	const terrain = new Room.Terrain(this.name);
	let costs = 0;
	let blueprints = {
		'bunker': roomBlueprints.bunker,
	}
	let i = 0, j = 0;

	for (i = 0; i < blueprints[name].length; i++) {
		for (j = 0; j < blueprints[name][i].length; j++) {
			if (!blueprints[name][i][j] || blueprints[name][i][j].rcl > (this.controller.level))
				continue;
			else if (_.filter(this.lookForAt(LOOK_STRUCTURES, startPosition), structure => structure.structureType == blueprints[name][i][j].type).length > 0)
				continue;
			else if (_.filter(this.lookForAt(LOOK_CONSTRUCTION_SITES, startPosition), constructionSite => constructionSite.structureType == blueprints[name][i][j].type).length > 0)
				continue;

			if (blueprints[name][i].type == STRUCTURE_ROAD)
				costs += blueprints[name][i][j].cost * (terrain.get(startPosition) == 2 ? 5 : 1);
			else
				costs += blueprints[name][i][j].cost;
		}
	}

	return costs;
}
*/

Room.prototype.buildBlueprint = function buildBlueprint(
	startPos: RoomPosition,
	name: string,
	energyCap: number = this.stats.totalAvailableEnergy): buildBlueprint {

	const startPosition = new RoomPosition(startPos.x, startPos.y, this.name);
	const terrain = new Room.Terrain(this.name);
	const blueprints: {
		[key: string]: (undefined | bluePrintMatrixElement)[][]
	} = {
		'bunker': roomBlueprints.bunker,
		'tower': roomBlueprints.tower,
		'extensionPack': roomBlueprints.extensionPack,
		'powerBunker': roomBlueprints.powerBunker,
		'lab': roomBlueprints.lab,
	};
	const structureList: buildBlueprintBuildElement[] = [];
	const costs = { cost: 0 };
	let constructionSites: buildBlueprintBuildElement[] = [];
	let i = 0, j = 0;

	for (i = 0; i < blueprints[name]?.length; i++) {
		for (j = 0; j < blueprints[name][i]?.length; j++) {
			const x = startPosition.x + j;
			const y = startPosition.y + i;

			if (!blueprints[name][i][j] || blueprints[name][i][j]?.rcl as number > (this.controller.level - 1)) {
				continue;
			}

			const existingStructures: Structure[] = this.lookForAt(LOOK_STRUCTURES, x, y);
			const existingConstructionSites: ConstructionSite[] = this.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);


			if (existingStructures.some((structure: Structure) => structure.structureType === blueprints[name][i][j]?.type)) { //|| existingConstructionSites.some(site => site.structureType === blueprints[name][i][j].type)
				continue;
			}

			let cost = 0;

			if (existingConstructionSites.length > 0) {
				cost = existingConstructionSites.reduce((totalCost: number, site: ConstructionSite) => {
					return totalCost + (site.progressTotal - site.progress);
				}, 0);
			} else if (blueprints[name][i][j]?.type === STRUCTURE_ROAD) {
				cost += CONSTRUCTION_COST[STRUCTURE_ROAD] * (terrain.get(x, y) === TERRAIN_MASK_SWAMP ? 5 : 1);
			} else if (blueprints[name][i][j]?.type === STRUCTURE_STORAGE) {
				cost += CONSTRUCTION_COST[blueprints[name][i][j]?.type as BuildableStructureConstant] / 2;
			} else {
				cost += CONSTRUCTION_COST[blueprints[name][i][j]?.type as BuildableStructureConstant];
			}

			if (costs.cost + cost > (energyCap * 1.3)) {
				continue;
			}

			costs.cost += cost;
			structureList.push({ pos: new RoomPosition(x, y, this.name), type: blueprints[name][i][j]?.type });

			if (existingConstructionSites?.length === 0) {
				constructionSites.push({ pos: new RoomPosition(x, y, this.name), type: blueprints[name][i][j]?.type });
			}
		}
	}

	return { name: `${name}_${Game.time}`, cost: costs.cost, structures: structureList, neededCreeps: -1 };
}

Room.prototype.floodFill = function (seeds: RoomPosition[], enableVisuals = false) {

	const room = this;

	// Construct a cost matrix for the flood
	const floodCM = new PathFinder.CostMatrix();

	// Get the terrain cost matrix
	const terrain:RoomTerrain  = room.getTerrain();

	// Construct a cost matrix for visited tiles and add seeds to it
	const visitedCM: CostMatrix = new PathFinder.CostMatrix();

	// Construct values for the flood
	let depth = 0;
	let thisGeneration: RoomPosition[] = seeds;
	let nextGeneration: RoomPosition[] = [];

	// Loop through positions of seeds
	for (const pos of seeds) {

		// Record the seedsPos as visited
		visitedCM.set(pos.x, pos.y, 1);
	}

	// So long as there are positions in this gen
	while (thisGeneration.length) {

		// Reset next gen
		nextGeneration = [];

		// Iterate through positions of this gen
		for (const pos of thisGeneration) {

			// If the depth isn't 0
			if (depth != 0) {

				// Iterate if the terrain is a wall
				if (terrain.get(pos.x, pos.y) == TERRAIN_MASK_WALL) continue;

				// Otherwise so long as the pos isn't a wall record its depth in the flood cost matrix
				floodCM.set(pos.x, pos.y, depth);

			}

			// Construct a rect and get the positions in a range of 1
			const rect = { x1: pos.x - 1, y1: pos.y - 1, x2: pos.x + 1, y2: pos.y + 1 },
				adjacentPositions = findPositionsInsideRect(rect);

			// Loop through adjacent positions
			for (const adjacentPos of adjacentPositions) {

				// Iterate if the adjacent pos has been visited or isn't a tile
				if (visitedCM.get(adjacentPos.x, adjacentPos.y) == 1) continue;

				// Otherwise record that it has been visited
				visitedCM.set(adjacentPos.x, adjacentPos.y, 1);

				// Add it to the next gen
				nextGeneration.push(new RoomPosition (adjacentPos.x, adjacentPos.y, room.name));
			}
		}

		// Set this gen to next gen
		thisGeneration = nextGeneration;

		// Increment depth
		depth++;
	}

	if (enableVisuals) {
		this.createVisual(0, 0, roomDimensions - 1, roomDimensions - 1, floodCM);
	}

	return floodCM;
}

/**
 * @param {number:range} range = 1
 * @returns {Array<string> rooms | null}
*/
Room.prototype.getAdjacentRooms = function (range = 1) {
	const parts = this.name.match(/[A-Z]+|\d+/g);
	let x = 0, y = 0;
	let roomName = '';
	let roomList = [];
	try {
		const startingPositionX = parseInt(parts[1]) + range;
		const startingPositionY = parseInt(parts[3]) + range;
		const endingPositionX = parseInt(parts[1]) - range;
		const endingPositionY = parseInt(parts[3]) - range;

		for (x = startingPositionX; x >= endingPositionX; x--) {
			for (y = startingPositionY; y >= endingPositionY; y--) {
				roomName = `${parts[0]}${x}${parts[2]}${y}`;
				if (roomName !== this.name) {
					roomList.push(roomName);
				}
			}
		}
	} catch (err) {
		console.log(`getAdjacentRoom: ${err}`)
		return [];
	}

	return roomList;
}

Room.prototype.getEnergyCapacity = function () {
	let capacity = 0;

	const allStructures = this.find(FIND_STRUCTURES);
	allStructures.forEach((structure: Structure) => {
		if (structure.isActive()) {
			switch (structure.structureType) {
				case STRUCTURE_EXTENSION: {
					capacity += 50;
					break;
				}
				case STRUCTURE_SPAWN: {
					capacity += 300;
					break;
				}
				case STRUCTURE_POWER_SPAWN: {
					capacity += 5000;
					break;
				}
			}
		}
	});

	return capacity;
}

Room.prototype.createVisual = function createVisual(x1: number, y1: number, x2: number, y2: number, distanceCM: CostMatrix): void {
	const visual = new RoomVisual(this.name);
	let x = 0, y = 0;

	for (x = x1; x <= x2; x += 1) {
		for (y = y1; y <= y2; y += 1) {
			visual.rect(x - 0.5, y - 0.5, 1, 1, { fill: `hsl(${200 + (distanceCM.get(x, y) * 10)}, 100%, 60%)`, opacity: 0.07, });
			if (distanceCM.get(x, y) > 0) {
				visual.text(distanceCM.get(x, y).toString(), x, y);
			} else {
				visual.rect(x - 0.5, y - 0.5, 1, 1, { fill: `hsl(330, 100%, 40%)`, opacity: 0.2, });
			}
		}
	}
}

//#region normal Functions
function findPositionsInsideRect(rect: { x1: number, y1: number, x2: number, y2: number }): {x: number, y:number}[] {

	const positions: {x: number, y:number}[] = []

	for (let x = rect.x1; x <= rect.x2; x++) {
		for (let y = rect.y1; y <= rect.y2; y++) {

			// Iterate if the pos doesn't map onto a room

			if (x < 0 || x >= roomDimensions ||
				y < 0 || y >= roomDimensions) continue

			// Otherwise ass the x and y to positions

			positions.push({ x, y })
		}
	}

	return positions
}

function generateCheckMatrix(rect: boolean, size: number) {
	if (rect) {
        console.log("square", size);
		return generateSymetricSquareMatrix(size);
	} else {
        console.log("diagonal", size);
		return generateDiamondMatrix(size);
	}
}

function generateDiamondMatrix(size: number): number[][] {
	const matrix: number[][] = [];
	let i = 0, j = 0;

	for (i = 0; i < size; i++) {
		const row: number[]= new Array(size).fill(0);
		const distance = i <= Math.floor(size / 2) ? i : Math.abs(Math.floor(size / 2) - (i - Math.floor(size / 2)));
		const start = Math.floor(size / 2) - distance;
		const end = Math.floor(size / 2) + distance;

		for (j = start; j <= end; j++) {
			row[j] = 1;
		}

		matrix.push(row);
	}

	return matrix;
}

function generateSymetricSquareMatrix(size: number): number[][] {
	const matrix: number[][] = [];
	const middleIndex = Math.floor(size / 2);
	let i = 0, j = 0;

	for (i = 0; i < size; i++) {
		const row: number[] = new Array(size).fill(0);
		matrix.push(row);
	}


	for (i = 0; i < size; i++) {
		for (j = 0; j < size; j++) {
			if ((i < middleIndex && j < middleIndex && i + j >= middleIndex - 1) ||
				(i < middleIndex && j >= middleIndex && j - i <= middleIndex) ||
				(i >= middleIndex && j < middleIndex && Math.abs(j - i) <= middleIndex) ||
				(i >= middleIndex && j >= middleIndex && (i - middleIndex) + j < size)) {
				matrix[i][j] = 1;
			}
		}
	}

	return matrix;
}
//#endregion

