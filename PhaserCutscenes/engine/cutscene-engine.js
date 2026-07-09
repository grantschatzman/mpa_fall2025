// ─────────────────────────────────────────────
// DOM REFS
// ─────────────────────────────────────────────
const elBubble     = document.getElementById('bubble-wrap');
const elBubbleText = document.getElementById('bubble-text');
const elDlg        = document.getElementById('dialogue-box');
const elSpeaker    = document.getElementById('speaker-name');
const elText       = document.getElementById('dialogue-text');
const elChoices    = document.getElementById('choice-container');
const elIndic      = document.getElementById('click-indicator');
const elBack       = document.getElementById('nav-back');
const elNext       = document.getElementById('nav-next');
const elVolControl = document.getElementById('volume-control');
const elVolIcon    = document.getElementById('volume-icon');
const elVolSlider  = document.getElementById('volume-slider');
const elCinematic  = document.getElementById('cinematic-overlay');

const elTitle       = document.getElementById('title-screen');
const elTitleLabel  = document.getElementById('title-label');
const elTitleMain   = document.getElementById('title-main');
const elTitleSub    = document.getElementById('title-sub');
const elTitlePrompt = document.getElementById('title-prompt');

const elEnd       = document.getElementById('end-screen');
const elEndLabel  = document.getElementById('end-label');
const elEndMain   = document.getElementById('end-main');
const elEndSub    = document.getElementById('end-sub');
const elEndPrompt = document.getElementById('end-prompt');

const elOverlay = document.getElementById('transition-overlay');
const elContainer = document.getElementById('cutscene-container');

const TYPE_SPEED = 28; // ms per character

// ─────────────────────────────────────────────
// VOLUME — shared localStorage key with the legacy cutscene pipeline
// (see General Cutscene Instructions.md's Volume Slider Add-on) so a
// student's preference carries across both systems.
// ─────────────────────────────────────────────
const VOLUME_STORAGE_KEY = 'cutsceneMasterVolume';
const storedVolume = parseFloat(localStorage.getItem(VOLUME_STORAGE_KEY));
const initialVolume = Number.isFinite(storedVolume) ? Math.min(1, Math.max(0, storedVolume)) : 0.6;

function updateVolumeIcon(v) {
    if (!elVolIcon) return;
    if (v <= 0)        elVolIcon.textContent = '🔇';
    else if (v < 0.3)  elVolIcon.textContent = '🔈';
    else if (v < 0.7)  elVolIcon.textContent = '🔉';
    else                elVolIcon.textContent = '🔊';
}

if (elVolSlider) elVolSlider.value = initialVolume * 100;
updateVolumeIcon(initialVolume);

// ─────────────────────────────────────────────
// SCENE DATA — fetched at boot, not hardcoded.
// See boot() at the bottom of this file.
// ─────────────────────────────────────────────
let DATA = null;

// ─────────────────────────────────────────────
// SHY-TEXT / EMPHASIS PARSING
// {bracketed} text peters off into tiny, wiggling letters.
// **bolded** text is plain emphasis, no animation.
// ─────────────────────────────────────────────
function parseEntries(text) {
    const entries = [];
    const re = /\{([^}]*)\}|\*\*([^*]+)\*\*/g;
    let lastIndex = 0;
    let match;

    const pushNormal = str => { for (const ch of str) entries.push({ char: ch, kind: 'normal' }); };
    const pushShy = str => {
        const len = str.length;
        for (let i = 0; i < len; i++) {
            const shyPos = len <= 1 ? 0 : i / (len - 1);
            entries.push({ char: str[i], kind: 'shy', shyPos });
        }
    };
    const pushBold = str => { for (const ch of str) entries.push({ char: ch, kind: 'bold' }); };

    while ((match = re.exec(text)) !== null) {
        if (match.index > lastIndex) pushNormal(text.slice(lastIndex, match.index));
        if (match[1] !== undefined) pushShy(match[1]);
        else if (match[2] !== undefined) pushBold(match[2]);
        lastIndex = re.lastIndex;
    }
    if (lastIndex < text.length) pushNormal(text.slice(lastIndex));
    return entries;
}

