// ── BlueMinds i18n bridge ─────────────────────────────────────────────────────
var _s = {}; // locale strings
window.addEventListener("message", function(e) {
  if (e.data && e.data.type === "SET_LOCALE") {
    _s = e.data.strings || {};
    if (typeof applyLocale === "function") applyLocale();
  }
});
// gs(key, fallback) — get localized string
function gs(key, fallback) { return _s[key] !== undefined ? _s[key] : (fallback || key); }
// gsf(key, ...args) — get localized string with {0},{1} substitution
function gsf(key, fallback) {
  var tpl = gs(key, fallback);
  for (var i = 2; i < arguments.length; i++) tpl = tpl.replace("{" + (i-2) + "}", arguments[i]);
  return tpl;
}
// ─────────────────────────────────────────────────────────────────────────────

// Variables globales
let currentRound = 0;
let score = 0;
let currentMovement = null;
let isShowingMovement = false;
let hasPlayed = false;
let cameraActive = false;
let difficulty = 1; // 1-3 stars
let movementAnalysisData = {
    movementQuality: 0,
    armAmplitude: 0,
    latency: 0,
    coordination: 0
};

const movements = [
    { 
        name: "Levanta los brazos", 
        instruction: "levanta los brazos hacia arriba",
        animation: "raise-arms",
        color: "primary",
        difficulty: 1,
        guide: {
            hands: "Sube los brazos hasta la cabeza",
            body: "Mantén el cuerpo recto",
            movement: "Movimiento lento y controlado"
        }
    },
    { 
        name: "Baja los brazos", 
        instruction: "baja los brazos hacia abajo",
        animation: "lower-arms",
        color: "blue",
        difficulty: 1,
        guide: {
            hands: "Baja los brazos al costado",
            body: "Mantén el cuerpo recto",
            movement: "Movimiento suave"
        }
    },
    { 
        name: "Salta", 
        instruction: "salta hacia arriba",
        animation: "jump",
        color: "red",
        difficulty: 2,
        guide: {
            hands: "Los brazos se mueven con el cuerpo",
            body: "Flexiona las rodillas",
            movement: "Salto dinámico"
        }
    },
    { 
        name: "Gira a la derecha", 
        instruction: "gira el cuerpo a la derecha",
        animation: "turn-right",
        color: "purple",
        difficulty: 2,
        guide: {
            hands: "Brazos naturales",
            body: "Gira todo el cuerpo",
            movement: "Rotación completa"
        }
    },
    { 
        name: "Agáchate", 
        instruction: "agáchate hacia abajo",
        animation: "squat",
        color: "accent",
        difficulty: 3,
        guide: {
            hands: "Brazos hacia adelante o costados",
            body: "Flexiona las rodillas profundamente",
            movement: "Movimiento controlado"
        }
    },
    { 
        name: "Saluda", 
        instruction: "saluda con la mano",
        animation: "wave",
        color: "primary",
        difficulty: 1,
        guide: {
            hands: "Mueve la mano de arriba a abajo",
            body: "Mantén el cuerpo estable",
            movement: "Movimiento suave y amistoso"
        }
    },
];

const totalRounds = 5;

// ================== INICIALIZACIÓN ==================
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    startNewRound();
});

function setupEventListeners() {
    document.getElementById('play-button').addEventListener('click', showMovement);
    document.getElementById('done-button').addEventListener('click', completeMovement);
}

// ================== RONDAS ==================
function startNewRound() {
    const randomMovement = movements[Math.floor(Math.random() * movements.length)];
    currentMovement = randomMovement;
    hasPlayed = false;
    isShowingMovement = false;
    resetAnalysis();
    
    updateUI();
}

function completeGame() {
    const movementCard = document.querySelector('.movement-card');
    movementCard.innerHTML = `
        <h2>¡Juego Completado! 🎉</h2>
        <div class="avatar-container">
            <div id="avatar-celebrate" class="avatar celebrate">
                <div class="avatar-head"></div>
                <div class="avatar-body">
                    <div class="avatar-arm avatar-arm-left"></div>
                    <div class="avatar-arm avatar-arm-right"></div>
                    <div class="avatar-leg avatar-leg-left"></div>
                    <div class="avatar-leg avatar-leg-right"></div>
                </div>
            </div>
        </div>
        <div class="feedback correct">
            <p style="font-size: 28px; margin: 20px 0;">Tu puntaje final: ${score} puntos</p>
            <p style="font-size: 16px;">¡Excelente coordinación motora e imitación!</p>
        </div>
        <div class="action-controls">
            <button class="action-button primary" onclick="location.reload()">
                <i class="fas fa-redo"></i> Jugar de Nuevo
            </button>
            <button class="action-button blue" onclick="goToMainPage()">
                <i class="fas fa-home"></i> Volver al Menú
            </button>
        </div>
    `;
}

