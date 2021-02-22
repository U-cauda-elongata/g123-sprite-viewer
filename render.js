(() => {
	'use strict';

	async function load(png, json) {
		png = new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.addEventListener('load', () => resolve(reader.result));
			reader.addEventListener('error', reject);
			reader.readAsDataURL(png);
		});
		json = json.text();
		const href = await png;
		const data = JSON.parse(await json);

		return Object.keys(data.mc).map(key => {
			const NS = 'http://www.w3.org/2000/svg';

			const animation = data.mc[key];

			const svg = document.createElementNS(NS, 'svg');
			svg.setAttribute('xmlns', NS);

			const title = document.createElementNS(NS, 'title');
			title.textContent = key;
			svg.appendChild(title);

			const x = Math.min(...animation.frames.map(frame => frame.x));
			const y = Math.min(...animation.frames.map(frame => frame.y));
			const w = Math.max(...animation.frames.map(frame => frame.x - x + data.res[frame.res].w));
			const h = Math.max(...animation.frames.map(frame => frame.y - y + data.res[frame.res].h));
			svg.setAttribute('width', `${w}px`);
			svg.setAttribute('height', `${h}px`);

			const dur = animation.frames.length / animation.frameRate;

			const svgAnimate = document.createElementNS(NS, 'animate');
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

			const clip = document.createElementNS(NS, 'rect');
			for (const [attr, k] of [['x', 'x'], ['y', 'y'], ['width', 'w'], ['height', 'h']]) {
				const clipAnimate = document.createElementNS(NS, 'animate');
				clipAnimate.setAttribute('attributeName', attr);
				clipAnimate.setAttribute('begin', `animate.begin`);
				clipAnimate.setAttribute('dur', `${dur}s`);
				clipAnimate.setAttribute('repeatCount', 'indefinite');
				clipAnimate.setAttribute('calcMode', 'discrete');
				clipAnimate.setAttribute('values', animation.frames.map(frame => data.res[frame.res][k]).join(';'));
				clip.appendChild(clipAnimate);
			}

			const clipPath = document.createElementNS(NS, 'clipPath');
			clipPath.id = 'clip';
			clipPath.appendChild(clip);
			svg.appendChild(clipPath);

			const image = document.createElementNS(NS, 'image');
			image.setAttribute('href', href);
			image.setAttribute('clip-path', 'url(#clip)');
			svg.appendChild(image);

			return { key, svg };
		});
	}

	const container = document.getElementById("sprites");

	async function render(png, json) {
		if (!json) {
			const stem = png.match(/(.*\/[^/.]*)(?:\..*)?/)[1];
			json = `${stem}.json`;
		}

		async function fetchBlob(url_or_blob) {
			if (typeof url_or_blob === 'string') {
				const res = await fetch(url_or_blob);
				if (res.status == 200) {
					return await res.blob();
				} else {
					throw `HTTP ${res.status}`;
				}
			} else {
				return url_or_blob;
			}
		}

		let animations;
		try {
			const p = fetchBlob(png);
			const j = fetchBlob(json);
			animations = await load(await p, await j);
		} catch (e) {
			container.innerText = '';
			throw e;
		}

		let stem = typeof png === 'string' ? png.slice(png.lastIndexOf('/') + 1) : png.name;
		{
			const i = stem.lastIndexOf('.');
			if (i >= 0) {
				stem = stem.slice(0, i);
			}
		}

		container.setAttribute('aria-busy', true);
		container.innerText = '';

		const ser = new XMLSerializer();
		for (const { key, svg } of animations) {
			const section = document.createElement('section');

			const header = document.createElement('header');
			header.innerText = key;
			section.appendChild(header);

			const blob = new Blob([ser.serializeToString(svg)], { type: 'image/svg+xml' });
			const href = URL.createObjectURL(blob);
			window.addEventListener('popstate', () => URL.revokeObjectURL(href), { once: true });
			const a = document.createElement('a');
			if (stem) {
				a.download = `${stem}.${key}.svg`;
			} else {
				a.download = `${key}.svg`;
			}
			a.href = href;
			const img = document.createElement('img');
			img.alt = key;
			img.src = href;
			a.appendChild(img);
			section.appendChild(a);

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
			const png = form.png.files[0];
			const json = form.json.files[0];
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
