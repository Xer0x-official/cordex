import {setupProperties} from "./properties";
import {setupPaths} from "./paths";
import {setupMemory} from "./memory"
import {setupFlags} from "./flags";
import {setupBuildings} from "./buildings";

Room.prototype.setupRoom = function (isRemote: boolean = false, origin: string = ''): void {
	this.memory.origin = origin;

	if (!isRemote) {
		setupMemory(this.name);
		setupProperties(this)
		setupFlags(this);
		setupPaths(this, Game.getObjectById(this.colonieMemory.spawns[0]) as StructureSpawn);
		setupBuildings(this);
	} else {
		this.colonieMemory.remotes.push(this.name);
		setupFlags(this);
		setupPaths(this, Game.getObjectById(this.colonieMemory.spawns[0]) as StructureSpawn, origin);

	}

	console.log(`ROOM (${this.name}): Done setting up the room`);
}
