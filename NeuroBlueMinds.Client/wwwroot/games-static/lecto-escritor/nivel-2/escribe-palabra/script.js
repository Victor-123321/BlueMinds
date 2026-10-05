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
let userAnswer = '';
let difficulty = 'normal';
let wrongAttempts = 0;
let hintUsed = false;
let phase = 0; // 0 = inicio, 1 = mostrar palabra, 2 = escribir
let countdownTimer = null;
let recordedWords = []; // Para estadísticas

// Palabras por dificultad
const wordBanks = {
    easy: [
        { word: 'gato', image: 'https://static.vecteezy.com/system/resources/previews/013/089/641/original/illustration-of-cute-colored-cat-cat-cartoon-image-in-eps10-format-suitable-for-children-s-book-design-elements-introduction-of-cats-to-children-books-or-posters-about-animal-vector.jpg?w=400&h=300&fit=crop' },
        { word: 'sol', image: 'https://static.vecteezy.com/system/resources/previews/018/800/828/original/cartoon-bright-sun-icon-png.png?w=400&h=300&fit=crop' },
        { word: 'casa', image: 'https://static.vecteezy.com/system/resources/previews/006/986/358/original/house-illustration-cartoon-vector.jpg?w=400&h=300&fit=crop' },
        { word: 'agua', image: 'https://static.vecteezy.com/system/resources/previews/012/781/853/non_2x/cute-water-drop-cartoon-character-giving-water-bottle-free-vector.jpg?w=400&h=300&fit=crop' },
        { word: 'flor', image: 'https://cdn.pixabay.com/photo/2022/12/13/05/16/flowers-7652496_1280.png?w=400&h=300&fit=crop' },
    ],
    normal: [
        { word: 'mariposa', image: 'https://static.vecteezy.com/system/resources/previews/014/655/698/original/butterfly-icon-cartoon-style-vector.jpg?w=400&h=300&fit=crop' },
        { word: 'teléfono', image: 'https://static.vecteezy.com/system/resources/previews/011/157/544/large_2x/mobile-phone-cartoon-icon-illustration-technology-object-icon-concept-isolated-premium-flat-cartoon-style-vector.jpg?w=400&h=300&fit=crop' },
        { word: 'bicicleta', image: 'https://static.vecteezy.com/system/resources/previews/005/239/753/non_2x/bicycle-cartoon-illustration-free-vector.jpg?w=400&h=300&fit=crop' },
        { word: 'dinosaurio', image: 'https://static.vecteezy.com/system/resources/previews/009/877/405/original/cute-little-triceratops-dinosaur-cartoon-sitting-vector.jpg?w=400&h=300&fit=crop' },
        { word: 'montaña', image: 'https://img.freepik.com/vector-premium/dibujo-dibujos-animados-montana-cielo-azul-campo-hierba-verde_1084749-7629.jpg?w=400&h=300&fit=crop' },
    ],
    hard: [
        { word: 'extraordinario', image: 'https://img.freepik.com/vector-premium/persona-emocionada-asombrada-que-reacciona-algo-inesperado-concepto-efecto-guau-mujer-feliz-mirando-algo-increible-alegria-extasis-reaccion-ilustracion-vectorial-plana-aislada-sobre-fondo-blanco_198278-15226.jpg?w=400&h=300&fit=crop' },
        { word: 'hipopótamo', image: 'https://static.vecteezy.com/system/resources/previews/005/561/609/non_2x/hippo-cartoon-colored-illustration-free-vector.jpg?w=400&h=300&fit=crop' },
        { word: 'investigador', image: 'https://img.freepik.com/vector-premium/lindo-chico-detective-lupa-ilustraciones-vectoriales-dibujos-animados_1057-118480.jpg?w=400&h=300&fit=crop' },
        { word: 'arquitectura', image: 'https://img.freepik.com/vector-premium/arquitecto-trabajando-construccion_75487-439.jpg?w=400&h=300&fit=crop' },
        { word: 'biblioteca', image: 'https://img.freepik.com/vector-premium/ninos-dibujos-animados-que-estudian-biblioteca_29190-5145.jpg?w=400&h=300&fit=crop' },
    ]
};

