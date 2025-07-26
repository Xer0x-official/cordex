
// export const bunkerMatrix: (undefined | bluePrintMatrixElement)[][] = [
// 	[undefined,							{ rcl: 1, type: STRUCTURE_ROAD},		{ rcl: 1, type: STRUCTURE_ROAD},		{ rcl: 1, type: STRUCTURE_ROAD},		{ rcl: 1, type: STRUCTURE_ROAD},		{ rcl: 1, type: STRUCTURE_ROAD},		undefined],
// 	[{ rcl: 1, type: STRUCTURE_ROAD},	{ rcl: 1, type: STRUCTURE_EXTENSION},	{ rcl: 1, type: STRUCTURE_EXTENSION},	undefined,								{ rcl: 1, type: STRUCTURE_EXTENSION},	{ rcl: 1, type: STRUCTURE_EXTENSION},	{ rcl: 1, type: STRUCTURE_ROAD}],
// 	[{ rcl: 1, type: STRUCTURE_ROAD},	{ rcl: 2, type: STRUCTURE_EXTENSION},	undefined,								{ rcl: 1, type: STRUCTURE_EXTENSION},	undefined,								{ rcl: 2, type: STRUCTURE_EXTENSION},	{ rcl: 1, type: STRUCTURE_ROAD}],
// 	[{ rcl: 1, type: STRUCTURE_ROAD},	{ rcl: 1, type: STRUCTURE_CONTAINER},	{ rcl: 2, type: STRUCTURE_EXTENSION},	{ rcl: 6, type: STRUCTURE_LINK},		{ rcl: 2, type: STRUCTURE_EXTENSION},	{ rcl: 1, type: STRUCTURE_CONTAINER},	{ rcl: 1, type: STRUCTURE_ROAD}],
// 	[{ rcl: 1, type: STRUCTURE_ROAD},	{ rcl: 6, type: STRUCTURE_SPAWN},		undefined,								{ rcl: 2, type: STRUCTURE_EXTENSION},	undefined,								{ rcl: 7, type: STRUCTURE_SPAWN},		{ rcl: 1, type: STRUCTURE_ROAD}],
// 	[{ rcl: 1, type: STRUCTURE_ROAD},	{ rcl: 3, type: STRUCTURE_EXTENSION},	{ rcl: 3, type: STRUCTURE_EXTENSION},	{ rcl: 3, type: STRUCTURE_EXTENSION},	{ rcl: 3, type: STRUCTURE_EXTENSION},	{ rcl: 3, type: STRUCTURE_EXTENSION},	{ rcl: 1, type: STRUCTURE_ROAD}],
// 	[undefined,							{ rcl: 1, type: STRUCTURE_ROAD},		{ rcl: 1, type: STRUCTURE_ROAD},		{ rcl: 1, type: STRUCTURE_ROAD},		{ rcl: 1, type: STRUCTURE_ROAD},		{ rcl: 1, type: STRUCTURE_ROAD},		undefined],
// ]



// export const bunkerMatrix: (undefined | bluePrintMatrixElement)[][] = [
//     [undefined,							undefined,		undefined,		undefined,		undefined,		undefined,		undefined],
//     [undefined,	{ rcl: 1, type: STRUCTURE_EXTENSION},	{ rcl: 1, type: STRUCTURE_EXTENSION},	undefined,								{ rcl: 1, type: STRUCTURE_EXTENSION},	{ rcl: 1, type: STRUCTURE_EXTENSION},	undefined],
//     [undefined,	{ rcl: 2, type: STRUCTURE_EXTENSION},	undefined,								{ rcl: 1, type: STRUCTURE_EXTENSION},	undefined,								{ rcl: 2, type: STRUCTURE_EXTENSION},	undefined],
//     [undefined,	{ rcl: 1, type: STRUCTURE_CONTAINER},	{ rcl: 2, type: STRUCTURE_EXTENSION},	{ rcl: 6, type: STRUCTURE_LINK},		{ rcl: 2, type: STRUCTURE_EXTENSION},	{ rcl: 1, type: STRUCTURE_CONTAINER},	undefined],
//     [undefined,	{ rcl: 6, type: STRUCTURE_SPAWN},		undefined,								{ rcl: 2, type: STRUCTURE_EXTENSION},	undefined,								{ rcl: 7, type: STRUCTURE_SPAWN},		undefined],
//     [undefined,	{ rcl: 3, type: STRUCTURE_EXTENSION},	{ rcl: 3, type: STRUCTURE_EXTENSION},	{ rcl: 3, type: STRUCTURE_EXTENSION},	{ rcl: 3, type: STRUCTURE_EXTENSION},	{ rcl: 3, type: STRUCTURE_EXTENSION},	undefined],
//     [undefined,							undefined,		undefined,		undefined,		undefined,		undefined,		undefined],
// ]


export const bunkerMatrix: (undefined | bluePrintMatrixElement)[][] = [
    [undefined,		                    undefined,			                undefined,			                    { rcl: 2, type: STRUCTURE_ROAD},        undefined,                              undefined,                          undefined],
    [undefined,		                    undefined,			                { rcl: 2, type: STRUCTURE_ROAD},	    undefined,                              { rcl: 2, type: STRUCTURE_ROAD},        undefined,                          undefined],
    [undefined,		                    { rcl: 2, type: STRUCTURE_ROAD},	{ rcl: 1, type: STRUCTURE_CONTAINER},   { rcl: 2, type: STRUCTURE_ROAD},        { rcl: 1, type: STRUCTURE_CONTAINER},   { rcl: 2, type: STRUCTURE_ROAD},    undefined],
    [{ rcl: 2, type: STRUCTURE_ROAD},	{ rcl: 6, type: STRUCTURE_SPAWN},	{ rcl: 2, type: STRUCTURE_ROAD},	    { rcl: 6, type: STRUCTURE_LINK},        { rcl: 2, type: STRUCTURE_ROAD},        { rcl: 7, type: STRUCTURE_SPAWN},   { rcl: 2, type: STRUCTURE_ROAD}],
    [undefined,		                    { rcl: 2, type: STRUCTURE_ROAD},	{ rcl: 2, type: STRUCTURE_TOWER},	    { rcl: 3, type: STRUCTURE_STORAGE},     { rcl: 4, type: STRUCTURE_TOWER},       { rcl: 2, type: STRUCTURE_ROAD},    undefined],
    [undefined,		                    undefined,			                { rcl: 2, type: STRUCTURE_ROAD},	    { rcl: 7, type: STRUCTURE_POWER_SPAWN}, { rcl: 2, type: STRUCTURE_ROAD},        undefined,                          undefined],
    [undefined,		                    undefined,			                undefined,              			    { rcl: 2, type: STRUCTURE_ROAD},        undefined,                              undefined,                          undefined],
]