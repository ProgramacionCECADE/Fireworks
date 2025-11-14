// Canvas setup
const canvas = document.getElementById('fireworksCanvas');
const ctx = canvas.getContext('2d');
const infoText = document.getElementById('infoText');
const backgroundMusic = document.getElementById('backgroundMusic');
let cw = window.innerWidth;
let ch = window.innerHeight;
canvas.width = cw;
canvas.height = ch;

// Game state
let fireworks = [];
let particles = [];
let hue = 120; 
let timerTick = 0;
let timerTotal = 40; 
let isMouseDown = false;
let mouseX, mouseY;
let audioStarted = false;
let musicStarted = false;

// Text fireworks
let textMessage = ["TEXTO DE", "EJEMPLO"];
let textPoints = [];
let textFireworkMode = false;
let textFireworkTimer = 0;
let textFireworkInterval = 400;
let currentTextIndex = 0;
let currentLineIndex = 0;

// MODIFICACIÓN: Variable para controlar la posición vertical del texto (0 = arriba, 0.5 = centro, 1 = abajo)
let textPositionY = 0.5;

// Variables para responsive
let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
let fontSizeMultiplier = isMobile ? 0.6 : 1;
let pointsGapMultiplier = isMobile ? 1.5 : 1;

// Audio
let launchSynth, explosionSynth, reverb;

function setupAudio() {
    reverb = new Tone.Reverb({
        decay: 4,
        preDelay: 0.01,
        wet: 0.3
    }).toDestination();

    launchSynth = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: {
            attack: 0.005,
            decay: 0.2,
            sustain: 0.1,
            release: 0.5,
        },
    }).connect(reverb);

    explosionSynth = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: {
            attack: 0.005,
            decay: 0.1,
            sustain: 0,
            release: 0.2,
        },
    }).connect(reverb);
}

// Utility functions
function random(min, max) { return Math.random() * (max - min) + min; }

function calculateDistance(p1x, p1y, p2x, p2y) {
    const xDistance = p1x - p2x;
    const yDistance = p1y - p2y;
    return Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2));
}

function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

function computeResponsiveFontSize(textArray) {
    const margin = Math.max(12, cw * 0.05);
    let size = Math.min(ch * 0.12, cw * 0.2);
    size = Math.max(24, size);
    const tmpCanvas = document.createElement('canvas');
    const tmpCtx = tmpCanvas.getContext('2d');
    while (size > 24) {
        tmpCtx.font = `bold ${size}px Arial`;
        let maxWidth = 0;
        for (let i = 0; i < textArray.length; i++) {
            const w = tmpCtx.measureText(textArray[i]).width;
            if (w > maxWidth) maxWidth = w;
        }
        if (maxWidth <= cw - margin * 2) break;
        size -= 2;
    }
    return size;
}

function wrapTextToWidth(textArray, maxWidth, fontSize) {
    const tmpCanvas = document.createElement('canvas');
    const tmpCtx = tmpCanvas.getContext('2d');
    tmpCtx.font = `bold ${fontSize}px Arial`;
    const wrapped = [];
    for (let i = 0; i < textArray.length; i++) {
        const words = String(textArray[i]).split(/\s+/);
        let line = '';
        for (let j = 0; j < words.length; j++) {
            const testLine = line ? line + ' ' + words[j] : words[j];
            const testWidth = tmpCtx.measureText(testLine).width;
            if (testWidth <= maxWidth) {
                line = testLine;
            } else {
                if (line) wrapped.push(line);
                line = words[j];
            }
        }
        if (line) wrapped.push(line);
    }
    return wrapped;
}

// Particle class
class Particle {
    constructor(x, y, hue, isTextParticle = false) {
        this.x = x;
        this.y = y;
        this.coords = [];
        this.coordCount = 5;
        while (this.coordCount--) { this.coords.push([this.x, this.y]); }
        this.angle = random(0, Math.PI * 2);
        this.isTextParticle = isTextParticle;
        
        if (isTextParticle) {
            // MODIFICACIÓN: Partículas de texto extremadamente lentas y duraderas
            this.speed = random(0.05, 0.15); // Muy lento
            this.friction = 0.995; // Casi sin fricción
            this.gravity = 0.01; // Casi sin gravedad
            this.decay = random(0.00005, 0.0001); // Se desvanecen extremadamente lento
        } else {
            this.speed = random(1, 10);
            this.friction = 0.95;
            this.gravity = 1;
            this.decay = random(0.015, 0.03);
        }
        
        this.hue = hue;
        this.brightness = random(50, 80);
        this.alpha = 1;
    }

    update() {
        this.coords.pop();
        this.coords.unshift([this.x, this.y]);
        this.speed *= this.friction;
        this.y += this.gravity;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.alpha -= this.decay;
        return !(this.alpha <= this.decay);
    }

    draw() {
        ctx.beginPath();
        ctx.moveTo(this.coords[this.coords.length - 1][0], this.coords[this.coords.length - 1][1]);
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = `hsla(${this.hue}, 100%, ${this.brightness}%, ${this.alpha})`;
        ctx.stroke();
    }
}