const totalRounds = 5;

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    showStartPhase();
});

// Event listeners
function setupEventListeners() {
    document.getElementById('start-button').addEventListener('click', startNewRound);
    document.getElementById('check-button').addEventListener('click', checkAnswer);
    document.getElementById('reset-button').addEventListener('click', resetRound);
    document.getElementById('hint-button').addEventListener('click', showHint);
    document.getElementById('write-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkAnswer();
    });
}

// Mostrar fase de inicio
function showStartPhase() {
    document.getElementById('phase1').classList.add('hidden');
    document.getElementById('phase2').classList.add('hidden');
    document.getElementById('start-button').style.display = 'inline-flex';
    document.getElementById('check-button').style.display = 'none';
    document.getElementById('hint-button').style.display = 'none';
    document.getElementById('reset-button').style.display = 'none';
    
    updateUI();
}

// Seleccionar pool por dificultad
function selectWordBank() {
    if (wrongAttempts >= 2) {
        difficulty = 'easy';
        return wordBanks.easy;
    } else if (score >= 70 && currentRound > 2) {
        difficulty = 'hard';
        return wordBanks.hard;
    } else {
        difficulty = 'normal';
        return wordBanks.normal;
    }
}

// Iniciar nueva ronda
function startNewRound() {
    const wordBank = selectWordBank();
    const randomIndex = Math.floor(Math.random() * wordBank.length);
    
    currentWord = wordBank[randomIndex];
    userAnswer = '';
    wrongAttempts = 0;
    hintUsed = false;
    recordedWords.push({ word: currentWord.word, length: currentWord.word.length });
    
    updateUI();
    showPhase1();
}

// Actualizar UI general
function updateUI() {
    document.getElementById('current-round').textContent = currentRound + 1;
    document.getElementById('score').textContent = score + ' ' + gs('points', 'puntos');
    document.getElementById('score-display').textContent = score + ' ' + gs('points', 'puntos');

    const progress = ((currentRound + 1) / totalRounds) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';

    updateDifficulty();
}

// Mostrar Fase 1: Imagen con palabra
function showPhase1() {
    document.getElementById('phase1').classList.remove('hidden');
    document.getElementById('phase2').classList.add('hidden');
    document.getElementById('start-button').style.display = 'none';
    document.getElementById('check-button').style.display = 'none';
    document.getElementById('hint-button').style.display = 'none';
    document.getElementById('reset-button').style.display = 'none';

    document.getElementById('phase1-image').src = currentWord.image;
    document.getElementById('word-display').textContent = currentWord.word;

    phase = 1;
    startCountdown(3);
}

// Countdown
function startCountdown(seconds) {
    let remaining = seconds;
    document.getElementById('countdown').textContent = remaining;
    
    const interval = 1000;
    const startTime = Date.now();
    const endTime = startTime + (seconds * 1000);

    const updateCountdown = () => {
        const now = Date.now();
        const timeLeft = Math.max(0, endTime - now);
        remaining = Math.ceil(timeLeft / 1000);
        
        document.getElementById('countdown').textContent = remaining;
        const fillPercent = (timeLeft / (seconds * 1000)) * 100;
        document.getElementById('countdown-fill').style.width = fillPercent + '%';

        if (timeLeft > 0) {
            countdownTimer = setTimeout(updateCountdown, 50);
        } else {
            clearTimeout(countdownTimer);
            showPhase2();
        }
    };

    updateCountdown();
}

