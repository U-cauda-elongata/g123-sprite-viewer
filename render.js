(() => {
	'use strict';

	async function load(png, json) {
		if (!json) {
			const stem = png.match(/(.*\/[^/.]*)(?:\..*)?/)[1];
			json = `${stem}.json`;
		}

		const data = await fetch(json).then(res =>
			res.status === 200 ? res.json() : Promise.reject(`HTTP ${res.status}`)
		);

		return Object.keys(data.mc).map(key => {
			const animation = data.mc[key];

			const view = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			const x = Math.min(...animation.frames.map(frame => frame.x));
			const y = Math.min(...animation.frames.map(frame => frame.y));
			const w = Math.max(...animation.frames.map(frame => frame.x - x + data.res[frame.res].w));
			const h = Math.max(...animation.frames.map(frame => frame.y - y + data.res[frame.res].h));
			view.setAttribute('width', `${w}px`);
			view.setAttribute('height', `${h}px`);

			const dur = animation.frames.length / animation.frameRate;

			const viewAnimate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
			viewAnimate.id = `animate${key}`;
			viewAnimate.setAttribute('attributeName', 'viewBox');
			viewAnimate.setAttribute('dur', `${dur}s`);
			viewAnimate.setAttribute('calcMode', 'discrete');
			viewAnimate.setAttribute('repeatCount', 'indefinite');
			viewAnimate.setAttribute('values', animation.frames.map(frame => {
				const res = data.res[frame.res];
				return `${res.x-frame.x+x} ${res.y-frame.y+y} ${w} ${h}`;
			}).join(';'));
			view.appendChild(viewAnimate);

			const clip = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
			for (const [attr, k] of [['x', 'x'], ['y', 'y'], ['width', 'w'], ['height', 'h']]) {
				const clipAnimate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
				clipAnimate.setAttribute('attributeName', attr);
				clipAnimate.setAttribute('begin', `animate${key}.begin`);
				clipAnimate.setAttribute('dur', `${dur}s`);
				clipAnimate.setAttribute('repeatCount', 'indefinite');
				clipAnimate.setAttribute('calcMode', 'discrete');
				clipAnimate.setAttribute('values', animation.frames.map(frame => data.res[frame.res][k]).join(';'));
				clip.appendChild(clipAnimate);
			}

			const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
			clipPath.id = `clip-${key}`;
			clipPath.appendChild(clip);
			view.appendChild(clipPath);

			const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
			image.setAttribute('href', png);
			image.setAttribute('clip-path', `url(#clip-${key})`);
			view.appendChild(image);

			return { key, view };
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

		for (const { key, view } of animations) {
			const section = document.createElement('section');
			const header = document.createElement('header');
			header.innerText = key;
			const headerId = `header-${key}`;
			header.id = headerId;
			view.setAttribute('aria-labelledby', headerId);
			section.appendChild(header);
			section.appendChild(view);
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

	const form = document.getElementById('uriForm');
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
