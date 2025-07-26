
import * as roomBlueprints from "room/blueprints";

export function setupBuildings(room: Room) {
	const buildingMatrix = new PathFinder.CostMatrix();
	const spawn = Game.getObjectById(room.spawns[0]) as Structure;
	const startPosition = new RoomPosition(spawn.pos.x, spawn.pos.y + 2, room.name);
	const baseExtensions = room.colonieMemory.baseExtensions;
	const blueprints: {
		[key: string]: (undefined | bluePrintMatrixElement)[][]
	} = {
		'bunker': roomBlueprints.bunker,
		'tower': roomBlueprints.tower,
		'powerBunker': roomBlueprints.powerBunker,
		'lab': roomBlueprints.lab,
		'extensionPack_1': roomBlueprints.extensionPack,
		'extensionPack_2': roomBlueprints.extensionPack,
		'extensionPack_3': roomBlueprints.extensionPack,
		'extensionPack_4': roomBlueprints.extensionPack,
		'extensionPack_5': roomBlueprints.extensionPack,
		'extensionPack_6': roomBlueprints.extensionPack,
		'extensionPack_7': roomBlueprints.extensionPack,
		'extensionPack_8': roomBlueprints.extensionPack,
	};
	let x = 0, y = 0;
	let offset = 0;
	let position: RoomPosition = new RoomPosition(0, 0, room.name);

	for (let key in blueprints) {
		switch (key) {
			case 'extensionPack_1':
			case 'extensionPack_2':
			case 'extensionPack_3':
			case 'extensionPack_4':
			case 'extensionPack_5':
			case 'extensionPack_6':
			case 'extensionPack_7':
			case 'extensionPack_8':
			case 'extensionPack_9':
			case 'extensionPack_10':
			case 'extensionPack_11': {
				baseExtensions.extensionPacks.push(room.getPositionForBuild(3, [new RoomPosition(startPosition.x, startPosition.y, room.name)], false, buildingMatrix));
				position = baseExtensions.extensionPacks[baseExtensions.extensionPacks.length - 1];
				offset = -1;
				break;
			}
			case 'lab': {
				baseExtensions[key] = room.getPositionForBuild(5, [new RoomPosition(startPosition.x, startPosition.y, room.name)], false, buildingMatrix);
				position = baseExtensions[key];
				offset = -2;
				break;
			}
			case 'powerBunker': {
                baseExtensions[key] = room.getPositionForBuild(3, [new RoomPosition(startPosition.x, startPosition.y, room.name)], true, buildingMatrix);
                position = baseExtensions[key];
                offset = -1;
                break;
            }
			case 'tower': {
				baseExtensions[key] = room.getPositionForBuild(3, [new RoomPosition(startPosition.x, startPosition.y, room.name)], true, buildingMatrix);
				position = baseExtensions[key];
				offset = -1;
				break;
			}
			case 'bunker': {
				position = startPosition;
				offset = -3;
			}
		}

		for (y = 0; y < blueprints[key].length; y++) {
			for (x = 0; x < blueprints[key][y].length; x++) {
				if (blueprints[key][y][x]) {
                    const structureType = blueprints[key][y][x]?.type;
                    if (structureType === undefined || structureType === null) {
                        console.log("structureType undefined at: " + x + " " + y + " with key " + key);
                        continue;
                    }

                    room.memory.buildingPlan.push({type: structureType,
                        position: new RoomPosition((position.x + offset) + x, (position.y + offset) + y, room.name)});

                    let structureCost = structureType === STRUCTURE_ROAD ? 10 : 255;
                    buildingMatrix.set((position.x + offset) + x, (position.y + offset) + y, structureCost);
				}
			}
		}

		// console.log(`Added ${key} at Position (${position.x + offset}, ${position.y + offset})`);
		room.buildingMatrix = buildingMatrix;
	}
}
