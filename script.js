(() => {
  "use strict";

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const title = document.getElementById("overlay-title");
  const copy = document.getElementById("overlay-copy");
  const action = document.getElementById("main-action");
  const hint = document.getElementById("panel-hint");
  const resultRow = document.getElementById("result-row");
  const scoreText = document.getElementById("score");
  const speedText = document.getElementById("speed");
  const coinsText = document.getElementById("coins");
  const finalScoreText = document.getElementById("final-score");
  const bestScoreText = document.getElementById("best-score");
  const sideBestText = document.getElementById("side-best");
  const soundToggle = document.getElementById("sound-toggle");
  const soundLabel = document.getElementById("sound-label");
  const pauseButton = document.getElementById("pause-button");

  const WIDTH = 480;
  const HEIGHT = 800;
  const ROAD_LEFT = 57;
  const ROAD_RIGHT = 423;
  const LANE_WIDTH = (ROAD_RIGHT - ROAD_LEFT) / 3;
  const LANES = [ROAD_LEFT + LANE_WIDTH * .5, ROAD_LEFT + LANE_WIDTH * 1.5, ROAD_LEFT + LANE_WIDTH * 2.5];
  const PLAYER_Y = 650;
  const PLAYER_HITBOX = { width: 44, height: 74 };
  const COLORS = ["#f05b50", "#55b6ed", "#f2ae45", "#b882eb", "#45c98b"];
  const STORAGE_KEY = "neon-highway-best";

  let state = "menu";
  let lastTime = 0;
  let elapsed = 0;
  let score = 0;
  let coins = 0;
  let speed = 260;
  let roadOffset = 0;
  let enemyTimer = 0;
  let coinTimer = 0;
  let decorTimer = 0;
  let entities = [];
  let decorations = [];
  let particles = [];
  let laneTarget = 1;
  let playerX = LANES[laneTarget];
  let steerDirection = 0;
  let steerRepeat = 0;
  let bestScore = loadBestScore();
  let soundOn = true;
  let audioContext = null;
  let canvasScale = 1;
  let canvasOffsetX = 0;
  let canvasOffsetY = 0;
  let pointerStartX = null;
  let pointerStartY = null;

  function loadBestScore() {
    try {
      return Number.parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10) || 0;
    } catch (error) {
      console.warn("Could not read the saved best score.", error);
      return 0;
    }
  }

  function saveBestScore(value) {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch (error) {
      console.warn("Could not save the best score.", error);
    }
  }

  function updateBestDisplay() {
    sideBestText.textContent = String(bestScore).padStart(5, "0");
    bestScoreText.textContent = String(bestScore);
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    canvasScale = Math.min(canvas.width / WIDTH, canvas.height / HEIGHT);
    canvasOffsetX = (canvas.width - WIDTH * canvasScale) / 2;
    canvasOffsetY = (canvas.height - HEIGHT * canvasScale) / 2;
  }

  function beginFrame() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(canvasScale, 0, 0, canvasScale, canvasOffsetX, canvasOffsetY);
  }

  function roundedRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawBackground() {
    ctx.fillStyle = "#397148";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    for (let y = -40 + (roadOffset % 70); y < HEIGHT; y += 70) {
      ctx.fillStyle = "#3e794d";
      ctx.fillRect(0, y, ROAD_LEFT - 2, 35);
      ctx.fillRect(ROAD_RIGHT + 2, y + 35, WIDTH - ROAD_RIGHT, 35);
    }
    ctx.fillStyle = "#bbc9ab";
    ctx.fillRect(ROAD_LEFT - 7, 0, 5, HEIGHT);
    ctx.fillRect(ROAD_RIGHT + 2, 0, 5, HEIGHT);
    ctx.fillStyle = "#737a78";
    ctx.fillRect(ROAD_LEFT, 0, ROAD_RIGHT - ROAD_LEFT, HEIGHT);
    ctx.fillStyle = "rgba(255,255,255,.025)";
    ctx.fillRect(ROAD_LEFT + 3, 0, 5, HEIGHT);
    ctx.fillRect(ROAD_RIGHT - 8, 0, 5, HEIGHT);
    for (let lane = 1; lane < 3; lane++) {
      const x = ROAD_LEFT + LANE_WIDTH * lane;
      for (let y = -72 + (roadOffset % 112); y < HEIGHT; y += 112) {
        ctx.fillStyle = "rgba(239,244,235,.78)";
        ctx.fillRect(x - 2, y, 4, 53);
      }
    }
    drawDecorations();
  }

  function drawTree(x, y, scale) {
    ctx.fillStyle = "rgba(18,38,25,.25)";
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 10 * scale, 14 * scale, 7 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#704c32";
    ctx.fillRect(x - 2 * scale, y - 1 * scale, 4 * scale, 15 * scale);
    ctx.fillStyle = "#245335";
    ctx.beginPath();
    ctx.arc(x, y - 5 * scale, 13 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#347346";
    ctx.beginPath();
    ctx.arc(x - 4 * scale, y - 9 * scale, 8 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDecorations() {
    decorations.forEach((item) => {
      if (item.type === "tree") drawTree(item.x, item.y, item.scale);
      else {
        ctx.fillStyle = "#e7d8ac";
        ctx.fillRect(item.x - 2, item.y - 7, 4, 14);
        ctx.fillStyle = "#e87d61";
        ctx.fillRect(item.x - 7, item.y - 6, 14, 3);
      }
    });
  }

  function drawCar(x, y, color, isPlayer) {
    const w = isPlayer ? 48 : 46;
    const h = isPlayer ? 82 : 78;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(0,0,0,.25)";
    roundedRect(-w / 2 + 3, -h / 2 + 6, w, h, 11);
    ctx.fill();
    ctx.fillStyle = "#222a2b";
    roundedRect(-w / 2 - 3, -h / 2 + 13, 7, 20, 3); ctx.fill();
    roundedRect(w / 2 - 4, -h / 2 + 13, 7, 20, 3); ctx.fill();
    roundedRect(-w / 2 - 3, h / 2 - 32, 7, 20, 3); ctx.fill();
    roundedRect(w / 2 - 4, h / 2 - 32, 7, 20, 3); ctx.fill();
    const body = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    body.addColorStop(0, shade(color, -.18));
    body.addColorStop(.45, color);
    body.addColorStop(1, shade(color, -.1));
    ctx.fillStyle = body;
    roundedRect(-w / 2, -h / 2, w, h, 11);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.22)";
    roundedRect(-w / 2 + 5, -h / 2 + 7, w - 10, 4, 2);
    ctx.fill();
    ctx.fillStyle = isPlayer ? "#183d43" : "#263e43";
    roundedRect(-w / 2 + 7, -h / 2 + 19, w - 14, 22, 6);
    ctx.fill();
    ctx.fillStyle = "#a9d8da";
    ctx.globalAlpha = .68;
    roundedRect(-w / 2 + 9, -h / 2 + 21, w - 18, 8, 3);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#263e43";
    roundedRect(-w / 2 + 8, 5, w - 16, 20, 5);
    ctx.fill();
    ctx.fillStyle = isPlayer ? "#f5f2d2" : "#ff7466";
    roundedRect(-w / 2 + 5, isPlayer ? h / 2 - 8 : -h / 2 + 3, 10, 4, 2); ctx.fill();
    roundedRect(w / 2 - 15, isPlayer ? h / 2 - 8 : -h / 2 + 3, 10, 4, 2); ctx.fill();
    if (isPlayer) {
      ctx.fillStyle = "rgba(201,243,106,.45)";
      ctx.beginPath();
      ctx.ellipse(0, h / 2 + 8, 15, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#dfff92";
      ctx.fillRect(-2, -h / 2 + 11, 4, 41);
    }
    ctx.restore();
  }

  function shade(hex, amount) {
    const num = Number.parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + Math.round(255 * amount)));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 255) + Math.round(255 * amount)));
    const b = Math.max(0, Math.min(255, (num & 255) + Math.round(255 * amount)));
    return `rgb(${r},${g},${b})`;
  }

  function drawCoin(x, y, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.shadowColor = "rgba(255,207,75,.7)";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#ffc947";
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#fff0a5";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawEntities() {
    entities.forEach((entity) => {
      if (entity.type === "coin") drawCoin(entity.x, entity.y, entity.rotation);
      else drawCar(entity.x, entity.y, entity.color, false);
    });
    particles.forEach((particle) => {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    drawCar(playerX, PLAYER_Y, "#b8ee62", true);
  }

  function drawScene() {
    beginFrame();
    drawBackground();
    drawEntities();
    if (state === "menu") {
      ctx.fillStyle = "rgba(201,243,106,.75)";
      ctx.font = "500 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("3 LANES  /  ENDLESS ROAD", WIDTH / 2, HEIGHT - 25);
    }
  }

  function randomLane() {
    return Math.floor(Math.random() * LANES.length);
  }

  function spawnEnemy() {
    const lane = randomLane();
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    entities.push({ type: "enemy", lane, x: LANES[lane], y: -70, color, width: 44, height: 74 });
  }

  function spawnCoin() {
    const lane = randomLane();
    entities.push({ type: "coin", lane, x: LANES[lane], y: -25, rotation: 0, width: 24, height: 28 });
  }

  function spawnDecoration() {
    const side = Math.random() < .5 ? 1 : -1;
    const x = side < 0 ? 20 + Math.random() * 24 : 436 + Math.random() * 24;
    decorations.push({
      type: Math.random() < .76 ? "tree" : "sign",
      x,
      y: -30,
      scale: .68 + Math.random() * .5
    });
  }

  function collides(a, b) {
    return Math.abs(a.x - b.x) < (a.width + b.width) / 2
      && Math.abs(a.y - b.y) < (a.height + b.height) / 2;
  }

  function burst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 50 + Math.random() * 150;
      particles.push({
        x, y, color, size: 2 + Math.random() * 4,
        vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity,
        life: .45 + Math.random() * .45, maxLife: .9
      });
    }
  }

  function update(delta) {
    if (state !== "playing") return;
    elapsed += delta;
    speed = Math.min(650, 260 + elapsed * 8.5);
    roadOffset = (roadOffset + speed * delta) % 112;
    score = Math.floor(elapsed * (speed / 12));
    scoreText.textContent = String(score).padStart(5, "0");
    speedText.textContent = String(Math.round(speed * .48));
    playerX += (LANES[laneTarget] - playerX) * Math.min(1, delta * 13);

    if (steerDirection !== 0) {
      steerRepeat -= delta;
      if (steerRepeat <= 0) {
        moveLane(steerDirection);
        steerRepeat = .2;
      }
    }

    enemyTimer -= delta;
    coinTimer -= delta;
    decorTimer -= delta;
    if (enemyTimer <= 0) {
      spawnEnemy();
      enemyTimer = Math.max(.52, 1.22 - elapsed * .012) + Math.random() * .28;
    }
    if (coinTimer <= 0) {
      spawnCoin();
      coinTimer = 1.25 + Math.random() * 1.1;
    }
    if (decorTimer <= 0) {
      spawnDecoration();
      decorTimer = .52 + Math.random() * .42;
    }

    const movement = speed * delta;
    for (let i = entities.length - 1; i >= 0; i--) {
      const entity = entities[i];
      entity.y += movement * (entity.type === "coin" ? .92 : 1);
      if (entity.type === "coin") entity.rotation += delta * 2.8;
      if (entity.y > HEIGHT + 90) {
        entities.splice(i, 1);
        continue;
      }
      if (collides({ x: playerX, y: PLAYER_Y, ...PLAYER_HITBOX }, entity)) {
        if (entity.type === "coin") {
          coins++;
          coinsText.textContent = String(coins);
          burst(entity.x, entity.y, "#ffd253", 9);
          playTone(780, .09, "sine", .06);
          entities.splice(i, 1);
        } else {
          burst(playerX, PLAYER_Y, "#ff775e", 20);
          playTone(95, .38, "sawtooth", .13);
          endGame();
          return;
        }
      }
    }
    decorations.forEach((item) => { item.y += movement; });
    decorations = decorations.filter((item) => item.y < HEIGHT + 35);
    particles.forEach((particle) => {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.life -= delta;
    });
    particles = particles.filter((particle) => particle.life > 0);
  }

  function gameLoop(timestamp) {
    const delta = lastTime ? Math.min((timestamp - lastTime) / 1000, .05) : 0;
    lastTime = timestamp;
    update(delta);
    drawScene();
    requestAnimationFrame(gameLoop);
  }

  function setOverlay(mode) {
    overlay.classList.remove("is-hidden");
    resultRow.hidden = true;
    if (mode === "menu") {
      pauseButton.disabled = true;
      title.innerHTML = "NEON<br><span>HIGHWAY</span>";
      copy.textContent = "Dodge traffic. Grab coins. See how far you can go.";
      action.innerHTML = 'START GAME <span aria-hidden="true">→</span>';
      hint.textContent = "Use ← → or A / D to steer";
      action.onclick = startGame;
    } else if (mode === "paused") {
      pauseButton.disabled = false;
      title.innerHTML = "RACE<br><span>PAUSED</span>";
      copy.textContent = "Take a breather. The road will be waiting.";
      action.innerHTML = 'RESUME <span aria-hidden="true">→</span>';
      hint.textContent = "Press Space to resume";
      action.onclick = resumeGame;
    } else if (mode === "over") {
      pauseButton.disabled = true;
      title.innerHTML = "RACE<br><span>OVER</span>";
      copy.textContent = "The road got the better of you this time.";
      resultRow.hidden = false;
      finalScoreText.textContent = String(score);
      action.innerHTML = 'RACE AGAIN <span aria-hidden="true">→</span>';
      hint.textContent = `${coins} coin${coins === 1 ? "" : "s"} collected`;
      action.onclick = startGame;
    }
  }

  function hideOverlay() {
    overlay.classList.add("is-hidden");
  }

  function startGame() {
    playTone(420, .08, "triangle", .05);
    state = "playing";
    elapsed = 0;
    score = 0;
    coins = 0;
    speed = 260;
    enemyTimer = .75;
    coinTimer = 1.2;
    decorTimer = 0;
    laneTarget = 1;
    playerX = LANES[laneTarget];
    steerDirection = 0;
    entities = [];
    decorations = [];
    particles = [];
    scoreText.textContent = "00000";
    speedText.textContent = "125";
    coinsText.textContent = "0";
    pauseButton.disabled = false;
    hideOverlay();
  }

  function pauseGame() {
    if (state !== "playing") return;
    state = "paused";
    steerDirection = 0;
    setOverlay("paused");
  }

  function resumeGame() {
    if (state !== "paused") return;
    playTone(520, .07, "triangle", .04);
    state = "playing";
    hideOverlay();
  }

  function endGame() {
    state = "over";
    steerDirection = 0;
    pauseButton.disabled = true;
    if (score > bestScore) {
      bestScore = score;
      saveBestScore(bestScore);
      updateBestDisplay();
    }
    setOverlay("over");
  }

  function moveLane(direction) {
    if (state !== "playing") return;
    const next = Math.max(0, Math.min(LANES.length - 1, laneTarget + direction));
    if (next !== laneTarget) {
      laneTarget = next;
      playTone(260, .035, "sine", .018);
    }
  }

  function ensureAudio() {
    if (!soundOn) return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContext) audioContext = new AudioContextClass();
    if (audioContext.state === "suspended") audioContext.resume();
    return audioContext;
  }

  function playTone(frequency, duration, waveform, volume) {
    const audio = ensureAudio();
    if (!audio) return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  }

  function setSound(enabled) {
    soundOn = enabled;
    soundToggle.setAttribute("aria-pressed", String(soundOn));
    soundLabel.textContent = soundOn ? "Sound ON" : "Sound OFF";
    if (soundOn) playTone(540, .07, "sine", .04);
  }

  function onKeyDown(event) {
    const key = event.key.toLowerCase();
    if (["arrowleft", "arrowright", " ", "spacebar"].includes(key)) event.preventDefault();
    if (event.repeat) return;
    if (key === "arrowleft" || key === "a") moveLane(-1);
    if (key === "arrowright" || key === "d") moveLane(1);
    if (key === " " || key === "spacebar") {
      if (state === "playing") pauseGame();
      else if (state === "paused") resumeGame();
    }
  }

  function startSteering(direction) {
    if (state !== "playing") return;
    steerDirection = direction;
    steerRepeat = .24;
    moveLane(direction);
  }

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", (event) => {
    if (["arrowleft", "a", "arrowright", "d"].includes(event.key.toLowerCase())) {
      steerDirection = 0;
    }
  });
  window.addEventListener("blur", () => { if (state === "playing") pauseGame(); });
  window.addEventListener("resize", resizeCanvas);
  pauseButton.addEventListener("click", () => {
    if (state === "playing") {
      playTone(340, .06, "sine", .035);
      pauseGame();
    }
    else if (state === "paused") resumeGame();
  });
  soundToggle.addEventListener("click", () => {
    setSound(!soundOn);
  });

  [
    [document.getElementById("left-control"), -1],
    [document.getElementById("right-control"), 1]
  ].forEach(([button, direction]) => {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      startSteering(direction);
    });
    button.addEventListener("pointerup", () => { steerDirection = 0; });
    button.addEventListener("pointercancel", () => { steerDirection = 0; });
    button.addEventListener("lostpointercapture", () => { steerDirection = 0; });
  });

  canvas.addEventListener("pointerdown", (event) => {
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointerup", (event) => {
    if (pointerStartX === null || state !== "playing") return;
    const deltaX = event.clientX - pointerStartX;
    const deltaY = event.clientY - pointerStartY;
    if (Math.abs(deltaX) > 24 && Math.abs(deltaX) > Math.abs(deltaY)) moveLane(deltaX < 0 ? -1 : 1);
    pointerStartX = null;
    pointerStartY = null;
  });
  canvas.addEventListener("pointercancel", () => { pointerStartX = null; pointerStartY = null; });

  updateBestDisplay();
  resizeCanvas();
  setOverlay("menu");
  requestAnimationFrame(gameLoop);
})();