// MODIFICACIÓN EXTREMA: Firework class con velocidad muy reducida para texto
class Firework {
    constructor(startX, startY, targetX, targetY, isTextFirework = false) {
        this.x = startX;
        this.y = startY;
        this.startX = startX;
        this.startY = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.distanceToTarget = calculateDistance(startX, startY, targetX, targetY);
        this.distanceTraveled = 0;
        this.coords = [];
        this.coordCount = 8; // Aumentado para trail más largo
        while (this.coordCount--) { this.coords.push([this.x, this.y]); }
        this.angle = Math.atan2(targetY - startY, targetX - startX);
        
        // MODIFICACIÓN EXTREMA: Velocidad muy lenta para fuegos de texto
        if (isTextFirework) {
            this.speed = 1.0; // Muy reducido (era 1.0, luego 2.0 original)
            this.acceleration = 1.005; // Aceleración mínima
            this.minSpeed = 0.3; // Velocidad mínima para que no se detenga completamente
        } else {
            this.speed = 2;
            this.acceleration = 1.05;
        }
        
        this.brightness = random(50, 70);
        this.targetRadius = 1;
        this.isTextFirework = isTextFirework;

        if (audioStarted && !this.isTextFirework) {
            launchSynth.triggerAttackRelease('8n', Tone.now(), random(0.5, 1));
        }
    }

    update() {
        this.coords.pop();
        this.coords.unshift([this.x, this.y]);
        if (this.targetRadius < 8) { this.targetRadius += 0.3; } else { this.targetRadius = 1; }
        
        // MODIFICACIÓN: Para fuegos de texto, limitar la velocidad mínima
        if (this.isTextFirework) {
            this.speed = Math.max(this.minSpeed, this.speed * this.acceleration);
        } else {
            this.speed *= this.acceleration;
        }
        
        const vx = Math.cos(this.angle) * this.speed;
        const vy = Math.sin(this.angle) * this.speed;
        this.distanceTraveled = calculateDistance(this.startX, this.startY, this.x + vx, this.y + vy);

        if (this.distanceTraveled >= this.distanceToTarget) {
            // MODIFICACIÓN: Para fuegos de texto, crear partículas que duren mucho más
            if (this.isTextFirework) {
                createParticles(this.targetX, this.targetY, 10, true);
            } else {
                createParticles(this.targetX, this.targetY);
            }
            return false;
        } else {
            this.x += vx;
            this.y += vy;
            return true;
        }
    }