// Appends exactly one entry to container. Called both by the timed typewriter
// stepper and by skipTypewriter's all-at-once pass, so mid-type skips render
// pixel-identical to letting the animation finish.
function emitChar(container, entry, index) {
    if (entry.kind === 'shy') {
        if (/\s/.test(entry.char)) { container.appendChild(document.createTextNode(entry.char)); return; }
        const span = document.createElement('span');
        span.className = 'shy-char';
        span.textContent = entry.char;
        const size = 100 - entry.shyPos * 42; // 100% -> ~58%, "peters off" into tiny letters
        span.style.fontSize = size.toFixed(0) + '%';
        span.style.animationDelay = ((index % 6) * 0.08).toFixed(2) + 's';
        container.appendChild(span);
    } else if (entry.kind === 'bold') {
        const span = document.createElement('span');
        span.style.fontWeight = 'bold';
        span.textContent = entry.char;
        container.appendChild(span);
    } else {
        container.appendChild(document.createTextNode(entry.char));
    }
}

// ─────────────────────────────────────────────
// SCENE
// ─────────────────────────────────────────────
class CutsceneScene extends Phaser.Scene {
    constructor() {
        super('cutscene');
    }

    preload() {
        const base = new URL(window.CUTSCENE_DATA_URL, window.location.href);
        (DATA.assets.images || []).forEach(img => {
            this.load.image(img.key, new URL(img.path, base).href);
        });
        (DATA.assets.audio || []).forEach(a => {
            this.load.audio(a.key, new URL(a.path, base).href);
        });
    }

    create() {
        window.cutsceneScene = this;

        this.busy = false;
        this.currentId = null;
        this.twTimer = null;
        this.twDone = true;
        this.glowPhase = 'off';
        this.glowPulseTween = null;
        this.glowBaseScale = 1;
        this.masterVolume = initialVolume;
        this.currentMusicKey = null;
        this.history = [];
        this.currentTreatment = (DATA.meta && DATA.meta.visualTreatment) || null;
        this.cinematicTimers = [];
        this.cinematicSkip = null;

        const images = DATA.assets.images || [];
        const bgAssets = images.filter(i => i.role === 'background');
        const charAssets = images.filter(i => i.role === 'character');
        const initialBg = bgAssets.length ? bgAssets[0].key : (images[0] && images[0].key);
        const initialChar = charAssets.length ? charAssets[0].key : initialBg;

        // Background
        this.bgImage = this.add.image(0, 0, initialBg).setOrigin(0.5);

        // Glow VFX — canvas-generated radial gradient, animated via tweens
        this.makeGlowTexture();
        this.glowSprite = this.add.image(0, 0, 'glow')
            .setBlendMode(Phaser.BlendModes.SCREEN)
            .setOrigin(0.5)
            .setVisible(false)
            .setDepth(5);

        // Character (hidden until a frame requests one via `char`)
        this.charSprite = this.add.image(0, 0, initialChar)
            .setOrigin(0.5, 1)
            .setVisible(false)
            .setDepth(10);

        // Spotlight VFX — a cool-toned flash, distinct from the warm "idea"
        // glow above. Used by cinematic frames (e.g. the Ep3 epilogue).
        this.makeSpotlightTexture();
        this.spotlightSprite = this.add.image(0, 0, 'spotlight')
            .setBlendMode(Phaser.BlendModes.SCREEN)
            .setOrigin(0.5)
            .setVisible(false)
            .setDepth(6);

        // Music
        this.sounds = {};
        (DATA.assets.audio || []).forEach(a => {
            this.sounds[a.key] = this.sound.add(a.key, { loop: true });
        });

        this.scale.on('resize', () => this.handleResize());
        this.handleResize();

        if (DATA.meta && DATA.meta.browserTitle) document.title = DATA.meta.browserTitle;

        this.renderFrame((DATA.meta && DATA.meta.startFrame) || 'title');

        // Fade in from black on load
        this.busy = true;
        setTimeout(() => {
            elOverlay.style.transition = 'opacity 0.9s ease';
            elOverlay.style.opacity = '0';
            setTimeout(() => { this.busy = false; }, 1000);
        }, 200);
    }

    // ── Layout ──────────────────────────────────
    handleResize() {
        this.fitBackground();
        this.fitCharacter();
        this.fitGlow();
    }

