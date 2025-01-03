
import P5 from "p5";
import { enumarate, firstSigDigit, resizeArray } from "./utils";

function printTensor(tensor: Tensor) {
	let shape = tensor.shape.join("x");
	let data = "[ " + tensor.data.join(", ") + " ]";
	console.log("Tensor(" + shape + "): " + data);
}

function prettyPrintHelper(shape: number[], data: number[], select: number[]) {
	let select_depth = select.length;

	if (select_depth > shape.length) return "ERROR: select.length > shape.length";

	if (select_depth == shape.length) return data[select.reduce((a, b) => a * b, 1)];

	let indent = "  ".repeat(select_depth);

	if (select_depth == shape.length - 1) {
		let shape_last = shape[shape.length - 1];
		let shape_ofs = shape.toReversed().map((prod => n => prod *= n)(1)).toReversed();

		let offset = select.map((s, i) => s * shape_ofs[i + 1]);
		let data_start = offset.reduce((a, b) => a + b, 0);
		let data_end = data_start + shape_last;
		return indent + "[ " + data.slice(data_start, data_end).join(", ") + " ]";
	}

	let inner_size = shape[select_depth];
	let inner = enumarate(0, inner_size).map((i) => prettyPrintHelper(shape, data, select.concat([i]))).join(",\n");
	return `${indent}[\n${inner}\n${indent}]`;
}


export class Tensor {
	static next_id: number = 0;
	id: number;
	shape: number[];
	data: number[];

	constructor(shape: number[], data: number[]) {
		this.id = Tensor.next_id++;
		this.shape = shape;
		let expected_elements = shape.reduce((a, b) => a * b, 1);
		if (data.length != expected_elements) console.log("WARNING: data.length != expected_elements");
		this.data = resizeArray(data, expected_elements, 0);
	}

	num_elements(): number {
		return this.shape.reduce((a, b) => a * b, 1);
	}

	print() {
		printTensor(this);
	}

	pretty_print() {
		console.log(prettyPrintHelper(this.shape, this.data, []));
	}

	pretty() {
		return prettyPrintHelper(this.shape, this.data, []);
	}

	hash() {
		return this.shape.join("x") + "_" + this.data.map(v => firstSigDigit(v)).join(".");
	}

	add(other: Tensor): Tensor {
		if (this.shape.length != other.shape.length) return null;
		if (!this.shape.every((v, i) => v == other.shape[i])) return null;
		let data = this.data.map((v, i) => v + other.data[i]);
		return new Tensor(this.shape, data);
	}

	mult_scalar(scalar: number): Tensor {
		let data = this.data.map((v) => v * scalar);
		return new Tensor(this.shape, data);
	}
}

interface RenderedElementSegment {
	y_start: number;
	x_start: number;
	y_end?: number;
	x_end?: number;
}

interface RenderedElementData {
	segments: RenderedElementSegment[];
	value: number;
	index: number;
}

interface RenderedTensorData {
	element_data: RenderedElementData[];
	shape: number[];
	hash: string;
	num_elements: number;
	max_value: number;
	x: number;
	y: number;
}

export class TensorRenderer {
	private p5: P5;
	private height: number;
	private width: number;
	private rendered_data: Record<number, RenderedTensorData>;

	constructor(private _p5: P5, height: number, width: number) {
		this.p5 = _p5;
		this.height = height;
		this.width = width;
		this.rendered_data = {};
	}

	reset() {
		this.rendered_data = [];
	}

	private drawRenderData(rd: RenderedTensorData) {
		this.p5.colorMode(this.p5.HSL, 360, 100, 100, 100);
		this.p5.fill(0.0, 0.0, 0.0);
		this.p5.stroke(0.0, 0.0, 100.0, 100.0);
		this.p5.strokeWeight(3);
		this.p5.rect(rd.x, rd.y, this.width, this.height);


		let dims = rd.shape.length;
		let sep_x = this.width / dims;
		let x0 = rd.x + sep_x / 2;

		enumarate(0, dims).forEach((dim) => {
			this.p5.line(x0 + dim * sep_x, rd.y, x0 + dim * sep_x, rd.y + this.height);
			enumarate(0, rd.shape[dim]).forEach((i) => {
				// draw ticks
				let y_dim_sep = this.height / (rd.shape[dim] + 1);
				this.p5.circle(x0 + dim * sep_x, rd.y + (i + 1) * y_dim_sep, 18);
			});

		});


		rd.element_data.forEach((element) => {
			let { value, index } = element;
			let max_ratio = value / rd.max_value;
			let hue = 240 * index / rd.num_elements;
			let saturation = 100 * max_ratio;
			let lightness = 50;
			let alpha = 100.0;
			
			this.p5.strokeWeight(7  * max_ratio);
			this.p5.stroke(hue, saturation, lightness, alpha);
			this.p5.fill(hue, saturation, lightness, alpha);

			element.segments.forEach((segment) => {
				let { x_start, y_start, x_end, y_end } = segment;
				
				this.p5.circle(x_start, y_start, 6 * max_ratio);

				if ( x_end === undefined || y_end === undefined) return;

				this.p5.line(x_start, y_start, x_end, y_end);
				this.p5.circle(x_end, y_end, 6);
			});
		});
	}

	draw(tensor: Tensor, x: number, y: number) {
		let render_data: RenderedTensorData | null = this.rendered_data[tensor.id];
		if (render_data && render_data.hash === tensor.hash()) {
			this.drawRenderData(render_data);
			return;
		}

		let values = tensor.data.map((v, i) => [Math.abs(v), i]);
		values.sort((a, b) => a[0] - b[0]);
		let num_elements = values.length;
		let max_value = values[num_elements - 1][0];

		// Accumulate render data
		render_data = {
			element_data: [],
			shape: tensor.shape,
			hash: tensor.hash(),
			num_elements: tensor.num_elements(),
			max_value: max_value,
			x: x,
			y: y
		};

		let dims = tensor.shape.length;
		let sep_x = this.width / dims;
		let x0 = x + sep_x / 2;

		for (const [value, i] of values) {
			let element_data: RenderedElementData = {
				segments: [],
				value: value,
				index: i
			};

			let select = [];
			let ofs = i;
			for (let d = dims - 1; d >= 0; d--) {
				select.unshift(ofs % tensor.shape[d]);
				ofs = Math.floor(ofs / tensor.shape[d]);
			}

			for (let d = 0; d < dims; d++) {
				let y_dim_sep = this.height / (tensor.shape[d] + 1);

				let segment_data: RenderedElementSegment = {
					x_start: x0 + d * sep_x,
					y_start: y + (select[d] + 1) * y_dim_sep,
				};

				if (d + 1 < dims) {
					let y_next_sep = this.height / (tensor.shape[d + 1] + 1);
					segment_data.y_end = y + (select[d + 1] + 1) * y_next_sep;
					segment_data.x_end = x0 + (d + 1) * sep_x;
				}
				
				element_data.segments.push(segment_data);
			}

			render_data.element_data.push(element_data);
		}
		this.rendered_data[tensor.id] = render_data;
		this.drawRenderData(render_data);
	}
}
