/**
 * Create unique identifier
 */
export function getUniqueId(): string {
	const length:number = 16;
	const charset:string = "0123456789abcdef";

	let text:string = "#";
	for (let i = 0; i < 16; i++) {
		text += charset.charAt(Math.floor(Math.random() * charset.length));
	}

	return `#${genRanHex(length)}`;
}

const genRanHex = (size: number) => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
