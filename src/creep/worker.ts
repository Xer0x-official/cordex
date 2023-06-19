
function worker(creep) {
	// TODO es sollen zuerst Resourcen berücksichtig werde die im abstand von 2 feldern liegen
	if (creep.spawning)
		return;

	if (!creep.room.getBuildQueueTask(creep.memory.task))
		creep.memory.task = null;

    if (creep.memory.task == null) {
		if (creep.room.memory.buildQueue.length > 0) {
			creep.memory.task = creep.room.memory.buildQueue[0].name;
		} else {
			creep.memory.task = 'rescycle';
		}
	}

	if (creep.memory.task == 'rescycle')
		creep.getRescycled();
	
	else if (creep.memory.task.includes('controller'))
		upgradeController(creep);
	else // creep.memory.task.includes('bunker')
		buildBunker(creep);
}

module.exports = worker;

function updateBuildQueueCost(creep) {
	let workCost = creep.getCountOfBodyPart(WORK) * (creep.getTask().includes('controller') ? 1 : 5);
	let i = 0;

	for (i = 0; i < creep.room.getBuildQueue().length; i++) {
		if (creep.room.getBuildQueue()[i].name.includes(creep.getTask())) {
			break;
		}
	}

	if (creep.room.memory.buildQueue[i]) {
		if (workCost <= creep.store.getUsedCapacity(RESOURCE_ENERGY))
			creep.room.memory.buildQueue[i].cost -= workCost;
		else
			creep.room.memory.buildQueue[i].cost -= creep.store.getUsedCapacity(RESOURCE_ENERGY) - (creep.store.getUsedCapacity(RESOURCE_ENERGY) % creep.getCountOfBodyPart(WORK));
	}
}

function updateBuildQueueStructures(creep) {
	let i = 0, j = 0;

	for (i = 0; i < creep.room.getBuildQueue().length; i++) {
		if (creep.room.getBuildQueue()[i].structures.length < 1) {
			creep.room.memory.buildQueue.splice(i, 1);
			continue;
		}

		if (creep.room.getBuildQueue()[i].name != creep.getTask())
			continue;

		for (j = 0; j < creep.room.getBuildQueue()[i].structures.length; j++) {
			if (creep.room.lookForAt(LOOK_CONSTRUCTION_SITES, creep.room.getBuildQueue()[i].structures[j].pos.x, creep.room.getBuildQueue()[i].structures[j].pos.y).length < 1) {
				creep.room.memory.buildQueue[i].structures.splice(j, 1);
			}
		}
	}
}

function upgradeController(creep) {
	if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0)
		creep.loadResource();

	else {
		if (creep.moveToTarget(creep.upgradeController(creep.room.controller), creep.room.controller) == OK)
			updateBuildQueueCost(creep);
	}
}

function buildBunker(creep) {
	let taskPositions = [];
	let i = 0;
	let taskStructures = [];
	let target = null;

	if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0)
		creep.loadResource();

	else {
		if (!creep.target) {
			if (!creep.room.getBuildQueueTask(creep.getTask()) || creep.room.getBuildQueueTask(creep.getTask()) == null)
				return;
			taskStructures = creep.room.getBuildQueueTask(creep.getTask()).structures;

			for (i = 0; i < taskStructures.length; i++) {
				taskPositions.push(creep.room.getPositionAt(taskStructures[i].pos.x, taskStructures[i].pos.y));
			}

			target = creep.pos.findClosestByPath(taskPositions);
			creep.target = target;
		}

		if (creep.buildTarget() == OK) {
			updateBuildQueueCost(creep);
		}
		updateBuildQueueStructures(creep);

		if (!creep.target || creep.target == null)
			return;
		
		outerLoop: for (i = 0; i < creep.room.getBuildQueue().length; i++) {
			if (creep.room.getBuildQueue()[i].name != creep.getTask())
				continue;
	
			for (j = 0; j < creep.room.getBuildQueue()[i].structures.length; j++) {
				if (creep.target && creep.target != null && creep.target.pos && creep.target.pos == creep.room.getBuildQueue()[i].structures[j].pos)
					break outerLoop;
			}

			creep.memory.target = null;
		}
	}
}