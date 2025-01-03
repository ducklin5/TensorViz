export function randInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

export function randFloat(min: number, max: number): number {
	return Math.random() * (max - min) + min;
}

export function enumarate(start: number, end: number): number[] {
	return Array(end - start).fill(0).map((_, i) => i + start)
}


export function resizeArray<T>(array: Array<T>, newSize: number, fillValue: T) {
	if (newSize < 0) throw new Error("New size must be a non-negative integer.");

	if (newSize < array.length) return array.slice(0, newSize);

	if (newSize > array.length) return array.concat(Array(newSize - array.length).fill(fillValue));

	return array.slice();
}

export function firstSigDigit(num: number): number {
	let abs_num = Math.abs(num);
	let mag = Math.floor(Math.log10(abs_num));
	return Math.floor(abs_num / Math.pow(10, mag));
}
