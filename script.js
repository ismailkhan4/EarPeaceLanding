/**
 * script.js
 * - Handles loading the frame sequence for the hero canvas
 * - Maps scroll position to frames
 * - Controls section reveal, parallax, and sticky specs highlighting
 *
 * Notes:
 * - Replace the frame URL prefix if you host frames locally.
 * - Total frames default to 64 (keeps your original setup).
 */

const CANVAS_ID = 'hero-canvas';
const TOTAL_FRAMES = 64; // original amount
// Example original apple CDN prefix - you can replace with your /frames/ folder in production
const FRAME_URL = (i) =>
    `https://www.apple.com/105/media/us/airpods-pro/2022/d2deeb8e-83eb-48ea-9721-f567cf0fffa8/anim/hero/medium/${String(i).padStart(4, '0')}.png`;

class HeroCanvas {
    constructor({ canvasId, totalFrames }) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.totalFrames = totalFrames;
        this.images = new Array(totalFrames);
        this.loaded = 0;
        this.currentFrame = 0;

        // sizing
        this.resize = this.resize.bind(this);
        window.addEventListener('resize', this.resize);

        // to avoid excessive re-render on scroll, we throttle frame updates
        this.needsRender = false;

        this.init();
    }

    init() {
        this.resize();
        this.preloadFrames().then(() => {
            // initial draw
            this.drawFrame(0);
            // show canvas fully when frames loaded
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
        // redraw current frame after resize
        if (this.images[this.currentFrame]) this.drawFrame(this.currentFrame);
    }

    preloadFrames() {
        const promises = [];
        for (let i = 0; i < this.totalFrames; i++) {
            promises.push(new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    this.images[i] = img;
                    this.loaded++;
                    resolve();
                };
                img.onerror = () => {
                    // still resolve to avoid blocking if a frame fails
                    this.images[i] = img;
                    resolve();
                };
                img.src = FRAME_URL(i);
            }));
        }
        return Promise.all(promises);
    }

    bindScroll() {
        // compute mapping from scroll to frame
        const onScroll = () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const maxScrollTop = document.documentElement.scrollHeight - window.innerHeight;
            const scrollFraction = Math.max(0, Math.min(1, scrollTop / maxScrollTop));
            const frameIndex = Math.min(this.totalFrames - 1, Math.floor(scrollFraction * this.totalFrames));
            this.currentFrame = frameIndex;
            this.needsRender = true;
        };

        window.addEventListener('scroll', onScroll, { passive: true });

        const loop = () => {
            if (this.needsRender) {
                this.drawFrame(this.currentFrame);
                this.crossfadeIfEnding();
                this.needsRender = false;
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    drawFrame(index) {
        const img = this.images[index];
        if (!img || !img.width) return;

        const { width: cw, height: ch } = this.canvas;
        // canvas uses CSS pixels, but our ctx is scaled for DPR already
        const cssW = this.canvas.clientWidth;
        const cssH = this.canvas.clientHeight;

        // clear
        this.ctx.clearRect(0, 0, cssW, cssH);

        const canvasRatio = cssW / cssH;
        const imgRatio = img.width / img.height;

        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

        if (canvasRatio > imgRatio) {
            // canvas wider -> fit width
            drawWidth = cssW;
            drawHeight = drawWidth / imgRatio;
            offsetY = (cssH - drawHeight) / 2;
        } else {
            drawHeight = cssH;
            drawWidth = drawHeight * imgRatio;
            offsetX = (cssW - drawWidth) / 2;
        }

        // optionally fade canvas when approaching last frames
        const fadeThreshold = 8;
        if (this.totalFrames - index <= fadeThreshold) {
            const alpha = Math.max(0, (this.totalFrames - index) / fadeThreshold);
            this.canvas.style.opacity = String(alpha);
        } else {
            this.canvas.style.opacity = '1';
        }

        this.ctx.save();
        // drawImage uses CSS coords (ctx is scaled by DPR)
        this.ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        this.ctx.restore();
    }

    crossfadeIfEnding() {
        // when last frame, reveal hero content by adding visible class
        if (this.currentFrame >= this.totalFrames - 2) {
            document.querySelector('.hero').classList.add('visible');
        }
    }
}

/* ---------- Page interactions: parallax, section reveal, sticky specs ---------- */

function setupSectionRevealAndParallax() {
    const sections = document.querySelectorAll('.section');
    // IntersectionObserver for reveal (adds class .visible)
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            } else {
                // keep visible once seen (optional: remove to re-trigger)
                // entry.target.classList.remove('visible');
            }
        });
    }, { threshold: 0.18 });

    sections.forEach(s => io.observe(s));

    // parallax based on data attribute
    window.addEventListener('scroll', () => {
        const scY = window.scrollY;
        document.querySelectorAll('[data-parallax-speed]').forEach((el) => {
            const speed = parseFloat(el.getAttribute('data-parallax-speed')) || 0.02;
            // small translateY for subtle parallax
            el.style.transform = `translateY(${-(scY * speed)}px)`;
        });
    }, { passive: true });
}

function setupStickySpecs() {
    const specs = Array.from(document.querySelectorAll('.spec'));
    const details = Array.from(document.querySelectorAll('.spec-detail'));

    // create an observer for each detail block so when it crosses mid-screen we highlight the matching spec
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const id = entry.target.id; // e.g. spec-2
                const idx = Number(id.split('-')[1]);
                specs.forEach(s => s.classList.remove('active'));
                const active = specs.find(s => Number(s.dataset.index) === idx);
                if (active) active.classList.add('active');
            }
        });
    }, { root: null, threshold: 0.48 });

    details.forEach(d => observer.observe(d));
}

/* ---------- Initialize everything ---------- */

window.addEventListener('DOMContentLoaded', () => {
    // set current year
    document.getElementById('year').textContent = new Date().getFullYear();

    // create hero canvas manager
    const hero = new HeroCanvas({ canvasId: CANVAS_ID, totalFrames: TOTAL_FRAMES });

    // set up page interactions
    setupSectionRevealAndParallax();
    setupStickySpecs();

    // small accessibility: allow keyboard focus on CTA
    document.querySelectorAll('.cta').forEach(a => a.setAttribute('tabindex', '0'));
});