// Mostrar Fase 2: Escribir palabra
function showPhase2() {
    document.getElementById('phase1').classList.add('hidden');
    document.getElementById('phase2').classList.remove('hidden');
    document.getElementById('start-button').style.display = 'none';
    document.getElementById('check-button').style.display = 'inline-flex';
    document.getElementById('hint-button').style.display = 'inline-flex';
    document.getElementById('reset-button').style.display = 'inline-flex';

    const input = document.getElementById('write-input');
    input.value = '';
    input.classList.remove('correct', 'incorrect');
    input.focus();

    // Mostrar información de la palabra
    document.getElementById('word-length-info').textContent = `Longitud: ${currentWord.word.length} letras`;
    
    const complexity = currentWord.word.length <= 4 ? gs('easy','Fácil') : 
                     currentWord.word.length <= 8 ? 'Normal' : gs('hard','Difícil');
    document.getElementById('word-complexity-info').textContent = `Dificultad: ${complexity}`;
    document.getElementById('word-difficulty').classList.remove('hidden');

    phase = 2;
    document.getElementById('feedback').classList.add('hidden');
}

// Mostrar pista
function showHint() {
    if (hintUsed) {
        showFeedback("Ya usaste la pista", false);
        return;
    }

    hintUsed = true;
    const word = currentWord.word;
    const hint = word[0] + word[word.length - 1]; // Primera y última letra
    
    const hintsList = document.getElementById('hints-list');
    hintsList.innerHTML = '';
    
    for (let i = 0; i < word.length; i++) {
        const letterDiv = document.createElement('div');
        letterDiv.className = 'hint-letter';
        letterDiv.textContent = i === 0 || i === word.length - 1 ? word[i] : '?';
        hintsList.appendChild(letterDiv);
    }
    
    document.getElementById('letter-hints').classList.remove('hidden');
    showFeedback("💡 Primera y última letra mostradas", true);
}

// Algoritmo Levenshtein para tolerancia ortográfica
function levenshteinDistance(a, b) {
    const aLower = a.toLowerCase().trim();
    const bLower = b.toLowerCase().trim();
    
    if (aLower === bLower) return 0;
    
    const m = aLower.length;
    const n = bLower.length;
    const dp = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));
    
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (aLower[i - 1] === bLower[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
    }
    
    return dp[m][n];
}

// Verificar respuesta
function checkAnswer() {
    userAnswer = document.getElementById('write-input').value.trim();
    
    if (!userAnswer) {
        showFeedback("Por favor escribe una palabra", false);
        return;
    }

    const distance = levenshteinDistance(userAnswer, currentWord.word);
    const maxDistance = Math.max(userAnswer.length, currentWord.word.length);
    const similarity = 1 - (distance / maxDistance);
    
    const isCorrect = similarity >= 0.85;

    if (isCorrect) {
        let points = 20;
        if (hintUsed) points = 15;
        if (wrongAttempts > 0) points = Math.max(10, points - (wrongAttempts * 5));
        
        score += points;
        showFeedback(`¡Correcto! "${currentWord.word}" +${points} puntos 🎉`, true);
        
        const input = document.getElementById('write-input');
        input.classList.add('correct');

        document.getElementById('check-button').disabled = true;
        document.getElementById('reset-button').disabled = true;
        document.getElementById('hint-button').disabled = true;

        setTimeout(() => {
            if (currentRound + 1 >= totalRounds) {
                completeGame();
            } else {
                currentRound++;
                startNewRound();
                document.getElementById('check-button').disabled = false;
                document.getElementById('reset-button').disabled = false;
                document.getElementById('hint-button').disabled = false;
            }
        }, 2500);
    } else {
        wrongAttempts++;
        showFeedback(`Incorrecto. La palabra era: "${currentWord.word}"`, false);
        
        const input = document.getElementById('write-input');
        input.classList.add('incorrect');

        updateDifficulty();
    }

    document.getElementById('score').textContent = score + ' ' + gs('points', 'puntos');
    document.getElementById('score-display').textContent = score + ' ' + gs('points', 'puntos');
}