// ================== INTERFAZ ==================
function updateUI() {
    document.getElementById('current-round').textContent = currentRound + 1;
    document.getElementById('total-rounds').textContent = totalRounds;
    document.getElementById('score').textContent = score + ' ' + gs('points', 'puntos');
    document.getElementById('score-display').textContent = score + ' ' + gs('points', 'puntos');
    
    const progress = ((currentRound + 1) / totalRounds) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';
    
    // Resetear avatar
    const avatar = document.getElementById('avatar-leader');
    avatar.className = 'avatar leader';
    
    // Actualizar instrucción
    document.getElementById('instruction-text').textContent = "Escucha la instrucción";
    
    // Actualizar dificultad
    updateDifficultyDisplay();
    
    // Actualizar guía visual
    updateVisualGuide();
    
    // Resetear botones
    const playButton = document.getElementById('play-button');
    playButton.innerHTML = '<i class="fas fa-play"></i> Mostrar Movimiento';
    playButton.disabled = false;
    
    const doneButton = document.getElementById('done-button');
    doneButton.disabled = true;
    
    // Ocultar feedback y análisis
    document.getElementById('feedback').classList.add('hidden');
    document.getElementById('aiAnalysis').style.display = 'none';
    document.getElementById('adaptationNotice').classList.add('hidden');
}

function updateDifficultyDisplay() {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < currentMovement.difficulty) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

function updateVisualGuide() {
    document.getElementById('guide-hands').textContent = currentMovement.guide.hands;
    document.getElementById('guide-body').textContent = currentMovement.guide.body;
    document.getElementById('guide-movement').textContent = currentMovement.guide.movement;
    
    // Mostrar guía si la dificultad es alta
    const guide = document.getElementById('visual-guide');
    if (currentMovement.difficulty >= 2) {
        guide.classList.remove('hidden');
    } else {
        guide.classList.add('hidden');
    }
}

// ================== MOSTRAR MOVIMIENTO ==================
function showMovement() {
    if (isShowingMovement) return;
    
    isShowingMovement = true;
    hasPlayed = true;
    
    const playButton = document.getElementById('play-button');
    playButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mostrando...';
    playButton.disabled = true;
    
    const repeatButton = document.getElementById('repeat-button');
    repeatButton.style.display = 'none';
    
    // Mostrar instrucción
    document.getElementById('instruction-text').textContent = currentMovement.name;
    
    // Aplicar animación al avatar
    const avatar = document.getElementById('avatar-leader');
    avatar.classList.add(currentMovement.animation);
    
    // Reproducir instrucción de audio
    const utterance = new SpeechSynthesisUtterance(currentMovement.instruction);
    utterance.lang = 'es-ES';
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
    
    // Duración de la animación
    const animationDuration = currentMovement.animation === 'jump' || 
                               currentMovement.animation === 'squat' ? 3000 : 2000;
    
    setTimeout(() => {
        playButton.innerHTML = '<i class="fas fa-redo"></i> Repetir';
        playButton.disabled = false;
        
        const doneButton = document.getElementById('done-button');
        doneButton.disabled = false;
        
        isShowingMovement = false;
    }, animationDuration);
}

// ================== CÁMARA ==================
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        
        const video = document.getElementById('cameraFeed');
        video.srcObject = stream;
        video.style.display = 'block';
        document.getElementById('cameraPlaceholder').style.display = 'none';
        document.getElementById('startCameraBtn').style.display = 'none';
        document.getElementById('stopCameraBtn').style.display = 'inline-block';
        
        cameraActive = true;
        video.play();
        
        // Iniciar análisis
        analyzeMovement();
        document.getElementById('aiAnalysis').style.display = 'block';
    } catch (err) {
        alert('No se pudo acceder a la cámara: ' + err.message);
    }
}

function stopCamera() {
    const video = document.getElementById('cameraFeed');
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
    video.style.display = 'none';
    document.getElementById('cameraPlaceholder').style.display = 'flex';
    document.getElementById('startCameraBtn').style.display = 'inline-block';
    document.getElementById('stopCameraBtn').style.display = 'none';
    cameraActive = false;
}

