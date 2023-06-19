
export {};

Creep.prototype.hasReachedDestination = function hasReachedDestination(target) {
	if (!target || target === null) {
		return true;
	}

	const pos = new RoomPosition(target.x, target.y, target.roomName);

	if (this.pos.isEqualTo(pos) || this.pos.isNearTo(pos) || this.pos.inRangeTo(pos, 1)) {
		this.memory.routing.lastPositions = [];
		this.memory.routing.targetPos = null;
		if (this.memory.routing.pathToTarget != null) {
			this.memory.routing.pathToTarget = null;
		}
		return true;
	}
	return false;
}

Creep.prototype.moveToTarget = function moveToTarget(err, target) {
	if (!this.memory.routing || this.memory.routing === null) {
		this.memory.routing = {};
	}

	if (!this.memory.routing.targetPos || this.memory.routing.targetPos === null) {
		this.memory.routing.targetPos = target.pos;
	}

	if (!this.memory.routing.lastRoom || this.memory.routing.lastRoom === null) {
		this.memory.routing = { lastRoom: this.room.name };
	}

	if (err === OK || err !== ERR_NOT_IN_RANGE) {
		this.memory.routing.lastPositions = [];
		this.memory.routing.pathToTarget = undefined;
		this.memory.routing.targetPos = null
		return err;
	}

	if (this.hasReachedDestination(this.memory.routing.targetPos)) {
		return 0;
	}

	if (target.pos.roomName != this.room.name && Game.time % 2 === 0) {
		let err = this.moveToRoom(target.pos.roomName);
		this.memory.routing.pathToTarget = null;
		return err;
	} else if (this.room.name != this.memory.routing.lastRoom) {
		this.memory.routing.lastRoom = this.room.name
	}

	/* if (!this.memory.routing.pathToTarget || this.memory.routing.pathToTarget === null || this.isStuck()) {
		const path = this.room.findPath(this.pos, target.pos);
		this.memory.routing.lastPositions = [];
		if (path.length > 0) {
			this.memory.routing.pathToTarget = path;
		} else {
			this.memory.routing.pathToTarget = null;
		}
	} */

	if (!this.isStuck()) {
		try {
			/* const path = this.memory.routing.pathToTarget; */
			/* if (path && path.length > 0) { */
				const lastPosition = this.pos;
				let moveErr = 0;

				if (this.target === RoomPosition) {
					moveErr = this.travelTo(this.target); //this.moveByPath(path);
				} else {
					target = Game.getObjectById(this.target);
					moveErr = this.travelTo(target);
				}
				if (moveErr === OK) {
					new RoomVisual(this.room.name).line(this.pos, this.memory.routing.targetPos, { lineStyle: 'dotted', color: '#99ffcc', opacity: 0.3, width: 0.02 })
					this.memory.routing.lastPositions = this.memory.routing.lastPositions || [];
					this.memory.routing.lastPositions.unshift(lastPosition);
					this.memory.routing.lastPositions = this.memory.routing.lastPositions.slice(0, 7);
				} else if (moveErr === ERR_NOT_FOUND) {
					this.checkPathPosition();
				} else {
					console.log(moveErr);
				}
			/* } */
		} catch (err) {
			console.log(`${this.name} (${this.pos.x}, ${this.pos.y}): ${err}`);
			return 1;
		}
	}

	if (this.hasReachedDestination(this.memory.routing.targetPos)) {
		return 0;
	}
	return 2;
};

Creep.prototype.onRoomBorder = function (position = this.pos) {
	if (position.x == 0) {
		return 7;
	} else if (position.x == 49) {
		return 3;
	} else if (position.y == 0) {
		return 1;
	} else if (position.y == 49) {
		return 5;
	} else {
		return null;
	}
}

