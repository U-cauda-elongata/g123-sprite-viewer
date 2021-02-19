(() => {
	'use strict';

	async function load(png, json) {
		if (!json) {
			const stem = png.match(/(.*\/[^/.]*)(?:\..*)?/)[1];
			json = `${stem}.json`;
		}

		const buf = await fetch(png).then(res =>
			res.status === 200 ? res.arrayBuffer() : Promise.reject(`HTTP ${res.status}`)
		);
		const bin = Array.prototype.map.call(new Uint8Array(buf), b => String.fromCharCode(b)).
			join('');
		const href = `data:image/png;base64,${btoa(bin)}`;

		const data = await fetch(json).then(res =>
			res.status === 200 ? res.json() : Promise.reject(`HTTP ${res.status}`)
		);

		return Object.keys(data.mc).map(key => {
			const animation = data.mc[key];

			const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

			const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
			title.textContent = key;
			svg.appendChild(title);

			const x = Math.min(...animation.frames.map(frame => frame.x));
			const y = Math.min(...animation.frames.map(frame => frame.y));
			const w = Math.max(...animation.frames.map(frame => frame.x - x + data.res[frame.res].w));
			const h = Math.max(...animation.frames.map(frame => frame.y - y + data.res[frame.res].h));
			svg.setAttribute('width', `${w}px`);
			svg.setAttribute('height', `${h}px`);

			const dur = animation.frames.length / animation.frameRate;

			const svgAnimate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
			svgAnimate.id = 'animate';
			svgAnimate.setAttribute('attributeName', 'viewBox');
			svgAnimate.setAttribute('dur', `${dur}s`);
			svgAnimate.setAttribute('calcMode', 'discrete');
			svgAnimate.setAttribute('repeatCount', 'indefinite');
			svgAnimate.setAttribute('values', animation.frames.map(frame => {
				const res = data.res[frame.res];
				return `${res.x-frame.x+x} ${res.y-frame.y+y} ${w} ${h}`;
			}).join(';'));
			svg.appendChild(svgAnimate);

			const clip = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
			for (const [attr, k] of [['x', 'x'], ['y', 'y'], ['width', 'w'], ['height', 'h']]) {
				const clipAnimate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
				clipAnimate.setAttribute('attributeName', attr);
				clipAnimate.setAttribute('begin', `animate.begin`);
				clipAnimate.setAttribute('dur', `${dur}s`);
				clipAnimate.setAttribute('repeatCount', 'indefinite');
				clipAnimate.setAttribute('calcMode', 'discrete');
				clipAnimate.setAttribute('values', animation.frames.map(frame => data.res[frame.res][k]).join(';'));
				clip.appendChild(clipAnimate);
			}

			const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
			clipPath.id = 'clip';
			clipPath.appendChild(clip);
			svg.appendChild(clipPath);

			const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
			image.setAttribute('href', href);
			image.setAttribute('clip-path', 'url(#clip)');
			svg.appendChild(image);

			return { key, svg };
		});
	}

	const container = document.getElementById("sprites");

	async function render(png, json) {
		let animations;
		try {
			animations = await load(png, json);
		} catch (e) {
			container.innerText = '';
			throw e;
		}

		container.setAttribute('aria-busy', true);
		container.innerText = '';

		const ser = new XMLSerializer();
		for (const { key, svg } of animations) {
			const section = document.createElement('section');

			const header = document.createElement('header');
			header.innerText = key;
			section.appendChild(header);

			const img = document.createElement('img');
			img.alt = key;
			img.src = `data:image/svg+xml,${encodeURIComponent(ser.serializeToString(svg))}`;
			section.appendChild(img);

			container.appendChild(section);
		}

		container.removeAttribute('style');
		container.removeAttribute('aria-busy');
	}

	window.addEventListener('popstate', e => {
		if (e.state) {
			render(...e.state);
		} else {
			render(new URLSearchParams(location.search).get('uri'));
		}
	});

	const form = document.getElementById('spriteForm');
	form.addEventListener('submit', e => {
		if (form.uri.value !== new URLSearchParams(location.search).get('uri')) {
			history.pushState(null, '', `?uri=${form.uri.value}`);
			render(form.uri.value);
		}
		e.preventDefault();
	});
	const onFileChange = () => {
		if (form.png.value && form.json.value) {
			const png = URL.createObjectURL(form.png.files[0]);
			const json = URL.createObjectURL(form.json.files[0]);
			history.pushState([png, json], '', location.pathname);
			render(png, json);
		}
	};
	form.png.addEventListener('change', onFileChange);
	form.json.addEventListener('change', onFileChange);

	const uri = new URLSearchParams(location.search).get('uri');
	if (uri) {
		form.uri.value = uri;
		render(uri);
	}

	const presets = document.getElementById('presets');
	for (const a of document.querySelectorAll('#presets a')) {
		a.addEventListener('click', e => {
			history.pushState(null, '', a.href);
			const uri = new URLSearchParams(a.search).get('uri');
			form.uri.value = uri;
			render(uri);
			e.preventDefault();
		});
	}
})();