// Reiniciar ronda
function resetRound() {
    document.getElementById('write-input').value = '';
    document.getElementById('write-input').classList.remove('correct', 'incorrect');
    document.getElementById('write-input').focus();
    document.getElementById('feedback').classList.add('hidden');
    document.getElementById('letter-hints').classList.add('hidden');
    wrongAttempts = 0;
    hintUsed = false;
    userAnswer = '';
}

// Mostrar feedback
function showFeedback(message, isCorrect) {
    const feedbackElement = document.getElementById('feedback');
    feedbackElement.textContent = message;
    feedbackElement.className = isCorrect ? 'feedback correct' : 'feedback incorrect';
    feedbackElement.classList.remove('hidden');
}

// Actualizar dificultad
function updateDifficulty() {
    let newDifficulty = 'normal';
    
    if (wrongAttempts >= 2) {
        newDifficulty = 'easy';
    } else if (score >= 70 && currentRound > 2) {
        newDifficulty = 'hard';
    }

    const badge = document.getElementById('difficulty-badge');
    const texts = { 'easy': '🎯 Fácil', 'normal': 'Normal', 'hard': '⭐ Avanzado' };
    badge.textContent = texts[newDifficulty];
}

// Completar juego
async function completeGame() {
  // --- INTEGRACIÓN BLUEMINDS ---
    const levelNum = difficulty === 'hard' ? 3 : (difficulty === 'normal' ? 2 : 1);
    
    // Calculamos la precisión (score máximo es 100 si son 5 rondas de 20pts)
    const maxScore = 100;
    const calculatedAccuracy = Math.min((score / maxScore) * 100, 100);

    const gameData = {
        gameId: "escribe-palabra", 
        style: "visual",           // Es memoria visual principalmente
        level: levelNum,
        score: score,
        accuracy: calculatedAccuracy,
        responseTime: 45000        // Tiempo estimado de sesión
    };

    // Envío al servidor de Arch Linux
        try {
            await api.saveGameResults(gameData);
            console.log('✅ Progreso guardado exitosamente');
        } catch (error) {
            console.error('❌ Error al conectar con el servidor:', error);
        }
    // ----------------------------
    const avgLength = (recordedWords.reduce((sum, w) => sum + w.length, 0) / recordedWords.length).toFixed(1);
    const maxLength = Math.max(...recordedWords.map(w => w.length));
    const minLength = Math.min(...recordedWords.map(w => w.length));

    const escribeCard = document.querySelector('.escribe-card');
    escribeCard.innerHTML = `
        <h2>¡Juego Completado! 🏆</h2>
        <div class="feedback correct" style="margin-top: 20px;">
            <p><strong>Tu puntaje final:</strong> ${score} puntos</p>
        </div>
        <div class="explanation" style="margin-top: 20px;">
            <h3>Estadísticas de Palabras</h3>
            <p><strong>Longitud promedio:</strong> ${avgLength} letras</p>
            <p><strong>Rango:</strong> ${minLength}-${maxLength} letras</p>
            <p><strong>Nivel final:</strong> ${difficulty === 'easy' ? 'Fácil 🎯' : difficulty === 'hard' ? 'Avanzado ⭐' : 'Normal'}</p>
            <p style="margin-top: 10px; font-size: 14px;">¡Excelente trabajo memorizando y escribiendo palabras!</p>
        </div>
        <div class="action-controls" style="margin-top: 30px;">
            <button class="action-button primary" onclick="location.reload()">
                <i class="fas fa-redo"></i> Jugar de Nuevo
            </button>
            <button class="action-button blue" onclick="goToMainPage()">
                <i class="fas fa-home"></i> Volver al Menú
            </button>
        </div>
    `;
}

// Volver a página principal
function goToMainPage() {
    window.location.href = 'https://plekdev.github.io/BlueMinds/selectores/selector-lecto-escritor.html';
}
