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
let currentEmotion = null;
let options = [];
let showFeedback = false;
let cameraActive = false;
let emotionDetected = '';

const emotions = [
    { name: "Feliz", color: "primary", gifUrl: "https://i.pinimg.com/originals/20/57/74/2057740a1b96ddb0b0a306b20cf4d666.gif" },
    { name: "Triste", color: "blue", gifUrl: "https://cdnl.iconscout.com/lottie/premium/thumb/nina-llorando-a-fuerza-5105643-4277861.gif" },
    { name: "Enojado", color: "red", gifUrl: "https://media.tenor.com/WYkqpAQVImkAAAAM/euphoria-boy.gif" },
];

const totalRounds = 3;

// ================== INICIALIZACIÓN ==================
document.addEventListener('DOMContentLoaded', () => {
    startNewRound();
});

// ================== RONDAS ==================
function startNewRound() {
    const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
    currentEmotion = randomEmotion;
    
    const wrongOptions = emotions.filter(e => e.name !== randomEmotion.name)
        .sort(() => Math.random() - 0.5);
    
    options = [randomEmotion, ...wrongOptions].sort(() => Math.random() - 0.5);
    showFeedback = false;
    emotionDetected = '';
    cameraActive = false;
    
    updateUI();
    loadGif();
}

function completeGame() {
    const emotionCard = document.querySelector('.emotion-card');
    emotionCard.innerHTML = `
        <h2>¡Juego Completado! 🎉</h2>
        <div style="font-size: 80px; margin: 30px 0;">😊</div>
        <div class="feedback correct">
            <p>Tu puntaje final: ${score} puntos</p>
            <p style="font-size: 16px; margin-top: 10px;">¡Excelente trabajo en comprensión emocional!</p>
        </div>
        <div class="options-container" style="margin-top: 30px;">
            <button class="option-button primary" onclick="location.reload()">
                <i class="fas fa-redo"></i> Jugar de Nuevo
            </button>
            <button class="option-button blue" onclick="goToMainPage()">
                <i class="fas fa-home"></i> Volver al Menú
            </button>
        </div>
    `;
}

// ================== GIF ==================
function loadGif() {
    const gifImg = document.getElementById('emotionGif');
    gifImg.src = currentEmotion.gifUrl;
}

// ================== INTERFAZ ==================
function updateUI() {
    document.getElementById('current-round').textContent = currentRound + 1;
    document.getElementById('total-rounds').textContent = totalRounds;
    document.getElementById('score').textContent = score + ' ' + gs('points', 'puntos');
    document.getElementById('score-display').textContent = score + ' ' + gs('points', 'puntos');
    
    const progress = ((currentRound + 1) / totalRounds) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';
    
    // Crear opciones
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    options.forEach(emotion => {
        const button = document.createElement('button');
        button.className = `option-button ${emotion.color}`;
        button.textContent = emotion.name;
        button.onclick = () => handleAnswer(emotion.name);
        optionsContainer.appendChild(button);
    });
    
    // Resetear secciones
    document.getElementById('feedback').classList.add('hidden');
    document.getElementById('simpleAnalysis').style.display = 'none';
    
    // Resetear cámara
    const startBtn = document.getElementById('startCameraBtn');
    startBtn.style.display = 'inline-block';
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
        
        // Mostrar análisis
        document.getElementById('simpleAnalysis').style.display = 'block';
        
        // Iniciar detección
        detectEmotion();
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

// ================== DETECCIÓN DE EMOCIÓN ==================
function detectEmotion() {
    if (!cameraActive) return;
    
    // Simulación de detección emocional
    const emotionsList = ['Feliz', 'Triste', 'Enojado'];
    const randomEmotion = emotionsList[Math.floor(Math.random() * emotionsList.length)];
    emotionDetected = randomEmotion;
    
    document.getElementById('emotionStatus').textContent = randomEmotion;
    
    // Continuar detectando cada segundo
    setTimeout(detectEmotion, 1000);
}

// ================== RESPUESTAS ==================
function handleAnswer(selectedName) {
    if (showFeedback) return;
    
    stopCamera();
    
    const isCorrect = selectedName === currentEmotion.name;
    const feedbackElement = document.getElementById('feedback');
    const feedbackText = document.getElementById('feedback-text');
    
    if (isCorrect) {
        score += 20;
        feedbackText.textContent = "¡Correcto! 🎉";
        feedbackElement.className = 'feedback correct';
    } else {
        feedbackText.textContent = `Era: ${currentEmotion.name}`;
        feedbackElement.className = 'feedback incorrect';
    }
    
    feedbackElement.classList.remove('hidden');
    showFeedback = true;
    
    document.getElementById('score').textContent = score + ' ' + gs('points', 'puntos');
    document.getElementById('score-display').textContent = score + ' ' + gs('points', 'puntos');
    
    // Desabilitar botones
    const buttons = document.querySelectorAll('.option-button');
    buttons.forEach(btn => btn.disabled = true);
    
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
