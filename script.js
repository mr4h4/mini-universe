const canvas = document.getElementById("universe");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

// Array de planetas
const planets = [];

// Variables dinámicas controladas por sliders
let G = 0.05;
let ROCHE_MASS_LIMIT = 5000;
let TRAIL_TIME = 2000;
let FRAGMENTS_SPEED = 4;

const SOFTENING = 50;

// Color random bonito
function randomColor() {
  const hue = Math.random() * 360;
  return `hsl(${hue}, 70%, 60%)`;
}

// Crear planeta
function createPlanet(x, y) {
  const radius = Math.random() * 15 + 10; // 10–25
  const mass = radius * radius; // masa proporcional al área

  planets.push({
    x,
    y,
    radius,
    mass,
    color: randomColor(),
    vx: (Math.random() - 0.5) * 1.5,
    vy: (Math.random() - 0.5) * 1.5,
    trail: []
  });
}

const effects = [];

// Click para crear planeta
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  createPlanet(x, y);
});

// Actualizar valores desde sliders (asumiendo que los elementos ya existen en tu HTML)
const gSlider = document.getElementById("g-slider");
const rocheSlider = document.getElementById("roche-slider");
const trailSlider = document.getElementById("trail-slider");
const fragSlider = document.getElementById("frag-speed-slider");

const gValue = document.getElementById("g-value");
const rocheValue = document.getElementById("roche-value");
const trailValue = document.getElementById("trail-value");
const fragSpeedValue = document.getElementById("frag-speed-value");

gSlider.addEventListener("input", e => { G = parseFloat(e.target.value); gValue.textContent = G.toFixed(2); });
rocheSlider.addEventListener("input", e => { ROCHE_MASS_LIMIT = parseInt(e.target.value); rocheValue.textContent = ROCHE_MASS_LIMIT; });
trailSlider.addEventListener("input", e => { TRAIL_TIME = parseInt(e.target.value); trailValue.textContent = TRAIL_TIME; });
fragSlider.addEventListener("input", e => { FRAGMENTS_SPEED = parseFloat(e.target.value); fragSpeedValue.textContent = FRAGMENTS_SPEED.toFixed(1); });

// Inicializar valores visibles
gValue.textContent = G.toFixed(2);
rocheValue.textContent = ROCHE_MASS_LIMIT;
trailValue.textContent = TRAIL_TIME;
fragSpeedValue.textContent = FRAGMENTS_SPEED.toFixed(1);

const TRAIL_BASE_TIME = 2000; // referencia para las estelas

function updateTrails() {
  const now = performance.now();

  for (const p of planets) {
    p.trail.push({ x: p.x, y: p.y, t: now });

    // eliminar puntos antiguos
    while (p.trail.length && now - p.trail[0].t > TRAIL_TIME) {
      p.trail.shift();
    }
  }
}

function drawTrails() {
  for (const p of planets) {
    if (p.trail.length < 2) continue;

    ctx.beginPath();
    ctx.moveTo(p.trail[0].x, p.trail[0].y);

    for (const point of p.trail) {
      ctx.lineTo(point.x, point.y);
    }

    ctx.strokeStyle = p.color;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = Math.max(1, p.radius * 0.2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function spawnMergeEffect(x, y, radius) {
  effects.push({
    x,
    y,
    radius,
    life: 1
  });
}

function drawEffects() {
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];

    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius * (1 + (1 - e.life)), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${e.life})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    e.life -= 0.03;

    if (e.life <= 0) {
      effects.splice(i, 1);
    }
  }
}

function applyGravity() {
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i];
      const p2 = planets[j];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;

      const distSq = dx * dx + dy * dy + SOFTENING;
      const dist = Math.sqrt(distSq);

      const force = (G * p1.mass * p2.mass) / distSq;

      const fx = force * dx / dist;
      const fy = force * dy / dist;

      p1.vx += fx / p1.mass;
      p1.vy += fy / p1.mass;
      p2.vx -= fx / p2.mass;
      p2.vy -= fy / p2.mass;
    }
  }
}

function movePlanets() {
  for (const p of planets) {
    p.x += p.vx;
    p.y += p.vy;

    if (p.x - p.radius < 0 || p.x + p.radius > canvas.width) {
      p.vx *= -1;
    }

    if (p.y - p.radius < 0 || p.y + p.radius > canvas.height) {
      p.vy *= -1;
    }
  }
}

function mergePlanets(big, small, impactEnergy) {
  const massLoss = Math.min(impactEnergy * 0.02, small.mass * 0.5);

  const newMass = big.mass + small.mass - massLoss;
  spawnMergeEffect(big.x, big.y, big.radius);

  big.vx = (big.vx * big.mass + small.vx * small.mass) / newMass;
  big.vy = (big.vy * big.mass + small.vy * small.mass) / newMass;

  big.mass = newMass;
  big.radius = Math.sqrt(newMass);

  const index = planets.indexOf(small);
  if (index !== -1) {
    planets.splice(index, 1);
  }
}

function triggerRocheLimit(planet) {
  const fragments = Math.floor(Math.random() * 100 + 50);
  const fragmentMass = planet.mass / fragments * 0.6;

  for (let i = 0; i < fragments; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * FRAGMENTS_SPEED + 1;

    planets.push({
      x: planet.x + Math.cos(angle) * planet.radius * 0.5,
      y: planet.y + Math.sin(angle) * planet.radius * 0.5,
      vx: planet.vx + Math.cos(angle) * speed,
      vy: planet.vy + Math.sin(angle) * speed,
      mass: fragmentMass,
      radius: Math.sqrt(fragmentMass),
      color: randomColor(),
      trail: []
    });
  }

  spawnMergeEffect(planet.x, planet.y, planet.radius * 2);

  const index = planets.indexOf(planet);
  if (index !== -1) planets.splice(index, 1);
}

function handleCollisions() {
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i];
      const p2 = planets[j];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = p1.radius + p2.radius;

      if (dist < minDist) {
        const rvx = p2.vx - p1.vx;
        const rvy = p2.vy - p1.vy;
        const relativeSpeed = Math.sqrt(rvx * rvx + rvy * rvy);

        const big = p1.mass >= p2.mass ? p1 : p2;
        const small = big === p1 ? p2 : p1;

        const impactEnergy = relativeSpeed * small.mass;

        mergePlanets(big, small, impactEnergy);

        for (const p of planets) {
          if (p.mass > ROCHE_MASS_LIMIT) {
            triggerRocheLimit(p);
            break;
          }
        }

        return;
      }
    }
  }
}

function drawPlanets() {
  for (const p of planets) {
    const grad = ctx.createRadialGradient(
      p.x - p.radius * 0.4,
      p.y - p.radius * 0.4,
      p.radius * 0.1,
      p.x,
      p.y,
      p.radius
    );

    grad.addColorStop(0, adjustColor(p.color, 30));
    grad.addColorStop(0.4, p.color);
    grad.addColorStop(1, adjustColor(p.color, -60));

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * 1.05, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,0.05)`;
    ctx.lineWidth = p.radius * 0.15;
    ctx.stroke();
  }
}

function adjustColor(color, amount) {
  const hsl = color.match(/\d+/g).map(Number);
  const l = Math.min(100, Math.max(0, hsl[2] + amount));
  return `hsl(${hsl[0]}, ${hsl[1]}%, ${l}%)`;
}

function update() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  applyGravity();
  movePlanets();
  handleCollisions();
  updateTrails();

  drawTrails();
  drawPlanets();
  drawEffects();

  requestAnimationFrame(update);
}

update();