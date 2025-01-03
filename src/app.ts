import P5 from "p5";
import "p5/lib/addons/p5.dom";

import "/assets/style.scss";

import { Tensor, TensorRenderer } from "./tensor";
import { enumarate, randInt, randFloat } from "./utils";


// Creating the sketch itself
const sketch = (p5: P5) => {
	const tensors: Tensor[] = [];
	
	const rand_speed = 600;
	const rand_deltas: Tensor[] = [];
	const rand_duration = 8;
	let rand_countdown = 0;

	const tr = new TensorRenderer(p5, 200, 200);
	const textareas: P5.Element[] = [];

	const generateTensors = () => {
		tensors.length = 0;
		textareas.forEach((t) => t.remove());
		textareas.length = 0;
		for (let i = 1; i <= 4; i++) {
			let shape = enumarate(0, randInt(1, 6)).map((_) => randInt(1, 5));
			let count = shape.reduce((a, b) => a * b);
			let data = enumarate(0, count).map((_) => randFloat(-999, 999));
			let tensor = new Tensor(shape, data);
			tensor.print();
			tensors.push(tensor);
			let txtelem = p5.createElement("textarea", tensor.pretty());
			txtelem.attribute("readonly", "true");
			txtelem.parent("info");

			textareas.push(txtelem);
		}
		tr.reset();
	}

	const randomizeTensors = () => {
		rand_countdown = rand_duration;
		rand_deltas.length = 0;
		tensors.forEach((t) => {
			let delta = new Tensor(t.shape, t.data.map((_) => randFloat(-1, 1) * rand_speed));
			rand_deltas.push(delta);
		});
	}

	// The sketch setup method 
	p5.setup = () => {
		// buttons
		const generate = p5.createButton("Generate");
		const randomize = p5.createButton("Randomize");
		generate.mouseClicked(generateTensors);
		randomize.mouseClicked(randomizeTensors);
		generate.parent("buttons");
		randomize.parent("buttons");

		generateTensors();

		// Creating and positioning the canvas
		const canvas = p5.createCanvas(256, 1024);
		canvas.parent("app");
		p5.frameRate(20);

		// Configuring the canvas
		p5.background("teal");
	};

	// The sketch draw method
	p5.draw = () => {
		if (rand_countdown > 0) {
			let dt = p5.deltaTime/1000;
			for (let i = 0; i < tensors.length; i++) {
				let t = tensors[i];
				let delta = rand_deltas[i];
				tensors[i] = t.add(delta.mult_scalar(dt));
				textareas[i].value(tensors[i].pretty());
			}
			rand_countdown -= dt;
			tr.reset();
		}
		

		tensors.forEach((t, i) => {
			let cols = 1;
			let x = 20 + (i % cols) * 256;
			let y = 20 + Math.floor(i / 1) * 256;
			tr.draw(t, x, y)
		});
	};
};

new P5(sketch);
