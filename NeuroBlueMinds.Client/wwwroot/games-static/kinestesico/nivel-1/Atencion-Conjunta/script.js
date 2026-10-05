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
let currentWord = null;
let cameraActive = false;
let movementInProgress = false;
let eyeGazeData = {
    gazeFollowing: 0,
    soundResponse: 0,
    attentionStability: 0,
    distractibility: 'Baja'
};

const words = [
    { word: "Mira", emoji: "👀", soundUrl: "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==" },
    { word: "Escucha", emoji: "👂", soundUrl: "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==" },
    { word: "Salta", emoji: "⬆️", soundUrl: "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==" },
    { word: "Sonríe", emoji: "😊", soundUrl: "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==" },
    { word: "Canta", emoji: "🎵", soundUrl: "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==" },
];

const totalRounds = 5;
let objectPosition = { x: 50, y: 50 };
let analysisInterval = null;

// ================== INICIALIZACIÓN ==================
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    startNewRound();
});

function setupEventListeners() {
    document.getElementById('start-button').addEventListener('click', startActivity);
    document.getElementById('listen-button').addEventListener('click', startSpeechRecognition);
    document.getElementById('moving-object').addEventListener('click', onObjectClicked);
}

// ================== RONDAS ==================
function startNewRound() {
    const randomWord = words[Math.floor(Math.random() * words.length)];
    currentWord = randomWord;
    movementInProgress = false;
    resetEyeGazeData();
    
    updateUI();
}

