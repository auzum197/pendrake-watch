export type SpringOpts = { response: number; damping: number };

export type Spring = {
	readonly value: number;
	animateTo(target: number, opts: SpringOpts): void;
	set(value: number): void;
};

const SUBSTEPS = 4;

export function createSpring(
	onFrame: (value: number) => void,
	initial = 0,
): Spring {
	let value = initial;
	let velocity = 0;
	let target = initial;
	let stiffness = 0;
	let damping = 0;
	let raf = 0;
	let last = 0;

	function step(now: number) {
		const dt = Math.min((now - last) / 1000, 1 / 30);
		last = now;
		const h = dt / SUBSTEPS;
		for (let i = 0; i < SUBSTEPS; i++) {
			velocity += (-stiffness * (value - target) - damping * velocity) * h;
			value += velocity * h;
		}
		const settled =
			Math.abs(value - target) < 0.001 && Math.abs(velocity) < 0.01;
		if (settled) {
			value = target;
			velocity = 0;
			raf = 0;
		} else {
			raf = requestAnimationFrame(step);
		}
		onFrame(value);
	}

	return {
		get value() {
			return value;
		},
		animateTo(next, { response, damping: ratio }) {
			const omega = (2 * Math.PI) / response;
			stiffness = omega * omega;
			damping = 2 * ratio * omega;
			target = next;
			if (!raf) {
				last = performance.now();
				raf = requestAnimationFrame(step);
			}
		},
		set(next) {
			if (raf) cancelAnimationFrame(raf);
			raf = 0;
			value = next;
			target = next;
			velocity = 0;
			onFrame(value);
		},
	};
}
