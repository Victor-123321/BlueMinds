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
let movementDetected = 0;

const movements = [
    { 
        name: "Levanta los brazos", 
        instruction: "levanta los brazos hacia arriba",
        animation: "raise-arms",
    },
    { 
        name: "Baja los brazos", 
        instruction: "baja los brazos hacia abajo",
        animation: "lower-arms",
    },
    { 
        name: "Salta", 
        instruction: "salta hacia arriba",
        animation: "jump",
    },
    { 
        name: "Celebra", 
        instruction: "celebra con alegría",
        animation: "celebrate",
    },
];

const totalRounds = 3;

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
    movementDetected = 0;
    
    updateUI();
}

function completeGame() {
    const movementCard = document.querySelector('.movement-card');
    movementCard.innerHTML = `
        <h2>¡Actividad Completada! 🎉</h2>
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
            <p style="font-size: 16px;">¡Excelente coordinación motora!</p>
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
    
    // Resetear botones
    const playButton = document.getElementById('play-button');
    playButton.innerHTML = '<i class="fas fa-play"></i> Mostrar Movimiento';
    playButton.disabled = false;
    
    const doneButton = document.getElementById('done-button');
    doneButton.disabled = true;
    
    // Ocultar feedback y análisis
    document.getElementById('feedback').classList.add('hidden');
    document.getElementById('simpleAnalysis').style.display = 'none';
}

// ================== MOSTRAR MOVIMIENTO ==================
function showMovement() {
    if (isShowingMovement) return;
    
    isShowingMovement = true;
    hasPlayed = true;
    
    const playButton = document.getElementById('play-button');
    playButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mostrando...';
    playButton.disabled = true;
    
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
    const animationDuration = 2000;
    
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
        document.getElementById('simpleAnalysis').style.display = 'block';
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
    
    // Simulación de detección de movimiento
    movementDetected = Math.floor(50 + Math.random() * 50);
    
    document.getElementById('movementDetected').textContent = movementDetected + '%';
    
    setTimeout(analyzeMovement, 1500);
}

// ================== RESPUESTAS ==================
function completeMovement() {
    if (!hasPlayed) return;
    
    stopCamera();
    
    // Validación basada en detección
    let isCorrect = movementDetected > 60;
    
    const feedbackElement = document.getElementById('feedback');
    const feedbackText = document.getElementById('feedback-text');
    
    if (isCorrect) {
        score += 20;
        feedbackText.textContent = "¡Excelente! 🎉 Muy bien ejecutado";
        feedbackElement.className = 'feedback correct';
    } else {
        feedbackText.textContent = "Casi, intenta nuevamente";
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
    }, 2000);
}

// ================== NAVEGACIÓN ==================
function goToMainPage() {
    if (cameraActive) stopCamera();
    window.location.href = 'https://plekdev.github.io/BlueMinds/selectores/selector-kinestesico.html';
}
