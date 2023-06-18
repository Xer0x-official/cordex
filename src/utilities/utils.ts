
export function visualizePath(room: Room, path: RoomPosition[]): void {
	for (let i = 0; i < path.length; i++) {
		if ((i + 1) < path.length) {
			room.visual.line(path[i].x, path[i].y, path[i + 1].x, path[i + 1].y);
		}
	}
}

export function getElementsByPattern<T extends object>(object:T, pattern:string): Array<T[keyof T]> {
	const keys = Object.keys(object);
	const matchingKeys = keys.filter(key => key.match(pattern)) || keys.filter(key => key.includes(pattern));
	const matchingValues = matchingKeys.map(key => object[key as keyof T]);
	return matchingValues;
}
