
interface IResourceMemory {
	[name: string]: any;
	energy: Id<Source>[],
	minerals: Id<Mineral>[],
}

interface IColonieStatsRoles {
	[name: string]: any;
	miner: number,
	transporter: number,
	worker: number,
	scouter: number,
}

interface IColonieStats {
	[name: string]: any;
	resourceCount: number,
	creepsCount: number,
	roles: IColonieStatsRoles,
	totalAvailableEnergy: number,
}

interface IBaseExtensions {
	[name: string]: any;
	lab: RoomPosition;
	extensionPacks: RoomPosition[];
	powerBunker: RoomPosition;
	tower: RoomPosition;
	looseExtensions: RoomPosition[];
}

interface IColonieQueues {
	[name: string]: any;
	spawn: colonieQueueElement[];
	build: colonieQueueElement[];
	repair: colonieQueueElement[];
}

interface IColoniePath {
	built: boolean;
	path: RoomPosition[],
}

interface IColonieMemory {
	[name: string]: any;
	base: string,
	remotes: string[],
	resources: IResourceMemory,
	spawns: Id<StructureSpawn>[],
	buildingMatrix: number[],
	myStructurs: string[],
	baseExtensions: IBaseExtensions,
	stats: IColonieStats,
	queues: IColonieQueues,
	paths: {[name: string]: IColoniePath},
}

interface PathfinderReturn {
    path: RoomPosition[];
    ops: number;
    cost: number;
    incomplete: boolean;
}

interface TravelToReturnData {
    nextPos?: RoomPosition;
    pathfinderReturn?: PathfinderReturn;
    state?: TravelState;
    path?: string;
}

interface TravelToOptions {
    ignoreRoads?: boolean;
    ignoreCreeps?: boolean;
    ignoreStructures?: boolean;
    preferHighway?: boolean;
    highwayBias?: number;
    allowHostile?: boolean;
    allowSK?: boolean;
    range?: number;
    obstacles?: {pos: RoomPosition}[];
    roomCallback?: (roomName: string, matrix: CostMatrix) => CostMatrix | boolean;
    routeCallback?: (roomName: string) => number;
    returnData?: TravelToReturnData;
    restrictDistance?: number;
    useFindRoute?: boolean;
    maxOps?: number;
    movingTarget?: boolean;
    freshMatrix?: boolean;
    offRoad?: boolean;
    stuckValue?: number;
    maxRooms?: number;
    repath?: number;
    route?: {[roomName: string]: boolean};
    ensurePath?: boolean;
}

interface TravelData {
    state: any[];
    path?: string;
}

interface TravelState {
    stuckCount: number;
    lastCoord: Coord;
    destination: RoomPosition;
    cpu: number;
}

interface Room {
	repairQueue: colonieQueueElement[];
	spawnQueue: colonieQueueElement[];
	buildQueue: colonieQueueElement[];
	stats: IColonieStats;
	spawns: Id<StructureSpawn>[];
	colonieMemory: IColonieMemory;
	buildingMatrix: number[];
	isSetup: boolean;
	baseExtensions: IBaseExtensions;

	setupRoom: (isRemote?: boolean, origin?: string) => void;
	getMineral: () => any;
	getBuildQueueTask: (name?: string) => any;
	getPositionForBuild: (spaceNeeded?: number, sourcePoint?: RoomPosition[], rect?: boolean, planingMatrix?: CostMatrix | undefined) => RoomPosition;
	distanceTransform: (enableVisuals?: boolean, rect?: boolean, planingMatrix?: any, x1?: number, y1?: number, x2?: number, y2?: number) => any;
	rectengularDistanceTransform: (x1?: number, y1?: number, x2?: number, y2?: number, plannedMatrix?: CostMatrix) => CostMatrix;
	diagonalDistanceTransform: (x1?: number, y1?: number, x2?: number, y2?: number, plannedMatrix?: CostMatrix) => CostMatrix;
	buildBlueprint: (startPos: RoomPosition, name: string, energyCap?: number) => buildBlueprint;
	floodFill: (seeds: RoomPosition[], enableVisuals?: boolean) => CostMatrix;
	getAdjacentRooms: (range?: number) => string[] | null;
	getEnergyCapacity: () => number;
	createVisual: (x1: number, y1: number, x2: number, y2: number, distanceCM: CostMatrix) => void;
	getSources: () => any;
	getSpawn: () => StructureSpawn;
	getMySpawns: () => any;
	testing: () => void;
}

interface Structure {
	isWalkable: () => boolean;
}

interface RoomPosition {
	getFreePositions: (range?: number) => RoomPosition[];
	getNearbyPositions: (range?: number) => RoomPosition[];
	isNearEdge: () => any;
	isEdge: () => any;
}

interface Creep {
	travelTo(destination: HasPos|RoomPosition, ops?: TravelToOptions): number;
	hasState: () => boolean;
	getState: () => number;
	setState: (state: number) => void;
	getHomeroom: () => string;
	isInHomeroom: () => boolean;
	hasEnergy: () => boolean;
	isEmpty: () => boolean;
	isFull: () => boolean;
	getTask: () => string;
	setTask: (task?: string) => 0 | -1;
	getJob: () => string;
	clearTarget: () => number;
	getCountOfBodyPart: (partType: BodyPartConstant) => number;
	loadResource: (resourceType?: "energy") => Resource<ResourceConstant> | StructureStorage | StructureContainer | null;
}

interface CreepMemory {
	[name: string]: any;
	job: string,
	working: boolean,
	target: any,
	task: string,
	origin: string,
	lastPositions: RoomPosition[],
	pathToTarget: number[],
}

interface PowerCreepMemory {
	[name: string]: any;
}

interface FlagMemory {
	[name: string]: any;
}

interface SpawnMemory {
	[name: string]: any;
}

interface RoomMemory {
	[name: string]: any;
	origin: string;
	isSetup: boolean;
}

interface IEmpireHostileRoom {
	[name: string]: any;
	owner: string;
	linearDistance: number;
}

interface IEmpireMemory {
	hostileRooms?: IEmpireHostileRoom[];
}

interface Memory {
	colonies: { [name: string]: IColonieMemory };
	empire: IEmpireMemory;
	manager: any;
	operations: any;
	settings: any;
}


interface IRoomLogic {
	ticks: number;
	memory: RoomMemory;
}

interface IBaseRoomClass {
	room: Room;
	name?: string;
	_run: Function;
	_updateMemory: Function;
}

interface ITower {
	structureType?: StructureConstant;
	tower: StructureTower;
}

interface ILink {
	structureType?: StructureConstant;
	link: StructureLink;
}