// ================== ANÁLISIS DE MOVIMIENTO ==================
function analyzeMovement() {
    if (!cameraActive) return;
    
    // Simulación de análisis (en producción se usaría TensorFlow.js o similar)
    const simulatedAnalysis = {
        movementQuality: Math.floor(60 + Math.random() * 40),
        armAmplitude: Math.floor(65 + Math.random() * 35),
        latency: Math.floor(200 + Math.random() * 300),
        coordination: Math.floor(55 + Math.random() * 45)
    };
    
    movementAnalysisData = simulatedAnalysis;
    
    document.getElementById('movementQuality').textContent = simulatedAnalysis.movementQuality + '%';
    document.getElementById('armAmplitude').textContent = simulatedAnalysis.armAmplitude + '%';
    document.getElementById('latency').textContent = simulatedAnalysis.latency;
    document.getElementById('coordination').textContent = simulatedAnalysis.coordination + '%';
    
    checkAdaptation();
    
    setTimeout(analyzeMovement, 1500);
}

function checkAdaptation() {
    const notice = document.getElementById('adaptationNotice');
    const text = document.getElementById('adaptationText');
    const quality = movementAnalysisData.movementQuality;
    const coordination = movementAnalysisData.coordination;
    
    let shouldAdapt = false;
    
    if (quality < 40) {
        notice.classList.remove('hidden');
        text.textContent = '⚠️ Intenta hacer el movimiento más claramente. Muévete un poco más lentamente.';
        shouldAdapt = true;
    } else if (coordination < 35) {
        notice.classList.remove('hidden');
        text.textContent = '💡 Parece que el movimiento es complejo. Te mostraré una versión simplificada...';
        shouldAdapt = true;
    } else if (quality < 60) {
        notice.classList.remove('hidden');
        text.textContent = '👍 ¡Vas bien! Trata de hacer el movimiento con más amplitud.';
        shouldAdapt = true;
    } else {
        notice.classList.add('hidden');
    }
    
    // Adaptar dificultad
    if (shouldAdapt && difficulty > 1) {
        reduceDifficulty();
    }
}

function reduceDifficulty() {
    if (difficulty > 1) {
        difficulty--;
        console.log('Dificultad reducida a:', difficulty);
    }
}

function resetAnalysis() {
    movementAnalysisData = {
        movementQuality: 0,
        armAmplitude: 0,
        latency: 0,
        coordination: 0
    };
}

// ================== RESPUESTAS ==================
function completeMovement() {
    if (!hasPlayed) return;
    
    stopCamera();
    
    // Validación mejorada basada en análisis
    let isCorrect = false;
    
    if (cameraActive || movementAnalysisData.movementQuality > 0) {
        // Si la cámara estuvo activa, usar análisis
        const qualityScore = (
            movementAnalysisData.movementQuality + 
            movementAnalysisData.coordination + 
            movementAnalysisData.armAmplitude
        ) / 3;
        
        isCorrect = qualityScore > 65;
    } else {
        // Validación por defecto
        isCorrect = Math.random() > 0.3;
    }
    
    const feedbackElement = document.getElementById('feedback');
    const feedbackText = document.getElementById('feedback-text');
    
    if (isCorrect) {
        score += (20 * difficulty); // Más puntos por mayor dificultad
        feedbackText.textContent = "¡Excelente imitación! 🎉 Muy buena coordinación";
        feedbackElement.className = 'feedback correct';
    } else {
        feedbackText.textContent = "Muy cerca, intenta nuevamente con más precisión";
        feedbackElement.className = 'feedback incorrect';
    }
    
    feedbackElement.classList.remove('hidden');
    
    document.getElementById('score').textContent = score + ' ' + gs('points', 'puntos');
    document.getElementById('score-display').textContent = score + ' ' + gs('points', 'puntos');
    
    // Deshabilitar botones
    document.getElementById('play-button').disabled = true;
    document.getElementById('done-button').disabled = true;
    
    setTimeout(() => {
        if (currentRound + 1 >= totalRounds) {
            completeGame();
        } else {
            currentRound++;
            startNewRound();
        }
    }, 2500);
}

// ================== NAVEGACIÓN ==================
function goToMainPage() {
    window.location.href = 'https://plekdev.github.io/BlueMinds/selectores/selector-kinestesico.html';
}