    draw() {
        ctx.beginPath();
        ctx.moveTo(this.coords[this.coords.length - 1][0], this.coords[this.coords.length - 1][1]);
        ctx.lineTo(this.x, this.y);
        // MODIFICACIÓN: Hacer el trazo más grueso para los fuegos de texto
        if (this.isTextFirework) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = `hsl(${hue}, 100%, ${this.brightness}%)`;
            ctx.stroke();
            ctx.lineWidth = 1;
        } else {
            ctx.strokeStyle = `hsl(${hue}, 100%, ${this.brightness}%)`;
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(this.targetX, this.targetY, this.targetRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function createParticles(x, y, count = 30, isTextParticle = false) {
    if (audioStarted && !isTextParticle) {
        explosionSynth.triggerAttackRelease("16n", Tone.now(), random(0.8, 1));
    }
    const particleCount = isTextParticle ? Math.floor(count * 0.1) : count;
    const particleHue = hue + random(-20, 20);
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(x, y, particleHue, isTextParticle));
    }
}

// Get text points using canvas measureText
function getTextPoints(textArray, fontSize = 80) {
    const margin = Math.max(12, cw * 0.05);
    const computedFontSize = computeResponsiveFontSize(textArray);
    const fontPx = computedFontSize;
    const tmpCanvas = document.createElement('canvas');
    const tmpCtx = tmpCanvas.getContext('2d');
    tmpCtx.font = `bold ${fontPx}px Arial`;
    const wrappedLines = wrapTextToWidth(textArray, cw - margin * 2, fontPx);
    const lineHeight = fontPx * 1.2;
    const aspect = ch / cw;
    const positionY = aspect > 1.6 ? 0.35 : textPositionY;
    const totalHeight = wrappedLines.length * lineHeight;
    const startY = (ch - totalHeight) * positionY + fontPx * 0.8;
    const points = [];
    const gapBase = Math.round(fontPx / 14);
    const gap = Math.max(4, Math.min(10, gapBase)) * pointsGapMultiplier;

    wrappedLines.forEach((line, lineIndex) => {
        const textWidth = tmpCtx.measureText(line).width;
        const x = margin + (cw - margin * 2 - textWidth) / 2;
        const y = startY + (lineIndex * lineHeight);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = Math.ceil(textWidth) + 20;
        tempCanvas.height = Math.ceil(fontPx) + 20;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.font = `bold ${fontPx}px Arial`;
        tempCtx.fillStyle = 'white';
        tempCtx.fillText(line, 10, fontPx + 10);
        const lineImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        for (let py = 0; py < tempCanvas.height; py += gap) {
            for (let px = 0; px < tempCanvas.width; px += gap) {
                const index = (py * tempCanvas.width + px) * 4;
                const alpha = lineImageData.data[index + 3];
                if (alpha > 128) {
                    points.push({ x: x + px - 10, y: (y - fontPx * 0.8) + py - 10 });
                }
            }
        }
    });
    return points;
}

function launchTextFireworks() {
    if (textPoints.length === 0) {
        textPoints = getTextPoints(textMessage);
    }
    
    // MODIFICACIÓN EXTREMA: Reducir al mínimo los puntos por frame
    const pointsPerFrame = isMobile ? 4 : 8; // Ajustar según dispositivo
    for (let i = 0; i < pointsPerFrame && currentTextIndex < textPoints.length; i++) {
        const point = textPoints[currentTextIndex];
        const startX = random(cw * 0.1, cw * 0.9);
        const startY = ch + random(0, 100);
        fireworks.push(new Firework(startX, startY, point.x, point.y, true));
        currentTextIndex++;
    }
    
    // MODIFICACIÓN: Aumentar significativamente el tiempo que el texto permanece visible
    if (currentTextIndex >= textPoints.length) {
        // Esperar mucho más tiempo antes de reiniciar (aproximadamente 15-20 segundos)
        if (textFireworkTimer >= textFireworkInterval + 500) {
            currentTextIndex = 0;
            textFireworkMode = false;
            textFireworkTimer = 0;
            textPoints = [];
        }
    }
}

function loop() {
    requestAnimationFrame(loop);
    hue += 0.5;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; // Fade más suave para que dure más el texto
    ctx.fillRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = 'lighter';

    let i = fireworks.length;
    while (i--) {
        if (!fireworks[i].update()) {
            fireworks.splice(i, 1);
        } else {
            fireworks[i].draw();
        }
    }

    let j = particles.length;
    while (j--) {
        if (!particles[j].update()) {
            particles.splice(j, 1);
        } else {
            particles[j].draw();
        }
    }

    textFireworkTimer++;

    if (textFireworkMode) {
        launchTextFireworks();
        // Reducir fuegos aleatorios durante el modo texto para no distraer
        if (timerTick >= timerTotal * 5) {
            fireworks.push(new Firework(cw / 2, ch, random(0, cw), random(0, ch / 2)));
            timerTick = 0;
        } else {
            timerTick++;
        }
    } else {
        if (timerTick >= timerTotal) {
            if (!isMouseDown) {
                fireworks.push(new Firework(cw / 2, ch, random(0, cw), random(0, ch / 2)));
                timerTick = 0;
            }
        } else {
            timerTick++;
        }
        
        if (textFireworkTimer >= textFireworkInterval) {
            textFireworkMode = true;
            currentTextIndex = 0;
            textPoints = getTextPoints(textMessage);
        }
    }
}

function startAudio() {
    if (audioStarted) return;
    Tone.start().then(() => {
        audioStarted = true;
        setupAudio();
        infoText.textContent = 'Click o presiona para lanzar un fuego artificial';

        // Iniciar música de fondo
        if (!musicStarted) {
            backgroundMusic.volume = 0.5; // Volumen al 50%
            backgroundMusic.play().catch(e => console.log('Error reproduciendo música:', e));
            musicStarted = true;
        }

        document.body.removeEventListener('mousedown', startAudio);
        document.body.removeEventListener('touchstart', startAudio);
    });
}

// Función para manejar el redimensionado de la ventana
function handleResize() {
    cw = window.innerWidth;
    ch = window.innerHeight;
    canvas.width = cw;
    canvas.height = ch;
    
    // Actualizar detección de móvil
    isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || cw < 768;
    fontSizeMultiplier = isMobile ? 0.6 : 1;
    pointsGapMultiplier = isMobile ? 1.5 : 1;
    
    // Reiniciar puntos de texto si estamos en modo texto
    if (textFireworkMode) {
        textPoints = getTextPoints(textMessage);
    } else {
        if (textPoints.length) {
            textPoints = [];
        }
    }
}

// Event listeners
document.body.addEventListener('mousedown', startAudio);
document.body.addEventListener('touchstart', startAudio);

window.addEventListener('resize', handleResize);

canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isMouseDown = true;
    mouseX = e.pageX;
    mouseY = e.pageY;
    fireworks.push(new Firework(cw / 2, ch, mouseX, mouseY));
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isMouseDown = true;
    mouseX = e.touches[0].pageX;
    mouseY = e.touches[0].pageY;
    fireworks.push(new Firework(cw / 2, ch, mouseX, mouseY));
});

canvas.addEventListener('mouseup', () => { isMouseDown = false; });
canvas.addEventListener('touchend', () => { isMouseDown = false; });

// Prevenir scroll en dispositivos táctiles
document.addEventListener('touchmove', function(e) {
    if (e.target === canvas) {
        e.preventDefault();
    }
}, { passive: false });

// Inicializar con el tamaño correcto
handleResize();

// Start the animation
window.onload = loop;