Creep.prototype.moveToRoom = function (roomName) {
	return this.travelTo(new RoomPosition(25, 25, roomName), {reusePath: 5, visualizePathStyle: {
		fill: 'transparent',
		stroke: '#fff',
		lineStyle: 'dashed',
		strokeWidth: .15,
		opacity: .1
	}});
}

Creep.prototype.isStuck = function () {
	if (!this.memory.lastPositions || this.memory.lastPositions.length === 0) {
		return false;
	}

	const creep = this;
	const filter = (accumulator: number, currentValue: RoomPosition) => {
		const value = creep.pos.isEqualTo(currentValue.x, currentValue.y) ? 1 : 0;
		return accumulator + value;
	};
	const sum = this.memory.lastPositions.reduce(filter, 0);
	const stuck = sum > 4;

	if (stuck) {
		this.say('⏳');
	}
	return stuck;
};

Creep.prototype.clearRouting = function () {
	this.memory.lastPositions = [];
	this.memory.pathToTarget = null;
	this.memory.targetPos = null
};

// Überprüfen, ob der Creep vom Pfad abgekommen ist und zurückbewegen
Creep.prototype.checkPathPosition = function () {
	if (!this.memory.pathToTarget || this.memory.pathToTarget === null) {
		return;
	}

	const path = this.memory.pathToTarget;//Room.deserializePath(this.memory.pathToTarget);
	if (!this.pos.isEqualTo(path[0].x, path[0].y)) {
		const targetPosition = new RoomPosition(path[0].x, path[0].y, this.room.name);
		this.travelTo(targetPosition);
	}
};

Creep.prototype.transferToTarget = function transferToTarget(target, resource, ammount) {
	if (this.pos.isNearTo(target)) {
		let err = this.transfer(target, resource, ammount);
		if (err === OK) {
			this.clearRouting();
		}
		return err;
	} else
		return this.moveToTarget(ERR_NOT_IN_RANGE, target);
}

Creep.prototype.buildTarget = function buildTarget() {
	if (this.target == null)
		return 1;

	let target = this.room.lookForAt(LOOK_CONSTRUCTION_SITES, this.target.x, this.target.y)[0];

	if (target) {
		if (this.pos.inRangeTo(target, 3)) {
			let err = this.build(target);
			if (err == OK) {
				this.clearRouting();
				return err;
			}
		} else
			return this.moveToTarget(ERR_NOT_IN_RANGE, target);
	}
}

Creep.prototype.withdrawFromTarget = function withdrawFromTarget(target, resource) {
	if (this.pos.isNearTo(target)) {
		let err = this.withdraw(target, resource, Math.min(target.store.getUsedCapacity(), this.store.getFreeCapacity()));
		if (err === OK) {
			this.clearRouting();
			return err;
		}
	} else
		return this.moveToTarget(ERR_NOT_IN_RANGE, target);
}

Creep.prototype.harvestTarget = function harvestTarget(target) {

	if (!this.memory.working) {
		if (this.pos.inRangeTo(target, 1)) {
			let err = this.harvest(target);
			if (err === OK) {
				this.clearRouting();
				this.memory.working = true;
				return err;
			}
		} else {
			return this.moveToTarget(ERR_NOT_IN_RANGE, target);
		}

	} else {
		return this.harvest(target);
	}
}

Creep.prototype.pickupResource = function pickupResource(target) {
	if (this.pos.inRangeTo(target, 1)) {
		if (target.amount >= this.store.getFreeCapacity()) {
			let err = this.pickup(target);
			if (err === OK) {
				this.clearRouting();
				return err;
			}
		}
		return 0;
	} else
		return this.moveToTarget(ERR_NOT_IN_RANGE, target);
}

Creep.prototype.getRescycled = function getRescycled() {
	const spawn = Game.getObjectById(this.room.spawns[0]);
	if (this.pos.inRangeTo(spawn, 1))
		return (spawn as StructureSpawn).recycleCreep(this);
	else
		return this.moveToTarget(ERR_NOT_IN_RANGE, spawn);
}
