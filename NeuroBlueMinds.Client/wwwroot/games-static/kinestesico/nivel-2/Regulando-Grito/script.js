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
let cameraActive = false;
let breathingActive = false;
let analysisActive = false;
let anxietyLevel = 0; // 0-100
let breathingDuration = 4; // segundos (adapta entre 4-6)
let regulationAnalysis = {
    voiceVolume: 0,
    breathRate: 0,
    detectedAnxiety: 'Bajo',
    selfControl: 0
};

const totalRounds = 3;
let analysisInterval = null;
let breathingPhase = 0; // 0: inhale, 1: hold, 2: exhale, 3: hold
const breathingPhases = ['Inhala', 'Mantén', 'Exhala', 'Mantén'];
const breathingDurations = [4, 4, 4, 4]; // segundos para cada fase

// ================== INICIALIZACIÓN ==================
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    startNewRound();
});

function setupEventListeners() {
    document.getElementById('angryBtn').addEventListener('click', () => selectCharacter('angry'));
    document.getElementById('calmBtn').addEventListener('click', () => selectCharacter('calm'));
    document.getElementById('continue-button').addEventListener('click', continueToNextRound);
}

// ================== RONDAS ==================
function startNewRound() {
    anxietyLevel = 20 + Math.random() * 30; // 20-50% inicial
    breathingDuration = 4;
    resetAnalysis();
    
    // Mostrar personajes
    document.getElementById('angryBtn').disabled = false;
    document.getElementById('calmBtn').disabled = false;
    document.getElementById('feedback').classList.add('hidden');
    document.getElementById('continue-button').style.display = 'none';
    
    updateUI();
}

