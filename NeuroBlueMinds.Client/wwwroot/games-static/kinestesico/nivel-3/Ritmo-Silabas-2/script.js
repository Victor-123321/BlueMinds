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
let syllables = [];
let isPlaying = false;
let tapCount = 0;
let expectedTaps = 0;

const words = [
    { word: "casa", syllables: ["CA", "SA"] },
    { word: "mesa", syllables: ["ME", "SA"] },
    { word: "mano", syllables: ["MA", "NO"] },
    { word: "libro", syllables: ["LI", "BRO"] },
    { word: "gato", syllables: ["GA", "TO"] },
    { word: "sol", syllables: ["SOL"] },
];

const totalRounds = 3;
let currentSyllableIndex = 0;

// ================== INICIALIZACIÓN ==================
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    startNewRound();
});

function setupEventListeners() {
    document.getElementById('start-button').addEventListener('click', startRhythmActivity);
    document.getElementById('listen-button').addEventListener('click', startSpeechRecognition);
    document.getElementById('tapArea').addEventListener('click', onTap);
}

// ================== RONDAS ==================
function startNewRound() {
    const randomWord = words[Math.floor(Math.random() * words.length)];
    currentWord = randomWord;
    syllables = randomWord.syllables;
    tapCount = 0;
    expectedTaps = syllables.length;
    isPlaying = false;
    currentSyllableIndex = 0;
    
    updateUI();
}

function completeGame() {
    const rhythmCard = document.querySelector('.rhythm-card');
    rhythmCard.innerHTML = `
        <h2>¡Actividad Completada! 🎉</h2>
        <div class="syllable-stage" style="display: flex; align-items: center; justify-content: center; min-height: 200px;">
            <div style="font-size: 80px;">🌟</div>
        </div>
        <div class="feedback correct">
            <p style="font-size: 28px; margin: 20px 0;">Tu puntaje final: ${score} puntos</p>
            <p style="font-size: 16px;">¡Excelente ritmo y memoria auditiva!</p>
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
    
    // Crear sílabas
    displaySyllables();
    
    // Resetear botones
    const startButton = document.getElementById('start-button');
    startButton.innerHTML = '<i class="fas fa-play"></i> Escuchar Palabra';
    startButton.disabled = false;
    
    // Ocultar secciones
    document.getElementById('speechSection').style.display = 'none';
    document.getElementById('feedback').classList.add('hidden');
    
    // Resetear área de golpeo
    const tapArea = document.getElementById('tapArea');
    tapArea.classList.remove('active');
    document.getElementById('tapFeedback').textContent = '';
    tapCount = 0;
}

function displaySyllables() {
    const container = document.getElementById('syllables-container');
    container.innerHTML = '';
    
    syllables.forEach((syllable, index) => {
        const syllableElement = document.createElement('div');
        syllableElement.className = 'syllable';
        syllableElement.textContent = syllable;
        syllableElement.id = `syllable-${index}`;
        container.appendChild(syllableElement);
    });
}

// ================== ACTIVIDAD PRINCIPAL ==================
async function startRhythmActivity() {
    if (isPlaying) return;
    
    isPlaying = true;
    const startButton = document.getElementById('start-button');
    startButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reproduciendo...';
    startButton.disabled = true;
    
    // Reproducir sílabas con ritmo
    await playSyllablesWithRhythm();
    
    // Activar área de golpeo
    const tapArea = document.getElementById('tapArea');
    tapArea.classList.add('active');
    
    startButton.innerHTML = '<i class="fas fa-redo"></i> Repetir';
    startButton.disabled = false;
}

async function playSyllablesWithRhythm() {
    const timeBetweenSyllables = 700; // Tiempo constante para nivel simple
    
    for (let i = 0; i < syllables.length; i++) {
        currentSyllableIndex = i;
        await highlightSyllable(i, timeBetweenSyllables);
        
        // Reproducir sonido de la sílaba
        const syllableText = syllables[i];
        speakSyllable(syllableText);
        
        // Esperar a que termine la sílaba
        await new Promise(resolve => setTimeout(resolve, timeBetweenSyllables));
    }
    
    currentSyllableIndex = 0;
    
    // Después de reproducir, esperar entrada del usuario
    setTimeout(() => {
        document.getElementById('speechSection').style.display = 'block';
    }, 500);
}

function highlightSyllable(index, duration) {
    return new Promise(resolve => {
        const syllableElement = document.getElementById(`syllable-${index}`);
        
        syllableElement.classList.add('pulse', 'active');
        
        setTimeout(() => {
            syllableElement.classList.remove('pulse', 'active');
            resolve();
        }, duration * 0.8);
    });
}

function speakSyllable(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1;
    utterance.pitch = 1.1;
    utterance.volume = 1;
    speechSynthesis.speak(utterance);
}

// ================== DETECCIÓN DE GOLPEO ==================
function onTap() {
    if (!isPlaying) return;
    
    tapCount++;
    
    // Mostrar feedback
    const tapFeedback = document.getElementById('tapFeedback');
    tapFeedback.textContent = '👏';
    tapFeedback.classList.add('tap-detected');
    
    setTimeout(() => {
        tapFeedback.classList.remove('tap-detected');
    }, 500);
    
    // Verificar si completó los golpes
    if (tapCount === expectedTaps) {
        showFeedback('¡Excelente ritmo! 🎉', true);
        setTimeout(() => {
            document.getElementById('speechSection').style.display = 'block';
        }, 800);
    } else if (tapCount > expectedTaps) {
        showFeedback('Demasiados golpes, intenta de nuevo', false);
        resetTapArea();
    }
}

function resetTapArea() {
    const tapArea = document.getElementById('tapArea');
    tapArea.classList.remove('active');
    tapCount = 0;
    document.getElementById('tapFeedback').textContent = '';
}

function showFeedback(message, isCorrect) {
    const feedbackElement = document.getElementById('feedback');
    const feedbackText = document.getElementById('feedback-text');
    
    feedbackText.textContent = message;
    feedbackElement.className = isCorrect ? 'feedback correct' : 'feedback incorrect';
    feedbackElement.classList.remove('hidden');
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
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        const targetWord = currentWord.word.toLowerCase();
        
        const isSimilar = transcript.includes(targetWord) || targetWord.includes(transcript);
        
        if (isSimilar) {
            score += 20;
            showSpeechFeedback('¡Excelente! 🎉 Repetiste correctamente', true);
        } else {
            showSpeechFeedback(`Escuchamos: "${transcript}". Intenta de nuevo`, false);
        }
        
        document.getElementById('score').textContent = score + ' ' + gs('points', 'puntos');
        document.getElementById('score-display').textContent = score + ' ' + gs('points', 'puntos');
        
        listenButton.disabled = false;
        listenButton.innerHTML = '<i class="fas fa-microphone"></i> Escuchar';
    };
    
    recognition.onerror = (event) => {
        showSpeechFeedback('Error en reconocimiento de voz', false);
        listenButton.disabled = false;
        listenButton.innerHTML = '<i class="fas fa-microphone"></i> Escuchar';
    };
    
    recognition.start();
    
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
    window.location.href = 'https://plekdev.github.io/BlueMinds/selectores/selector-kinestesico.html';
}
