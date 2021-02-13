(() => {
    'use strict';

    const container = document.getElementById("sprites");

    async function render() {
        const uri = new URLSearchParams(location.search).get('uri');
        if (!uri) {
            container.innerText = '';
            return;
        }

        container.setAttribute('aria-busy', true);
        // Prevent the height from changing while tinkering with the DOM.
        container.style.height = `${container.scrollHeight}px`;
        container.innerText = '';

        const stem = uri.match(/(.*\/[^/.]*)(?:\..*)?/)[1];
        const data = await fetch(stem + '.json').then(res => res.json());

        for (const key of Object.keys(data.mc)) {
            const animation = data.mc[key];

            const section = document.createElement('section');

            const header = document.createElement('header');
            header.innerText = key;
            const headerId = `header-${key}`;
            header.id = headerId;
            section.appendChild(header);

            const view = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            view.setAttribute('aria-labelledby', headerId);
            const x = Math.min(...animation.frames.map(frame => frame.x));
            const y = Math.min(...animation.frames.map(frame => frame.y));
            const w = Math.max(...animation.frames.map(frame => frame.x - x + data.res[frame.res].w));
            const h = Math.max(...animation.frames.map(frame => frame.y - y + data.res[frame.res].h));
            view.setAttribute('width', `${w}px`);
            view.setAttribute('height', `${h}px`);
            view.setAttribute('preserveAspectRatio', 'xMinYMin');
            const clip = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            {
                const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
                clipPath.id = `clip-${key}`;
                clipPath.appendChild(clip);
                defs.appendChild(clipPath);
                view.appendChild(defs);
                const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
                image.setAttribute('href', uri);
                image.setAttribute('clip-path', `url(#clip-${key})`);
                view.appendChild(image);
            }

            let i = 0;
            setInterval(() => {
                const frame = animation.frames[i];
                const res = data.res[frame.res];
                view.setAttribute('viewBox', `${res.x-frame.x+x} ${res.y-frame.y+y} ${w} ${h}`);
                clip.setAttribute('x', res.x);
                clip.setAttribute('y', res.y);
                clip.setAttribute('width', res.w);
                clip.setAttribute('height', res.h);
                i = (i+1) % animation.frames.length;
            }, 1000 / animation.frameRate);
            section.appendChild(view);

            container.appendChild(section);
        }

        container.removeAttribute('style');
        container.removeAttribute('aria-busy');
    }

    window.addEventListener('popstate', () => render());

    const form = document.getElementById('uriForm');
    form.addEventListener('submit', e => {
        if (form.uri.value !== new URLSearchParams(location.search).get('uri')) {
            history.pushState({}, '', `?uri=${form.uri.value}`);
            render();
        }
        e.preventDefault();
    });

    const uri = new URLSearchParams(location.search).get('uri');
    if (uri) {
        form.uri.value = uri;
        render();
    }

    const presets = document.getElementById('presets');
    for (const a of document.querySelectorAll('#presets a')) {
        a.addEventListener('click', e => {
            history.pushState(null, '', a.href);
            form.uri.value = new URLSearchParams(a.search).get('uri');
            render();
            e.preventDefault();
        });
    }
})();