    fitBackground() {
        const tex = this.textures.get(this.bgImage.texture.key).getSourceImage();
        const scale = Math.min(this.scale.width / tex.width, this.scale.height / tex.height);
        this.bgImage.setScale(scale).setPosition(this.scale.width / 2, this.scale.height / 2);
    }

    fitCharacter() {
        if (!this.charSprite.visible) return;
        const tex = this.textures.get(this.charSprite.texture.key).getSourceImage();
        const scale = (this.scale.height * 0.40) / tex.height;
        this.charSprite.setScale(scale).setPosition(this.scale.width * 0.82, this.scale.height);
    }

    fitGlow() {
        this.glowSprite.setPosition(this.scale.width * 0.5, this.scale.height * 0.58);
    }

    // ── Glow VFX ────────────────────────────────
    makeGlowTexture() {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        grad.addColorStop(0.00, 'rgba(255,220,80,1.0)');
        grad.addColorStop(0.40, 'rgba(255,160,20,0.65)');
        grad.addColorStop(0.68, 'rgba(255,100,10,0.2)');
        grad.addColorStop(0.80, 'rgba(255,100,10,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        this.textures.addCanvas('glow', canvas);
    }

    // ── Spotlight VFX — a quick cool-toned flash-and-fade, distinct from the
    // slow warm "idea" glow build above. Used by cinematic frames.
    makeSpotlightTexture() {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        grad.addColorStop(0.00, 'rgba(255,255,255,1.0)');
        grad.addColorStop(0.35, 'rgba(230,240,255,0.8)');
        grad.addColorStop(0.65, 'rgba(200,220,255,0.3)');
        grad.addColorStop(0.85, 'rgba(200,220,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        this.textures.addCanvas('spotlight', canvas);
    }

    triggerSpotlightFlash() {
        const base = (this.scale.height * 0.65) / 512;
        this.spotlightSprite
            .setPosition(this.scale.width * 0.5, this.scale.height * 0.45)
            .setVisible(true)
            .setAlpha(0)
            .setScale(base * 0.4);
        this.tweens.add({
            targets: this.spotlightSprite,
            alpha: 1,
            scaleX: base,
            scaleY: base,
            duration: 260,
            ease: 'Quad.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: this.spotlightSprite,
                    alpha: 0,
                    duration: 900,
                    delay: 200,
                    ease: 'Quad.easeIn',
                    onComplete: () => this.spotlightSprite.setVisible(false)
                });
            }
        });
    }

    setGlow(on) {
        if (on) {
            if (this.glowPhase === 'off') {
                this.glowPhase = 'animating';
                this.showGlow();
            }
        } else {
            this.tweens.killTweensOf(this.glowSprite);
            if (this.glowPulseTween) { this.glowPulseTween.stop(); this.glowPulseTween = null; }
            this.glowSprite.setVisible(false).setAlpha(0);
            this.glowPhase = 'off';
        }
    }

    showGlow() {
        const base = (this.scale.height * 0.3) / 512;
        this.glowBaseScale = base;
        this.glowSprite.setVisible(true).setAlpha(0).setScale(base * 0.3);

        const steps = [
            { alpha: 0.4,  mul: 0.7,  duration: 1750 },
            { alpha: 0.8,  mul: 0.95, duration: 2100 },
            { alpha: 1.0,  mul: 1.25, duration: 700 },
            { alpha: 0.9,  mul: 1.35, duration: 490 },
            { alpha: 0.75, mul: 1.1,  duration: 560 },
            { alpha: 0.85, mul: 1.0,  duration: 1400 }
        ];

        const runStep = i => {
            if (i >= steps.length) { this.startGlowPulse(); return; }
            const s = steps[i];
            this.tweens.add({
                targets: this.glowSprite,
                alpha: s.alpha,
                scaleX: base * s.mul,
                scaleY: base * s.mul,
                duration: s.duration,
                ease: 'Sine.easeInOut',
                onComplete: () => runStep(i + 1)
            });
        };
        runStep(0);
    }

    startGlowPulse() {
        this.glowPhase = 'steady';
        const base = this.glowBaseScale;
        this.glowPulseTween = this.tweens.add({
            targets: this.glowSprite,
            scaleX: { from: base * 0.94, to: base * 1.08 },
            scaleY: { from: base * 0.94, to: base * 1.08 },
            alpha: { from: 0.7, to: 1.0 },
            duration: 1250,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    // ── Music ───────────────────────────────────
    musicPlay(key, ms = 2000) {
        if (this.currentMusicKey === key) return;
        if (this.currentMusicKey) this.musicFadeOutStop(this.sounds[this.currentMusicKey], ms);
        const s = this.sounds[key];
        if (!s) return;
        s.setVolume(0);
        s.play();
        this.tweens.add({ targets: s, volume: this.masterVolume, duration: ms });
        this.currentMusicKey = key;
    }

    musicStop(key, ms = 2000) {
        const s = this.sounds[key];
        if (!s || !s.isPlaying) return;
        this.musicFadeOutStop(s, ms);
        if (this.currentMusicKey === key) this.currentMusicKey = null;
    }

    musicFadeOutStop(sound, ms) {
        this.tweens.add({
            targets: sound,
            volume: 0,
            duration: ms,
            onComplete: () => sound.stop()
        });
    }

    musicCrossfade(fromKey, toKey, ms = 1800) {
        this.musicStop(fromKey, ms);
        this.musicPlay(toKey, ms);
    }

    setMasterVolume(v) {
        this.masterVolume = v;
        localStorage.setItem(VOLUME_STORAGE_KEY, v);
        if (this.currentMusicKey && this.sounds[this.currentMusicKey]) {
            this.sounds[this.currentMusicKey].setVolume(v);
        }
        updateVolumeIcon(v);
    }

    // ── Typewriter (shy-text aware) ──────────────
    startTypewriter(text, onDone) {
        clearTimeout(this.twTimer);
        elText.innerHTML = '';
        this.twDone = false;
        this.currentDlgEntries = parseEntries(text);
        let i = 0;
        const entries = this.currentDlgEntries;
        const step = () => {
            if (i >= entries.length) { this.twDone = true; if (onDone) onDone(); return; }
            emitChar(elText, entries[i], i);
            i++;
            this.twTimer = setTimeout(step, TYPE_SPEED);
        };
        step();
    }

    skipTypewriter() {
        if (this.twDone) return false;
        clearTimeout(this.twTimer);
        elText.innerHTML = '';
        this.currentDlgEntries.forEach((entry, i) => emitChar(elText, entry, i));
        this.twDone = true;
        return true;
    }

    renderBubbleText(text) {
        elBubbleText.innerHTML = '';
        parseEntries(text).forEach((entry, i) => emitChar(elBubbleText, entry, i));
    }

    // ── Frame rendering ─────────────────────────
    renderFrame(id) {
        const f = DATA.frames[id];
        if (!f) return;
        this.currentId = id;

        elBack.classList.toggle('visible', this.history.length > 0);
        elNext.classList.remove('visible');

        // Per-frame visual treatment override (falls back to the episode's
        // meta.visualTreatment). Lets one frame — e.g. a somber flashback or
        // epilogue beat — use a different look without affecting the rest
        // of the episode.
        const treatment = f.visualTreatment || (DATA.meta && DATA.meta.visualTreatment);
        if (treatment !== this.currentTreatment) {
            if (this.currentTreatment) elContainer.classList.remove(`treatment-${this.currentTreatment}`);
            if (treatment) elContainer.classList.add(`treatment-${treatment}`);
            this.currentTreatment = treatment;
        }

        if (f.music) {
            const m = f.music;
            if (m.action === 'play') this.musicPlay(m.key);
            else if (m.action === 'stop') this.musicStop(m.key);
            else if (m.action === 'crossfade') this.musicCrossfade(m.from, m.to);
        }

        if (f.bg) this.setBackground(f.bg);
        this.setGlow(!!f.glow);
        this.setCharacter(f.char || null);

        elBubble.classList.toggle('active', !!f.bubble);
        if (f.bubble && f.bubbleText) this.renderBubbleText(f.bubbleText);

        // Unconditional, like the bubble toggle above: any frame type can
        // follow a cinematic frame, so clear it here rather than only on
        // the standard/choice path (title/end return early before reaching
        // that branch, which would leave a stale cinematic overlay showing).
        if (f.type !== 'cinematic') elCinematic.classList.remove('active');

        elChoices.innerHTML = '';
        elChoices.classList.remove('visible');
        elIndic.classList.remove('visible');

        if (f.type === 'title') {
            this.twDone = true;
            elDlg.classList.remove('visible');
            elEnd.classList.remove('active');
            if (f.title) {
                elTitleLabel.textContent = f.title.label || '';
                elTitleMain.textContent = f.title.main || '';
                elTitleSub.textContent = f.title.sub || '';
                elTitlePrompt.textContent = f.title.prompt || '▼ click anywhere to begin';
            }
            elTitle.classList.add('active');
            return;
        }
        elTitle.classList.remove('active');

        if (f.type === 'end') {
            this.twDone = true;
            elDlg.classList.remove('visible');
            if (f.end) {
                elEndLabel.textContent = f.end.label || '';
                elEndMain.textContent = f.end.main || '';
                elEndSub.textContent = f.end.sub || '';
                elEndPrompt.textContent = f.end.prompt || '▼ click to restart';
            }
            elEnd.classList.add('active');
            return;
        }
        elEnd.classList.remove('active');

        if (f.type === 'cinematic') {
            this.twDone = true;
            elDlg.classList.remove('visible');
            elBack.classList.remove('visible');
            elNext.classList.remove('visible');
            this.runCinematic(f);
            return;
        }

        if (f.dlg) {
            const d = f.dlg;
            const dlgPos = (f.type === 'choice') ? 'top' : d.pos;
            elDlg.className = `style-${d.style} pos-${dlgPos}`;
            elDlg.classList.add('visible');

            if (d.speaker) { elSpeaker.textContent = d.speaker; elSpeaker.style.display = 'block'; }
            else            { elSpeaker.style.display = 'none'; }

            this.startTypewriter(d.text, () => {
                if (f.type === 'choice') this.buildChoices(f.choices);
                else { elIndic.classList.add('visible'); elNext.classList.add('visible'); }
            });
        } else {
            elDlg.classList.remove('visible');
            if (f.type === 'choice') this.buildChoices(f.choices);
        }
    }

    // ── Cinematic frames — a fully automatic, timed sequence with no
    // player input: lines of text fade in one at a time and stay stacked,
    // while music/flash/cut-to-black beats fire on a schedule, ending by
    // navigating to `next` on its own. A click/keypress skips straight to
    // `next` (see advance() below) rather than doing nothing, in case a
    // student needs to get past it faster.
    runCinematic(f) {
        const c = f.cinematic || {};
        const lines = c.lines || [];

        elCinematic.innerHTML = '';
        const lineEls = lines.map(line => {
            const div = document.createElement('div');
            div.className = 'cinematic-line';
            div.textContent = line;
            elCinematic.appendChild(div);
            return div;
        });
        elCinematic.classList.add('active');

        this.busy = true;
        this.cinematicTimers.forEach(clearTimeout);
        this.cinematicTimers = [];
        const schedule = (ms, fn) => this.cinematicTimers.push(setTimeout(fn, ms));

        const revealDuration = c.revealDuration ?? 4000;
        const step = lineEls.length ? revealDuration / lineEls.length : 0;
        lineEls.forEach((el, i) => schedule(i * step, () => el.classList.add('visible')));

        if (c.musicFadeOutAt != null) {
            schedule(c.musicFadeOutAt, () => {
                if (this.currentMusicKey) this.musicStop(this.currentMusicKey, c.musicFadeOutDuration ?? 2000);
            });
        }

        if (c.flashAt != null) schedule(c.flashAt, () => this.triggerSpotlightFlash());

        const cutToBlackAt = c.cutToBlackAt ?? revealDuration;
        schedule(cutToBlackAt, () => this.finishCinematic(f.next));

        this.cinematicSkip = () => this.finishCinematic(f.next);
    }

    finishCinematic(nextId) {
        this.cinematicTimers.forEach(clearTimeout);
        this.cinematicTimers = [];
        this.cinematicSkip = null;
        elCinematic.classList.remove('active');
        this.busy = false;
        this.navigate(nextId);
    }

    setBackground(key) {
        if (this.bgImage.texture.key === key) return;
        this.bgImage.setTexture(key);
        this.fitBackground();
    }

    setCharacter(key) {
        if (!key) { this.charSprite.setVisible(false); return; }
        this.charSprite.setTexture(key);
        this.charSprite.setVisible(true);
        this.fitCharacter();
    }

    buildChoices(choices) {
        elChoices.innerHTML = '';
        choices.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = c.text;
            btn.addEventListener('click', e => { e.stopPropagation(); this.navigate(c.to); });
            elChoices.appendChild(btn);
        });
        elChoices.classList.add('visible');
    }

    // ── Navigation / transitions ────────────────
    navigate(targetId, { recordHistory = true } = {}) {
        if (this.busy) return;
        if (recordHistory && this.currentId) this.history.push(this.currentId);
        const f = DATA.frames[this.currentId];
        const fNext = DATA.frames[targetId];

        let dur;
        if (f && f.slowFade) dur = 900;
        else if (f && f.forceFade) dur = 380;
        else if (f && fNext && f.bg && fNext.bg && f.bg === fNext.bg) dur = 0;
        else dur = 380;

        if (dur === 0) {
            this.busy = true;
            clearTimeout(this.twTimer); this.twDone = true;
            this.renderFrame(targetId);
            this.busy = false;
            return;
        }

        this.busy = true;
        elOverlay.style.transition = `opacity ${dur / 2}ms ease`;
        elOverlay.style.opacity = '1';

        setTimeout(() => {
            clearTimeout(this.twTimer); this.twDone = true;
            this.renderFrame(targetId);
            elOverlay.style.transition = `opacity ${dur / 2}ms ease`;
            elOverlay.style.opacity = '0';
            setTimeout(() => { this.busy = false; }, dur / 2 + 40);
        }, dur / 2);
    }

    advance() {
        if (this.cinematicSkip) { this.cinematicSkip(); return; }
        if (this.busy) return;
        const f = DATA.frames[this.currentId];
        if (!f || f.type === 'choice') return;
        if (!this.twDone) { this.skipTypewriter(); return; }
        if (f.next) this.navigate(f.next);
    }

    goBack() {
        if (this.busy || !this.history.length) return;
        clearTimeout(this.twTimer); this.twDone = true;
        const prevId = this.history.pop();
        this.navigate(prevId, { recordHistory: false });
    }
}

