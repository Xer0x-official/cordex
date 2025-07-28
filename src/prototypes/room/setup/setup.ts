import {setupProperties} from "./properties";
import {setupPaths} from "./paths";
import {setupMemory} from "./memory"
import {setupFlags} from "./flags";
import {setupBuildings} from "./buildings";

Room.prototype.setupRoom = function (isRemote: boolean = false, origin: string = ''): void {
	if (this.memory.isSetup) {
		return;
	}

	this.memory.origin = origin;
    this.memory.buildingPlan = [];

    if (!isRemote) {
        setupMemory(this.name);
        setupProperties(this, isRemote, this.find(FIND_STRUCTURES)
            .filter((structure: Structure) => structure.structureType === STRUCTURE_SPAWN)[0]!.pos);
        setupBuildings(this);
        setupFlags(this);
        // setupPaths(this, Game.getObjectById(this.colonieMemory.spawns[0]) as StructureSpawn);
    } else {
        this.colonieMemory.remotes.push(this.name);
        let originSpawn = Game.getObjectById(Game.rooms[this.memory.origin]!.spawns[0])!;
        setupFlags(this);
        setupProperties(this, isRemote, originSpawn.pos);
        // setupPaths(this, Game.getObjectById(this.colonieMemory.spawns[0]) as StructureSpawn, origin);
    }

    this.memory.isSetup = true;
    console.log(`ROOM (${this.name}): Done setting up the room`);
}
