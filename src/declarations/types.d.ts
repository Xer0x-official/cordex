
type buildBlueprintBuildElement = {
	pos: RoomPosition;
	type: BuildableStructureConstant | StructureController | undefined;
}

type buildBlueprint = {
	name: string;
	cost: number;
	structures: buildBlueprintBuildElement[];
	neededCreeps: number;
}

type bluePrintMatrixElement = {
	rcl: number,
	type: BuildableStructureConstant,
}

type colonieQueueElement = {
	name: string;
	cost?: number;
	pos?: RoomPosition;
	id?: string;
	structures?: buildBlueprintBuildElement[];
	bodyParts?: BodyPartConstant[],
	memory?: CreepMemory;
	neededCreeps?: number;
}

type pathPosition = {
	built: boolean;
	path: RoomPosition[];
}

type ISpawnQueryElement = {
	bodyParts: BodyPartConstant[],
	name: string,
	memory: CreepMemory,
}
/*
type CreepSpawnMemory = {
	job: string,
	working: boolean,
	target: object | null,
	origin: string
}
 */
type Coord = { x: number, y: number };
type HasPos = { pos: RoomPosition }

type StructureWithStorage =
    | StructureExtension
    | StructureSpawn
    | StructureLink
    | StructureStorage
    | StructureTower
    | StructurePowerSpawn
    | StructureLab
    | StructureTerminal
    | StructureContainer
    | StructureNuker
    | StructureFactory;

type resourceSources = {
	[name: string]: any;
	dropped: Resource[];
	container: StructureContainer[];
	storage: StructureStorage[];
};