function completeGame() {
    const regulationCard = document.querySelector('.regulation-card');
    regulationCard.innerHTML = `
        <h2>¡Actividad Completada! 🎉</h2>
        <div style="text-align: center; margin: 30px 0;">
            <div style="font-size: 100px; margin-bottom: 20px;">😌</div>
            <div style="font-size: 80px;">🌿</div>
        </div>
        <div class="feedback correct">
            <p style="font-size: 28px; margin: 20px 0;">Tu puntaje final: ${score} puntos</p>
            <p style="font-size: 16px;">¡Excelente regulación emocional y autocontrol!</p>
        </div>
        <div class="action-controls">
            <button class="action-button primary" onclick="location.reload()">
                <i class="fas fa-redo"></i> Jugar de Nuevo
            </button>
            <button class="action-button primary" onclick="goToMainPage()">
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
    
    // Actualizar indicador de ansiedad
    updateAnxietyIndicator();
    
    // Resetear secciones
    document.getElementById('breathingGuide').style.display = 'none';
    document.getElementById('analysisSection').style.display = 'none';
    document.getElementById('cameraSection').style.display = 'none';
}

function updateAnxietyIndicator() {
    const percentage = Math.min(100, anxietyLevel);
    document.getElementById('anxietyBar').style.width = percentage + '%';
    
    let level = 'Bajo';
    if (percentage > 70) level = 'Alto';
    else if (percentage > 40) level = gs('medium','Medio');
    
    document.getElementById('anxietyLevel').textContent = level;
}

// ================== SELECCIÓN DE PERSONAJE ==================
function selectCharacter(choice) {
    const isCorrect = choice === 'calm';
    
    document.getElementById('angryBtn').disabled = true;
    document.getElementById('calmBtn').disabled = true;
    
    const feedbackElement = document.getElementById('feedback');
    const feedbackText = document.getElementById('feedback-text');
    
    if (isCorrect) {
        score += 10;
        feedbackText.textContent = '¡Correcto! Este niño está calmado. 😊';
        feedbackElement.className = 'feedback correct';
        
        // Mostrar guía de respiración
        setTimeout(() => {
            startBreathingGuide();
        }, 500);
    } else {
        feedbackText.textContent = 'No, ese niño está enojado. Intenta con el otro. 😠';
        feedbackElement.className = 'feedback incorrect';
        
        // Permitir reintentar
        setTimeout(() => {
            document.getElementById('angryBtn').disabled = false;
            document.getElementById('calmBtn').disabled = false;
        }, 2000);
    }
    
    feedbackElement.classList.remove('hidden');
    document.getElementById('score').textContent = score + ' ' + gs('points', 'puntos');
    document.getElementById('score-display').textContent = score + ' ' + gs('points', 'puntos');
}

// ================== GUÍA DE RESPIRACIÓN ==================
function startBreathingGuide() {
    document.getElementById('breathingGuide').style.display = 'block';
    document.getElementById('analysisSection').style.display = 'block';
    document.getElementById('cameraSection').style.display = 'block';
    
    breathingActive = true;
    analysisActive = true;
    
    // Iniciar ciclo de respiración
    performBreathingCycle();
}

async function performBreathingCycle() {
    const cycles = 3; // 3 ciclos de respiración
    
    for (let cycle = 0; cycle < cycles; cycle++) {
        for (let phase = 0; phase < 4; phase++) {
            if (!breathingActive) return;
            
            const phaseText = breathingPhases[phase];
            const phaseDuration = breathingDurations[phase];
            
            document.getElementById('breathInstruction').textContent = phaseText;
            document.getElementById('breathDuration').textContent = `${phaseText}: ${phaseDuration} segundos`;
            
            // Iniciar análisis
            startBreathingAnalysis(phaseDuration);
            
            // Esperar duración de la fase
            await new Promise(resolve => setTimeout(resolve, phaseDuration * 1000));
        }
    }
    
    // Terminar respiración
    breathingActive = false;
    document.getElementById('breathInstruction').textContent = 'Bien hecho 😊';
    
    // Mostrar botón continuar
    setTimeout(() => {
        document.getElementById('continue-button').style.display = 'inline-flex';
    }, 1000);
}

// ================== ANÁLISIS DE RESPIRACIÓN ==================
function startBreathingAnalysis(duration) {
    if (!analysisActive) return;
    
    // Simulación de análisis de respiración y volumen
    const startTime = Date.now();
    
    const analysisCheck = setInterval(() => {
        if (!analysisActive) {
            clearInterval(analysisCheck);
            return;
        }
        
        const elapsed = (Date.now() - startTime) / 1000;
        
        if (elapsed >= duration) {
            clearInterval(analysisCheck);
            return;
        }
        
        // Simular detección de métricas
        const voiceVolume = 30 + Math.random() * 40; // 30-70%
        const breathRate = 40 + Math.random() * 50; // 40-90% (bien si es calmado)
        const selfControl = 60 + Math.random() * 35; // 60-95%
        
        regulationAnalysis.voiceVolume = Math.round(voiceVolume);
        regulationAnalysis.breathRate = Math.round(breathRate);
        regulationAnalysis.selfControl = Math.round(selfControl);
        
        // Calcular ansiedad detectada
        const detectedAnxietyValue = Math.max(0, 100 - breathRate);
        anxietyLevel = Math.max(0, anxietyLevel - 5); // Reducir ansiedad
        
        if (detectedAnxietyValue > 70) {
            regulationAnalysis.detectedAnxiety = 'Alto';
        } else if (detectedAnxietyValue > 40) {
            regulationAnalysis.detectedAnxiety = gs('medium','Medio');
        } else {
            regulationAnalysis.detectedAnxiety = 'Bajo';
        }
        
        updateAnalysisDisplay();
        checkAdaptation();
        updateAnxietyIndicator();
    }, 500);
}

function updateAnalysisDisplay() {
    document.getElementById('voiceVolume').textContent = regulationAnalysis.voiceVolume + '%';
    document.getElementById('voiceVolumeProgress').style.width = regulationAnalysis.voiceVolume + '%';
    
    document.getElementById('breathRate').textContent = regulationAnalysis.breathRate + '%';
    document.getElementById('breathRateProgress').style.width = regulationAnalysis.breathRate + '%';
    
    document.getElementById('detectedAnxiety').textContent = regulationAnalysis.detectedAnxiety;
    document.getElementById('selfControl').textContent = regulationAnalysis.selfControl + '%';
}

function checkAdaptation() {
    const notice = document.getElementById('adaptationNotice');
    const text = document.getElementById('adaptationText');
    
    // Cambiar velocidad según ansiedad
    if (anxietyLevel > 70) {
        notice.classList.remove('hidden');
        text.textContent = '⚠️ Se detectó ansiedad alta. Se recomienda una pausa...';
        
        if (breathingDuration < 6) {
            breathingDuration = 6; // Ralentizar respiración
        }
    } else if (regulationAnalysis.voiceVolume > 70) {
        notice.classList.remove('hidden');
        text.textContent = '💡 Tu voz está muy fuerte. Intenta hablar más suavemente...';
    } else if (regulationAnalysis.breathRate < 50) {
        notice.classList.remove('hidden');
        text.textContent = '🫁 Respira más profundamente. Sigue el ritmo de la guía...';
    } else {
        notice.classList.add('hidden');
    }
}

function resetAnalysis() {
    regulationAnalysis = {
        voiceVolume: 0,
        breathRate: 0,
        detectedAnxiety: 'Bajo',
        selfControl: 0
    };
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
}

// ================== CONTINUAR A SIGUIENTE RONDA ==================
function continueToNextRound() {
    stopCamera();
    breathingActive = false;
    analysisActive = false;
    
    // Agregar puntos adicionales basados en regulación
    const regulationBonus = Math.round((regulationAnalysis.selfControl + regulationAnalysis.breathRate) / 2 / 10);
    score += regulationBonus;
    
    document.getElementById('score').textContent = score + ' ' + gs('points', 'puntos');
    document.getElementById('score-display').textContent = score + ' ' + gs('points', 'puntos');
    
    if (currentRound + 1 >= totalRounds) {
        completeGame();
    } else {
        currentRound++;
        startNewRound();
    }
}

// ================== NAVEGACIÓN ==================
function goToMainPage() {
    if (cameraActive) stopCamera();
    window.location.href = 'https://plekdev.github.io/BlueMinds/selectores/selector-kinestesico.html';
}