function completeGame() {
    const attentionCard = document.querySelector('.attention-card');
    attentionCard.innerHTML = `
        <h2>¡Actividad Completada! 🎉</h2>
        <div class="object-stage" style="display: flex; align-items: center; justify-content: center;">
            <div style="font-size: 80px; animation: bounce 1s ease-in-out infinite;">🌟</div>
        </div>
        <div class="feedback correct">
            <p style="font-size: 28px; margin: 20px 0;">Tu puntaje final: ${score} puntos</p>
            <p style="font-size: 16px;">¡Excelente atención conjunta e integración multisensorial!</p>
        </div>
        <div class="action-controls">
            <button class="action-button primary" onclick="location.reload()">
                <i class="fas fa-redo"></i> Jugar de Nuevo
            </button>
            <button class="action-button secondary" onclick="goToMainPage()">
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
    
    // Actualizar palabra y emoji
    document.getElementById('object-label').textContent = currentWord.emoji;
    
    // Resetear posición del objeto
    moveObjectToRandomPosition();
    
    // Resetear botones
    const startButton = document.getElementById('start-button');
    startButton.innerHTML = '<i class="fas fa-play"></i> Iniciar Actividad';
    startButton.disabled = false;
    
    // Ocultar secciones
    document.getElementById('analysisSection').style.display = 'none';
    document.getElementById('speechSection').style.display = 'none';
    document.getElementById('feedback').classList.add('hidden');
    document.getElementById('adaptationNotice').classList.add('hidden');
}

// ================== MOVIMIENTO DEL OBJETO ==================
function moveObjectToRandomPosition() {
    const stage = document.querySelector('.object-stage');
    const object = document.getElementById('moving-object');
    
    const maxX = stage.offsetWidth - object.offsetWidth;
    const maxY = stage.offsetHeight - object.offsetHeight;
    
    objectPosition.x = Math.random() * maxX;
    objectPosition.y = Math.random() * maxY;
    
    object.style.left = objectPosition.x + 'px';
    object.style.top = objectPosition.y + 'px';
    object.style.transform = 'translate(0, 0)';
}

function moveObjectAlongPath() {
    const stage = document.querySelector('.object-stage');
    const object = document.getElementById('moving-object');
    const positions = [
        { x: stage.offsetWidth * 0.2, y: stage.offsetHeight * 0.2 },
        { x: stage.offsetWidth * 0.8, y: stage.offsetHeight * 0.2 },
        { x: stage.offsetWidth * 0.8, y: stage.offsetHeight * 0.8 },
        { x: stage.offsetWidth * 0.2, y: stage.offsetHeight * 0.8 },
        { x: stage.offsetWidth * 0.5, y: stage.offsetHeight * 0.5 },
    ];
    
    let currentPositionIndex = 0;
    const moveInterval = setInterval(() => {
        if (currentPositionIndex >= positions.length || !movementInProgress) {
            clearInterval(moveInterval);
            return;
        }
        
        const pos = positions[currentPositionIndex];
        object.style.left = pos.x + 'px';
        object.style.top = pos.y + 'px';
        currentPositionIndex++;
    }, 600);
}

function onObjectClicked() {
    if (movementInProgress) {
        score += 10;
        document.getElementById('score').textContent = score + ' ' + gs('points', 'puntos');
        document.getElementById('score-display').textContent = score + ' ' + gs('points', 'puntos');
    }
}

// ================== ACTIVIDAD PRINCIPAL ==================
async function startActivity() {
    if (movementInProgress) return;
    
    movementInProgress = true;
    const startButton = document.getElementById('start-button');
    startButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> En progreso...';
    startButton.disabled = true;
    
    // Mostrar análisis
    document.getElementById('analysisSection').style.display = 'block';
    
    // Reproducir sonido
    playWordSound();
    
    // Mover objeto
    moveObjectAlongPath();
    
    // Iniciar análisis de gaze si cámara está activa
    if (cameraActive) {
        startEyeTrackingAnalysis();
    }
    
    // Duración de la actividad
    setTimeout(() => {
        movementInProgress = false;
        
        // Mostrar sección de speech
        document.getElementById('speechSection').style.display = 'block';
        
        startButton.innerHTML = '<i class="fas fa-redo"></i> Repetir';
        startButton.disabled = false;
    }, 4000);
}

function playWordSound() {
    const utterance = new SpeechSynthesisUtterance(currentWord.word);
    utterance.lang = 'es-ES';
    utterance.rate = 1;
    utterance.pitch = 1.2;
    utterance.volume = 1;
    speechSynthesis.speak(utterance);
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
    
    if (analysisInterval) clearInterval(analysisInterval);
}

// ================== ANÁLISIS DE SEGUIMIENTO VISUAL ==================
function startEyeTrackingAnalysis() {
    const gazePoint = document.getElementById('gazePoint');
    
    analysisInterval = setInterval(() => {
        if (!movementInProgress) {
            gazePoint.style.display = 'none';
            return;
        }
        
        // Simulación de seguimiento ocular
        const objectElement = document.getElementById('moving-object');
        const stage = document.querySelector('.object-stage');
        const stageRect = stage.getBoundingClientRect();
        const objectRect = objectElement.getBoundingClientRect();
        
        const objectCenterX = objectRect.left - stageRect.left + objectRect.width / 2;
        const objectCenterY = objectRect.top - stageRect.top + objectRect.height / 2;
        
        // Simular gaze con variación
        const gazeX = objectCenterX + (Math.random() - 0.5) * 80;
        const gazeY = objectCenterY + (Math.random() - 0.5) * 80;
        
        gazePoint.style.left = gazeX + 'px';
        gazePoint.style.top = gazeY + 'px';
        gazePoint.style.display = 'block';
        
        updateEyeTrackingMetrics(objectCenterX, objectCenterY, gazeX, gazeY);
    }, 500);
}

function updateEyeTrackingMetrics(targetX, targetY, gazeX, gazeY) {
    // Calcular distancia entre mirada y objeto
    const distance = Math.sqrt(Math.pow(targetX - gazeX, 2) + Math.pow(targetY - gazeY, 2));
    const maxDistance = 200;
    const gazeFollowing = Math.max(0, 100 - (distance / maxDistance) * 100);
    
    eyeGazeData.gazeFollowing = Math.round(gazeFollowing);
    eyeGazeData.soundResponse = Math.round(75 + Math.random() * 25);
    eyeGazeData.attentionStability = Math.round(70 + Math.random() * 30);
    eyeGazeData.distractibility = eyeGazeData.attentionStability > 75 ? 'Baja' : 'Media';
    
    // Actualizar visualización
    document.getElementById('gazeFollowing').textContent = eyeGazeData.gazeFollowing + '%';
    document.getElementById('gazeFollowingProgress').style.width = eyeGazeData.gazeFollowing + '%';
    
    document.getElementById('soundResponse').textContent = eyeGazeData.soundResponse + '%';
    document.getElementById('soundResponseProgress').style.width = eyeGazeData.soundResponse + '%';
    
    document.getElementById('attentionStability').textContent = eyeGazeData.attentionStability + '%';
    document.getElementById('attentionStabilityProgress').style.width = eyeGazeData.attentionStability + '%';
    
    document.getElementById('distractibility').textContent = eyeGazeData.distractibility;
    
    // Verificar adaptación
    checkAdaptation();
}

function checkAdaptation() {
    const notice = document.getElementById('adaptationNotice');
    const text = document.getElementById('adaptationText');
    
    if (eyeGazeData.gazeFollowing < 50) {
        notice.classList.remove('hidden');
        text.textContent = '💡 Aumentando contraste visual para mejor seguimiento...';
    } else if (eyeGazeData.attentionStability < 60) {
        notice.classList.remove('hidden');
        text.textContent = '🎵 Usando sonidos más claros para mejor respuesta auditiva...';
    } else {
        notice.classList.add('hidden');
    }
}

function resetEyeGazeData() {
    eyeGazeData = {
        gazeFollowing: 0,
        soundResponse: 0,
        attentionStability: 0,
        distractibility: 'Baja'
    };
}

// ================== RECONOCIMIENTO DE VOZ ==================
async function startSpeechRecognition() {
    const listenButton = document.getElementById('listen-button');
    listenButton.disabled = true;
    listenButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Escuchando...';
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        showSpeechFeedback('Tu navegador no soporta reconocimiento de voz', false);
        listenButton.disabled = false;
        listenButton.innerHTML = '<i class="fas fa-microphone"></i> Escuchar';
        return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => {
        console.log('Escuchando...');
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        const targetWord = currentWord.word.toLowerCase();
        
        const isSimilar = transcript.includes(targetWord) || targetWord.includes(transcript);
        
        if (isSimilar) {
            score += 20;
            showSpeechFeedback('¡Excelente! 🎉 Repetiste bien la palabra', true);
        } else {
            showSpeechFeedback(`Escuchamos: "${transcript}". Intenta de nuevo`, false);
        }
        
        document.getElementById('score').textContent = score + ' ' + gs('points', 'puntos');
        document.getElementById('score-display').textContent = score + ' ' + gs('points', 'puntos');
        
        listenButton.disabled = false;
        listenButton.innerHTML = '<i class="fas fa-microphone"></i> Escuchar';
    };
    
    recognition.onerror = (event) => {
        showSpeechFeedback('Error en el reconocimiento de voz', false);
        listenButton.disabled = false;
        listenButton.innerHTML = '<i class="fas fa-microphone"></i> Escuchar';
    };
    
    recognition.start();
    
    // Timeout de 5 segundos
    setTimeout(() => {
        if (listenButton.disabled) {
            recognition.stop();
        }
    }, 5000);
}

function showSpeechFeedback(message, isCorrect) {
    const feedback = document.getElementById('speech-feedback');
    const feedbackText = document.getElementById('speech-text');
    
    feedbackText.textContent = message;
    feedback.className = isCorrect ? 'speech-feedback correct' : 'speech-feedback incorrect';
    feedback.classList.remove('hidden');
    
    if (isCorrect) {
        setTimeout(() => {
            if (currentRound + 1 >= totalRounds) {
                completeGame();
            } else {
                currentRound++;
                startNewRound();
            }
        }, 2000);
    }
}

// ================== NAVEGACIÓN ==================
function goToMainPage() {
    if (cameraActive) stopCamera();
    window.location.href = 'https://plekdev.github.io/BlueMinds/selectores/selector-kinestesico.html';
}
