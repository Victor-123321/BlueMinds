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
let videoSpeed = 1;
let cameraActive = false;
let movementAnalysisData = {
    bodyImitation: 0,
    facialExpression: 0,
    energyLevel: 'Neutral',
    emotionalUnderstanding: 0
};

const emotions = [
    { name: "Feliz", color: "primary", videoUrl: "https://i.pinimg.com/originals/20/57/74/2057740a1b96ddb0b0a306b20cf4d666.gif" },
    { name: "Triste", color: "blue", videoUrl: "https://cdnl.iconscout.com/lottie/premium/thumb/nina-llorando-a-fuerza-5105643-4277861.gif" },
    { name: "Enojado", color: "red", videoUrl: "https://media.tenor.com/WYkqpAQVImkAAAAM/euphoria-boy.gif" },
    { name: "Asustado", color: "purple", videoUrl: "https://media.tenor.com/azK-UXf7o5cAAAAM/anime-scream.gif" },
    { name: "Sorprendido", color: "accent", videoUrl: "https://cdn-icons-gif.flaticon.com/11175/11175756.gif" },
];

const totalRounds = 5;

// ================== INICIALIZACIÓN ==================
document.addEventListener('DOMContentLoaded', () => {
    startNewRound();
});

// ================== RONDAS ==================
function startNewRound() {
    const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
    currentEmotion = randomEmotion;
    
    const wrongOptions = emotions.filter(e => e.name !== randomEmotion.name)
        .sort(() => Math.random() - 0.5)
        .slice(0, 2);
    
    options = [randomEmotion, ...wrongOptions].sort(() => Math.random() - 0.5);
    showFeedback = false;
    videoSpeed = 1;
    resetAnalysis();
    
    updateUI();
    loadEmotionVideo();
}

function completeGame() {
    const emotionCard = document.querySelector('.emotion-card');
    emotionCard.innerHTML = `
        <h2>¡Juego Completado!</h2>
        <div style="font-size: 80px; margin: 20px 0;">🎉</div>
        <div class="feedback correct">
            <p>Tu puntaje final: ${score} puntos</p>
            <p style="font-size: 16px; margin-top: 10px;">¡Excelente trabajo en comprensión y expresión emocional!</p>
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

// ================== VIDEO ==================
function loadEmotionVideo() {
    const placeholder = document.querySelector('.video-placeholder');
    
    const gifImage = document.createElement('img');
    gifImage.src = currentEmotion.videoUrl;
    gifImage.style.width = '100%';
    gifImage.style.height = 'auto';
    gifImage.style.maxHeight = '300px';
    gifImage.style.objectFit = 'contain';
    
    placeholder.innerHTML = '';
    placeholder.appendChild(gifImage);
}

// ================== INTERFAZ ==================
function updateUI() {
    document.getElementById('current-round').textContent = currentRound + 1;
    document.getElementById('total-rounds').textContent = totalRounds;
    document.getElementById('score').textContent = score + ' ' + gs('points', 'puntos');
    document.getElementById('score-display').textContent = score + ' ' + gs('points', 'puntos');
    
    const progress = ((currentRound + 1) / totalRounds) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';
    
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    options.forEach(emotion => {
        const button = document.createElement('button');
        button.className = `option-button ${emotion.color}`;
        button.textContent = emotion.name;
        button.onclick = () => handleAnswer(emotion.name);
        optionsContainer.appendChild(button);
    });
    
    document.getElementById('feedback').classList.add('hidden');
    document.getElementById('aiAnalysis').style.display = 'none';
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
    
    const simulatedAnalysis = {
        bodyImitation: Math.floor(Math.random() * 100),
        facialExpression: Math.floor(Math.random() * 100),
        energyLevel: ['Bajo', gs('medium','Medio'), 'Alto'][Math.floor(Math.random() * 3)],
        emotionalUnderstanding: Math.floor(Math.random() * 100)
    };
    
    movementAnalysisData = simulatedAnalysis;
    
    document.getElementById('bodyImitation').textContent = simulatedAnalysis.bodyImitation + '%';
    document.getElementById('facialExpression').textContent = simulatedAnalysis.facialExpression + '%';
    document.getElementById('energyLevel').textContent = simulatedAnalysis.energyLevel;
    document.getElementById('emotionalUnderstanding').textContent = simulatedAnalysis.emotionalUnderstanding + '%';
    
    checkAdaptation();
    
    setTimeout(analyzeMovement, 1000);
}

function checkAdaptation() {
    const notice = document.getElementById('adaptationNotice');
    const text = document.getElementById('adaptationText');
    
    if (movementAnalysisData.bodyImitation < 40) {
        notice.classList.remove('hidden');
        text.textContent = gs('move_more','¡Muévete un poco más!');
        reduceVideoSpeed();
    } else if (movementAnalysisData.emotionalUnderstanding < 50) {
        notice.classList.remove('hidden');
        text.textContent = gs('complex_emotion','Aquí una versión más simple...');
    } else {
        notice.classList.add('hidden');
    }
}

function reduceVideoSpeed() {
    // Los GIFs no se pueden ralentizar directamente, pero podemos mostrar una notificación
    // En una implementación real, podrías usar una librería para controlar GIFs
}

function resetAnalysis() {
    movementAnalysisData = {
        bodyImitation: 0,
        facialExpression: 0,
        energyLevel: 'Neutral',
        emotionalUnderstanding: 0
    };
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
        feedbackText.textContent = gs('emotion_correct','¡Correcto! 🎉');
        feedbackElement.className = 'feedback correct';
    } else {
        feedbackText.textContent = `No es correcto. Era: ${currentEmotion.name}`;
        feedbackElement.className = 'feedback incorrect';
    }
    
    feedbackElement.classList.remove('hidden');
    showFeedback = true;
    
    document.getElementById('score').textContent = score + ' ' + gs('points', 'puntos');
    document.getElementById('score-display').textContent = score + ' ' + gs('points', 'puntos');
    
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
