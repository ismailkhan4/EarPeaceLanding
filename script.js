const CANVAS_ID = 'hero-canvas';
const TOTAL_FRAMES = 248;
const FRAME_URL = (i) => `assets/${String(i).padStart(4, '0')}.png`;

class HeroCanvas {
    constructor({ canvasId, totalFrames }) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.totalFrames = totalFrames;
        this.images = new Array(totalFrames);
        this.loaded = 0;
        this.currentFrame = 0;

        this.targetFrame = 0; // smooth scroll target
        this.ease = 0.06; // smaller = slower, more premium

        this.resize = this.resize.bind(this);
        window.addEventListener('resize', this.resize);

        this.init();
    }

    init() {
        this.resize();
        this.preloadFrames().then(() => {
            this.drawFrame(0);
            this.canvas.style.opacity = '1';
            this.bindScroll();
        });
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = Math.round(window.innerWidth * dpr);
        this.canvas.height = Math.round(window.innerHeight * dpr);
        this.canvas.style.width = `${window.innerWidth}px`;
        this.canvas.style.height = `${window.innerHeight}px`;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (this.images[Math.floor(this.currentFrame)]) this.drawFrame(Math.floor(this.currentFrame));
    }

    preloadFrames() {
        const promises = [];
        for (let i = 0; i < this.totalFrames; i++) {
            promises.push(new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => { this.images[i] = img; this.loaded++; resolve(); };
                img.onerror = () => { this.images[i] = img; resolve(); };
                img.src = FRAME_URL(i);
            }));
        }
        return Promise.all(promises);
    }

    bindScroll() {
        const onScroll = () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const maxScrollTop = document.documentElement.scrollHeight - window.innerHeight;
            const scrollFraction = Math.max(0, Math.min(1, scrollTop / maxScrollTop));
            this.targetFrame = Math.min(this.totalFrames - 1, scrollFraction * this.totalFrames);
        };

        window.addEventListener('scroll', onScroll, { passive: true });

        const loop = () => {
            // smooth interpolation
            this.currentFrame += (this.targetFrame - this.currentFrame) * this.ease;

            this.drawFrame(Math.floor(this.currentFrame));
            this.crossfadeIfEnding();

            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    drawFrame(index) {
        const img = this.images[index];
        if (!img || !img.width) return;

        const { width: cw, height: ch } = this.canvas;
        const cssW = this.canvas.clientWidth;
        const cssH = this.canvas.clientHeight;

        this.ctx.clearRect(0, 0, cssW, cssH);

        const canvasRatio = cssW / cssH;
        const imgRatio = img.width / img.height;

        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

        if (canvasRatio > imgRatio) {
            drawWidth = cssW;
            drawHeight = drawWidth / imgRatio;
            offsetY = (cssH - drawHeight) / 2;
        } else {
            drawHeight = cssH;
            drawWidth = drawHeight * imgRatio;
            offsetX = (cssW - drawWidth) / 2;
        }

        // fade last few frames
        const fadeThreshold = 8;
        if (this.totalFrames - index <= fadeThreshold) {
            const alpha = Math.max(0, (this.totalFrames - index) / fadeThreshold);
            this.canvas.style.opacity = String(alpha);
        } else {
            this.canvas.style.opacity = '1';
        }

        this.ctx.save();
        this.ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        this.ctx.restore();
    }

    crossfadeIfEnding() {
        if (this.currentFrame >= this.totalFrames - 2) {
            document.querySelector('.hero').classList.add('visible');
        }
    }
}

/* Section reveal & parallax */
function setupSectionRevealAndParallax() {
    const sections = document.querySelectorAll('.section');
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.18 });

    sections.forEach(s => io.observe(s));

    window.addEventListener('scroll', () => {
        const scY = window.scrollY;
        document.querySelectorAll('[data-parallax-speed]').forEach((el) => {
            const speed = parseFloat(el.getAttribute('data-parallax-speed')) || 0.02;
            el.style.transform = `translateY(${-(scY * speed)}px)`;
        });
    }, { passive: true });
}

/* Sticky specs highlight */
function setupStickySpecs() {
    const specs = Array.from(document.querySelectorAll('.spec'));
    const details = Array.from(document.querySelectorAll('.spec-detail'));

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                const idx = Number(id.split('-')[1]);
                specs.forEach(s => s.classList.remove('active'));
                const active = specs.find(s => Number(s.dataset.index) === idx);
                if (active) active.classList.add('active');
            }
        });
    }, { root: null, threshold: 0.48 });

    details.forEach(d => observer.observe(d));
}

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    new HeroCanvas({ canvasId: CANVAS_ID, totalFrames: TOTAL_FRAMES });
    setupSectionRevealAndParallax();
    setupStickySpecs();
    document.querySelectorAll('.cta').forEach(a => a.setAttribute('tabindex', '0'));
});
