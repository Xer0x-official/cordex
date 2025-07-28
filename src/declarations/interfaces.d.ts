interface IDroppedResourceMemory {
	[name: string]: any;
	energy: {[name: Id<Resource>]: {pos: RoomPosition, transporterCount: number}},
	minerals: {[name: Id<Mineral>]: {pos: RoomPosition, transporterCount: number}},
}

interface ISourceMemory {
    pos: RoomPosition,
    miner: Id<Creep> | null,
    resourcePath: IColoniePath,
    distance: number
}

interface IResourceMemory {
	[name: string]: any;
	energy: {[name: Id<Source>]: ISourceMemory },
	minerals: {[name: Id<Mineral>]: ISourceMemory },
	dropped: IDroppedResourceMemory
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
	myStructurs: Id<Structure>[],
	baseExtensions: IBaseExtensions,
	stats: IColonieStats,
	queues: IColonieQueues,
	paths: { [name: string]: IColoniePath },
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
	obstacles?: { pos: RoomPosition }[];
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
	route?: { [roomName: string]: boolean };
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

interface spawnQueueElement extends colonieQueueElement {
    name: string;
    bodyParts: BodyPartConstant[],
    memory: CreepMemory;
    cost?: number;
    pos?: RoomPosition;
    id?: string;
}

interface buildQueueElement extends colonieQueueElement {
    name: string;
    cost: number;
    pos: RoomPosition;
    id: string;
    structures: buildBlueprintBuildElement[];
    neededCreeps: number;
}

interface Room {
	repairQueue: colonieQueueElement[];
	spawnQueue: spawnQueueElement[];
	buildQueue: buildQueueElement[];
	stats: IColonieStats;
	spawns: Id<StructureSpawn>[];
	colonieMemory: IColonieMemory;
	buildingMatrix: CostMatrix;
	isSetup: boolean;
	baseExtensions: IBaseExtensions;
	myStructurs: Id<Structure>[];

	setupRoom: (isRemote?: boolean, origin?: string) => void;
	getMineral: () => any;
	getBuildQueueTask: (name?: string) => any;
	getPositionForBuild: (spaceNeeded?: number, sourcePoint?: RoomPosition[], rect?: boolean, buildingMatrix?: CostMatrix | undefined) => RoomPosition;
	distanceTransform: (enableVisuals?: boolean, rect?: boolean, buildingMatrix?: CostMatrix, x1?: number, y1?: number, x2?: number, y2?: number) => CostMatrix;
    fixedDistanceTransform: () => CostMatrix;
	rectengularDistanceTransform: (x1?: number, y1?: number, x2?: number, y2?: number, buildingMatrix?: CostMatrix) => CostMatrix;
	diagonalDistanceTransform: (x1?: number, y1?: number, x2?: number, y2?: number, buildingMatrix?: CostMatrix) => CostMatrix;
	buildBlueprint: (startPos: RoomPosition, name: string, energyCap?: number) => buildBlueprint;
	floodFill: (seeds: RoomPosition[], enableVisuals?: boolean) => CostMatrix;
	getAdjacentRooms: (range?: number) => string[];
	getEnergyCapacity: () => number;
	createVisual: (x1: number, y1: number, x2: number, y2: number, distanceCM: CostMatrix) => void;
	getSources: () => any;
	getSpawn: () => StructureSpawn;
	getMySpawns: () => any;
	testing: () => void;
}

interface IPlannedStructure {
    type: string;
    position: RoomPosition;
}

interface Structure {
	isWalkable: () => boolean;
}

interface RoomPosition {
	getFreePositions: (range?: number, ignoreCreeps?: boolean) => RoomPosition[];
	getNearbyPositions: (range?: number) => RoomPosition[];
	isNearEdge: () => any;
	isEdge: () => any;
	pushCreepsAway: () => void;
}

interface Creep {
	getResources: (room: Room, lookInRoom: boolean, colonieMemory: IColonieMemory, creep: Creep, targetObject: AnyStructure) => resourceSources;
	setTransporterTarget: (creep: Creep, source: any, resourceSources: resourceSources, isPriorityTarget: boolean) => any;
	setWorkerTarget: (creep: Creep, resourceSources: resourceSources, source: any) => any;
	getResourceTarget: (resourceType?: "energy", lookInRoom?: boolean) => boolean;
	loadResource: (resourceType?: "energy", lookInRoom?: boolean) => Id<Resource<ResourceConstant>> | Id<StructureStorage> | Id<StructureContainer> | null;
	target: Id<Source> | Id<Mineral> | Id<AnyStructure> | Id<AnyCreep> | Id<Resource> | RoomPosition | null;

	hasReachedDestination: (target: any) => boolean;
	moveToTarget: (err: any, target: any) => any;
	onRoomBorder: (position?: any) => 1 | 3 | 5 | 7 | null;
	moveToRoom: (roomName: any) => any;
	isStuck: () => boolean;
	clearRouting: () => void;
	checkPathPosition: () => void;
	transferToTarget: (target: any, resource: any, ammount: any) => any;
	buildTarget: () => any;
	withdrawFromTarget: (target: any, resource: any) => any;
	harvestTarget: (target: any, isOtherRoom: boolean) => any;
	pickupResource: (target: any) => any;
	getRescycled: () => any;
	aboutToDie(): boolean;
	travelTo(destination: HasPos | RoomPosition, ops?: TravelToOptions): number;
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
}

interface CreepMemory {
	[name: string]: any;
	job: string,
	working: boolean,
	task: string,
	origin: string,
    amountAssigned: number,
    transportTask?: TransportTask,
	target?: Id<Resource> | Id<Source> | Id<Mineral> | Id<AnyStructure> | Id<AnyCreep> | Id<ConstructionSite> | null,
	energyTarget?: Id<StructureContainer | StructureStorage | Resource | StructureLink | StructureTerminal> | null;
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
    buildingPlan: IPlannedStructure[];
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
	test: number[];
	colonies: { [name: string]: IColonieMemory };
	empire: IEmpireMemory;
	manager: any;
	operations: any;
	settings: any;
    patrol: any;
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

interface ICreepClass {
	creep: Creep;
	name: string;
	memory: CreepMemory;
	_run: Function;
	_updateMemory?: Function;
}

interface Spawn {
	pushCreepsAway: () => void;
}

interface RoomVisual {
    structure: (x: number, y: number, type: string, opts={}) => RoomVisual;
    // connectRoads: (opacity: number, color: ColorConstant) => RoomVisual | null;
}

// Beschreibung einer Transportanfrage
interface TransportRequest {
    id: string;
    originId: Id<StructureContainer | StructureStorage | Resource | StructureLink | StructureTerminal>;    // Objekt, von dem Energie geholt wird
    possibleDestinations: Id<Structure | AnyCreep>[]; // potenzielle Abnehmer
    amount: number;                           // benötigte Menge
    priority: number;
}

// Daten, die einem Transporter zugewiesen werden
interface TransportTask {
    requestId: string;
    originId: Id<StructureContainer | StructureStorage | Resource | StructureLink | StructureTerminal>;
    targetId: Id<Source> | Id<Mineral> | Id<AnyStructure> | Id<AnyCreep> | Id<ConstructionSite>;
    amount: number;
}