export function setupPaths(room: Room, spawn: StructureSpawn, origin: string = '') {
    const controllerPos: RoomPosition = room.controller ? room.controller.pos : new RoomPosition(0, 0, origin);
    let sourceCounter = 0;
    let paths = room.colonieMemory.paths;

    const findSmoothPath = (from: RoomPosition, to: RoomPosition) => {
        // Find the raw path
        let rawPath = PathFinder.search(from, {pos: to, range: 1}).path;

        // Path smoothing
        let smoothedPath = rawPath;
        let startRange = from.getRangeTo(to);

        // If the raw path is longer than the direct range to the target, smooth the path
        if (rawPath.length > startRange) {
            smoothedPath = rawPath.filter((step, index) => {
                // Keep the current step if it is the first or last element
                if (index === 0 || index === rawPath.length - 1) return true;

                // Keep the current step if it changes direction
                let prevStep = rawPath[index - 1];
                let nextStep = rawPath[index + 1];
                return (step.x - prevStep.x !== nextStep.x - step.x) || (step.y - prevStep.y !== nextStep.y - step.y);
            });
        }
        return smoothedPath;
    }

    room.find(FIND_SOURCES_ACTIVE).forEach(function (source) {
        sourceCounter++;
        paths[`${room.name}_source_${sourceCounter}_${Game.time}`] = {
            built: false,
            path: findSmoothPath(spawn.pos, source.pos)
        };
    });

    if (origin === '') {
        let name = `${room.name}_controller_${Game.time + sourceCounter + 1}`;
        paths[name] = {
            built: false,
            path: findSmoothPath(spawn.pos, controllerPos),
        };
    }

    room.colonieMemory.paths = paths;
}
