
export {};

Structure.prototype.isWalkable = function ():boolean {
	return this.structureType === STRUCTURE_PORTAL || this.structureType === STRUCTURE_RAMPART || this.structureType === STRUCTURE_ROAD || this.structureType === STRUCTURE_CONTAINER;
}
