
// export const labMatrix: (undefined | bluePrintMatrixElement)[][] = [
// 	[{ rcl: 1, type: STRUCTURE_ROAD},		{ rcl: 5, type: STRUCTURE_LAB},			{ rcl: 5, type: STRUCTURE_LAB},			{ rcl: 1, type: STRUCTURE_ROAD},],
// 	[{ rcl: 6, type: STRUCTURE_LAB},		{ rcl: 5, type: STRUCTURE_LAB},			{ rcl: 1, type: STRUCTURE_ROAD},		{ rcl: 6, type: STRUCTURE_LAB},],
// 	[{ rcl: 6, type: STRUCTURE_LAB},		{ rcl: 1, type: STRUCTURE_ROAD},		{ rcl: 7, type: STRUCTURE_LAB},			{ rcl: 7, type: STRUCTURE_LAB},],
// 	[{ rcl: 1, type: STRUCTURE_ROAD},		{ rcl: 7, type: STRUCTURE_LAB},			{ rcl: 7, type: STRUCTURE_LAB},			{ rcl: 1, type: STRUCTURE_ROAD},],
// ]

// export const labMatrix: (undefined | bluePrintMatrixElement)[][] = [
//     [undefined,		{ rcl: 5, type: STRUCTURE_LAB},			{ rcl: 5, type: STRUCTURE_LAB},			undefined,],
//     [{ rcl: 6, type: STRUCTURE_LAB},		{ rcl: 5, type: STRUCTURE_LAB},			undefined,		{ rcl: 6, type: STRUCTURE_LAB},],
//     [{ rcl: 6, type: STRUCTURE_LAB},		undefined,		{ rcl: 7, type: STRUCTURE_LAB},			{ rcl: 7, type: STRUCTURE_LAB},],
//     [undefined,		{ rcl: 7, type: STRUCTURE_LAB},			{ rcl: 7, type: STRUCTURE_LAB},			undefined,],
// ]

export const labMatrix: (undefined | bluePrintMatrixElement)[][] = [
	[undefined,		                    undefined,			                undefined,			                { rcl: 3, type: STRUCTURE_ROAD},        undefined,                          undefined,                          undefined],
	[undefined,		                    undefined,			                { rcl: 3, type: STRUCTURE_ROAD},	{ rcl: 6, type: STRUCTURE_LAB},         { rcl: 3, type: STRUCTURE_ROAD},    undefined,                          undefined],
	[undefined,		                    { rcl: 3, type: STRUCTURE_ROAD},	{ rcl: 5, type: STRUCTURE_LAB},		{ rcl: 3, type: STRUCTURE_ROAD},        { rcl: 7, type: STRUCTURE_LAB},     { rcl: 3, type: STRUCTURE_ROAD},    undefined],
	[{ rcl: 3, type: STRUCTURE_ROAD},	{ rcl: 5, type: STRUCTURE_LAB},		{ rcl: 5, type: STRUCTURE_LAB},		{ rcl: 3, type: STRUCTURE_ROAD},        { rcl: 7, type: STRUCTURE_LAB},     { rcl: 7, type: STRUCTURE_LAB},     { rcl: 3, type: STRUCTURE_ROAD}],
	[undefined,		                    { rcl: 3, type: STRUCTURE_ROAD},	{ rcl: 6, type: STRUCTURE_LAB},		{ rcl: 3, type: STRUCTURE_ROAD},        { rcl: 7, type: STRUCTURE_LAB},     { rcl: 3, type: STRUCTURE_ROAD},    undefined],
	[undefined,		                    undefined,			                { rcl: 3, type: STRUCTURE_ROAD},	{ rcl: 6, type: STRUCTURE_LAB},         { rcl: 3, type: STRUCTURE_ROAD},    undefined,                          undefined],
	[undefined,		                    undefined,			                undefined,              			{ rcl: 3, type: STRUCTURE_ROAD},        undefined,                          undefined,                          undefined],
]