// ─────────────────────────────────────────────
// BOOT — fetch the episode's JSON before constructing the Phaser.Game,
// since preload() can't await a fetch (Phaser queues loads synchronously).
// ─────────────────────────────────────────────
async function boot() {
    const res = await fetch(window.CUTSCENE_DATA_URL);
    DATA = await res.json();

    if (DATA.meta && DATA.meta.visualTreatment) {
        elContainer.classList.add(`treatment-${DATA.meta.visualTreatment}`);
    }

    new Phaser.Game({
        type: Phaser.AUTO,
        parent: 'game-root',
        backgroundColor: '#0a0a0a',
        scale: {
            mode: Phaser.Scale.RESIZE,
            width: window.innerWidth,
            height: window.innerHeight
        },
        scene: CutsceneScene
    });
}
boot();

// ─────────────────────────────────────────────
// INPUT
// ─────────────────────────────────────────────
document.getElementById('cutscene-container').addEventListener('click', () => {
    if (window.cutsceneScene) window.cutsceneScene.advance();
});

elBack.addEventListener('click', e => {
    e.stopPropagation();
    if (window.cutsceneScene) window.cutsceneScene.goBack();
});

elNext.addEventListener('click', e => {
    e.stopPropagation();
    if (window.cutsceneScene) window.cutsceneScene.advance();
});

if (elVolSlider) {
    elVolSlider.addEventListener('input', e => {
        const v = e.target.value / 100;
        if (window.cutsceneScene) window.cutsceneScene.setMasterVolume(v);
        else { localStorage.setItem(VOLUME_STORAGE_KEY, v); updateVolumeIcon(v); }
    });
}
if (elVolControl) elVolControl.addEventListener('click', e => e.stopPropagation());

document.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (window.cutsceneScene) window.cutsceneScene.advance();
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (window.cutsceneScene) window.cutsceneScene.goBack();
    }
});
