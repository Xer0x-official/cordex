// export function setupPaths(room: Room, spawn: StructureSpawn, origin: string = '') {
// 	let importantPoints = [room.controller, ...room.find(FIND_SOURCES_ACTIVE)];
// 	let paths = room.colonieMemory.paths;

// 	const findSmoothPath = (from: RoomPosition, to: RoomPosition) => {
// 		let rawPath = PathFinder.search(from, { pos: to, range: 1 }).path;

// 		// Path smoothing
// 		let smoothedPath = rawPath;
// 		let startRange = from.getRangeTo(to);

// 		// If the raw path is longer than the direct range to the target, smooth the path
// 		if (rawPath.length > startRange) {
// 			smoothedPath = rawPath.filter((step, index) => {
// 				// Keep the current step if it is the first or last element
// 				if (index === 0 || index === rawPath.length - 1) return true;

// 				// Keep the current step if it changes direction
// 				let prevStep = rawPath[index - 1];
// 				let nextStep = rawPath[index + 1];
// 				return (step.x - prevStep.x !== nextStep.x - step.x) || (step.y - prevStep.y !== nextStep.y - step.y);
// 			});
// 		}

// 		return smoothedPath;
// 	}

// 	const findClosestPathStart = (pos: RoomPosition): RoomPosition => {
// 		if (Object.keys(paths).length === 0 || paths == undefined) {
// 			return spawn.pos;  // Rückgabe der Spawn-Position, wenn keine Pfade vorhanden sind
// 		}

// 		let filteredPaths = Object.values(paths).reduce((closest: any, currentPath: any) => {
// 			let distance = pos.getRangeTo(currentPath.path[0]);
// 			return distance < pos.getRangeTo(closest.path[0]) ? currentPath : closest;
// 		}, paths[Object.keys(paths)[0]].path[0]);

// 		return filteredPaths;
// 	}

// 	importantPoints.forEach((point, index) => {
// 		if (point) {
// 			let closestPathStart: RoomPosition = findClosestPathStart(point.pos);
// 			let pathName = `${room.name}_to_${point.id}_${index}`;
// 			paths[pathName] = {
// 				built: false,
// 				path: findSmoothPath(closestPathStart, point.pos)
// 			};
// 		}
// 	});

// 	room.colonieMemory.paths = paths;
// }


// export function setupPaths(room: Room, spawn: StructureSpawn, origin: string = '') {
//     const controllerPos: RoomPosition = room.controller ? room.controller.pos : new RoomPosition(0, 0, origin);
//     let sourceCounter = 0;
//     let paths = room.colonieMemory.paths;

//     const findSmoothPath = (from: RoomPosition, to: RoomPosition) => {
//         // Find the raw path
//         let rawPath = PathFinder.search(from, {pos: to, range: 1}).path;

//         // Path smoothing
//         let smoothedPath = rawPath;
//         let startRange = from.getRangeTo(to);

//         // If the raw path is longer than the direct range to the target, smooth the path
//         if (rawPath.length > startRange) {
//             smoothedPath = rawPath.filter((step, index) => {
//                 // Keep the current step if it is the first or last element
//                 if (index === 0 || index === rawPath.length - 1) return true;

//                 // Keep the current step if it changes direction
//                 let prevStep = rawPath[index - 1];
//                 let nextStep = rawPath[index + 1];
//                 return (step.x - prevStep.x !== nextStep.x - step.x) || (step.y - prevStep.y !== nextStep.y - step.y);
//             });
//         }
//         return smoothedPath;
//     }

//     room.find(FIND_SOURCES_ACTIVE).forEach(function (source) {
//         sourceCounter++;
//         paths[`${room.name}_source_${sourceCounter}_${Game.time}`] = {
//             built: false,
//             path: findSmoothPath(spawn.pos, source.pos)
//         };
//     });

//     if (origin === '') {
//         let name = `${room.name}_controller_${Game.time + sourceCounter + 1}`;
//         paths[name] = {
//             built: false,
//             path: findSmoothPath(spawn.pos, controllerPos),
//         };
//     }

//     room.colonieMemory.paths = paths;
// }

export function setupPaths(room: Room, spawn: StructureSpawn, origin: string = '') {
    const controllerPos: RoomPosition = room.controller ? room.controller.pos : new RoomPosition(0, 0, origin);
    let sourceCounter = 0;
    let paths = room.colonieMemory.paths;

    const findSmoothPath = (from: RoomPosition, to: RoomPosition) => {
        // Find the raw path
        let rawPath = PathFinder.search(from, {pos: to, range: 1}).path;

        // Path smoothing
        let smoothedPath = rawPath;
        // let startRange = from.getRangeTo(to);

        // // If the raw path is longer than the direct range to the target, smooth the path
        // if (rawPath.length > startRange) {
        //     smoothedPath = rawPath.filter((step, index) => {
        //         // Keep the current step if it is the first or last element
        //         if (index === 0 || index === rawPath.length - 1) return true;

        //         // Keep the current step if it changes direction
        //         let prevStep = rawPath[index - 1];
        //         let nextStep = rawPath[index + 1];
        //         return (step.x - prevStep.x !== nextStep.x - step.x) || (step.y - prevStep.y !== nextStep.y - step.y);
        //     });
        // }
        return smoothedPath;
    }

	const findNearestPlannedRoad = (position: RoomPosition) => {
		let nearestRoad;
		let nearestDistance = Infinity;

		// Funktion zum Berechnen der Distanz zwischen zwei Positionen, auch in verschiedenen Räumen
		const calculateDistance = (pos1: RoomPosition, pos2: RoomPosition) => {
			if (pos1.roomName === pos2.roomName) {
				return pos1.getRangeTo(pos2);
			} else {
				let route = Game.map.findRoute(pos1.roomName, pos2.roomName);
				if (route === -2) return Infinity;  // Keine Route gefunden
				return route.length;  // Die Länge der Route als Distanz verwenden
			}
		}

	    // Überprüfung der spezifizierten Punkte um den Spawn und der geplanten Straßen
		let checkPositions = [];
		for (let i = -3; i <= 3; i++) {
			for (let j = -3; j <= 3; j++) {
				if (Math.abs(i) + Math.abs(j) !== 3) continue;
				checkPositions.push(new RoomPosition(spawn.pos.x + i, spawn.pos.y + 2 + j, spawn.pos.roomName));
			}
		}

		// Überprüfung der spezifizierten Punkte um den Spawn und der geplanten Straßen
		checkPositions.concat(...Object.values(paths).map(plannedRoad => plannedRoad.path)).forEach(step => {
			let distance = calculateDistance(position, step);
			if (distance < nearestDistance) {
				nearestDistance = distance;
				nearestRoad = step;
			}
		});

		return nearestRoad || spawn.pos;
	}

    room.find(FIND_SOURCES_ACTIVE).forEach(function (source) {
        sourceCounter++;
        let start = findNearestPlannedRoad(source.pos);
        paths[`${origin}_${room.name}_source_${sourceCounter}_${Game.time}`] = {
            built: false,
            path: findSmoothPath(start, source.pos)
        };
    });

    if (origin === '') {
        let start = findNearestPlannedRoad(controllerPos);
        let name = `${room.name}_controller_${Game.time + sourceCounter + 1}`;
        paths[name] = {
            built: false,
            path: findSmoothPath(start, controllerPos),
        };
    }

    room.colonieMemory.paths = paths;
}
