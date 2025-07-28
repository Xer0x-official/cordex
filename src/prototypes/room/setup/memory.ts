
//#region Strukturaufbau
/*
roomName: {
	base: null,
	remotes: [
	],
	resources: {
		/* id: {
			type: "energy",
			capacity: energyCapacitynumber,
			miner: id,
		} *
	},
	spawns: [],
	planingMatrix: [],
	myStructures: {
	},
	baseExtensions: {
		tower: {},
	},
	stats: {
		resourceCount: 0,
		creepsCount: 0,
		roles: {
			miner: 0,
			transporter: 0,
			worker: 0,
			scout: 0,
		},
		totalAvailableEnergy: 0,

	},
	queues: {
		spawn: [],
		build: [],
		repair: [],
	},
	paths: {
	},
} */
//#endregion

export function setupMemory(colonie: string) {
	Memory.colonies[colonie] = {
		base: colonie,
		remotes: [],
		resources: {
			energy: {},
			minerals: {},
            resourcePath: {
                built: false,
                path: []
            },
            distance: -1,
			dropped: {
				energy: {},
				minerals: {},
			}
		},
		spawns: [],
		buildingMatrix: [],
		myStructurs: [],
		baseExtensions: {
			'lab': new RoomPosition(0, 0, colonie),
			'extensionPacks': [],
			'powerBunker': new RoomPosition(0, 0, colonie),
			'tower': new RoomPosition(0, 0, colonie),
			'looseExtensions': [new RoomPosition(0, 0, colonie)],
		},
		stats: {
			creepsCount: 0,
			roles: {
				miner: 0,
				transporter: 0,
				worker: 0,
				scouter: 0,
			},
			totalAvailableEnergy: 0,
            activeResources: 0,
		},
		queues: {
			spawn: [],
			build: [],
			repair: [],
		},
		paths: {},
        priorities: {},
	}
}
