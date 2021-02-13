(async () => {
    'use strict';

    const container = document.getElementById("sprites");

    async function show(base) {
        container.setAttribute('aria-busy', true);

        const data = await fetch(base + '.json').then(res => res.json());

        for (const key of Object.keys(data.mc)) {
            const animation = data.mc[key];

            const section = document.createElement('section');

            const header = document.createElement('header');
            header.innerText = key;
            const headerId = `header-${key}`;
            header.id = headerId;
            section.appendChild(header);

            const view = document.createElement('div');
            view.setAttribute('aria-labelledby', headerId);
            view.setAttribute('role', 'img');
            view.style.width = Math.max(...animation.frames.map(frame => data.res[frame.res].w)) + 'px';
            view.style.height = Math.max(...animation.frames.map(frame => data.res[frame.res].h)) + 'px';

            const sprite = document.createElement('div');
            sprite.style.backgroundImage = `url(${base + '.png'})`;
            sprite.classList.add('sprite');
            let i = 0;
            setInterval(() => {
                const res = data.res[animation.frames[i].res];
                sprite.style.backgroundPosition = `-${res.x}px -${res.y}px`;
                sprite.style.width = `${res.w}px`;
                sprite.style.height = `${res.h}px`;
                i = (i+1) % animation.frames.length;
            }, 1000 / animation.frameRate);
            view.appendChild(sprite);
            section.appendChild(view);

            container.appendChild(section);
        }

        container.removeAttribute('aria-busy');
    }

    await show('https://cdn.g123-gandc.com/cdn/static/last/resource_jp/assets/hero/monster/bossld1');
})();