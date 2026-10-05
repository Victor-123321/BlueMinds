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

// ========================
// EL ECO DE LAS PALABRAS - SCRIPT COMPLETO
// Con análisis de pronunciación avanzado
// ========================

// Variables globales
let currentRound = 0;
let score = 0;
let currentWord = null;
let isRecording = false;
let hasPlayed = false;
let difficulty = 'easy';
let recognitionActive = false;
var analyzer = analyzer || null;
let roundStartTime = null;
let roundTimes = [];

const words = [
    { src: "https://tse1.mm.bing.net/th/id/OIP.z589HEF6wuRZZR-B9C49RQHaFK?rs=1&pid=ImgDetMain&o=7&rm=3", name: "sol", audio: "sol", color: "primary", difficulty: 'easy' },
    { src: "https://img.freepik.com/vector-premium/icono-luna-lindo-estilo-dibujos-animados_74102-7166.jpg?w=2000", name: "luna", audio: "luna", color: "blue", difficulty: 'easy' },
    { src: "https://img.freepik.com/vector-premium/estrella-dibujada-mano-plana-elegante-mascota-personaje-dibujos-animados-dibujo-pegatina-icono-concepto-aislado_730620-302755.jpg", name: "estrella", audio: "estrella", color: "red", difficulty: 'medium' },
    { src: "https://static.vecteezy.com/system/resources/previews/024/190/108/non_2x/cute-cartoon-cloud-kawaii-weather-illustrations-for-kids-free-png.png", name: "nube", audio: "nube", color: "purple", difficulty: 'easy' },
    { src: "https://img.freepik.com/fotos-premium/estilo-ilustracion-vectorial-lluvia-dibujos-animados_750724-13162.jpg", name: "lluvia", audio: "lluvia", color: "accent", difficulty: 'hard' },
    { src: "https://img.freepik.com/vector-premium/ilustracion-vectorial-dibujos-animados-dinosaurio-lindo_104589-158.jpg", name: "dinosaurio", audio: "dinosaurio", color: "green", difficulty: 'hard' },
    { src: "https://img.freepik.com/vector-premium/dibujos-animados-mariposa-linda-aislado-blanco_29190-4712.jpg", name: "mariposa", audio: "mariposa", color: "pink", difficulty: 'hard' },
    { src: "https://img.freepik.com/vector-premium/computadora-portatil-dibujos-animados-aislada-blanco_29190-4354.jpg", name: "computadora", audio: "computadora", color: "blue", difficulty: 'hard' },
    { src: "https://static.vecteezy.com/system/resources/previews/008/132/083/non_2x/green-tree-cartoon-isolated-on-white-background-illustration-of-green-tree-cartoon-free-vector.jpg", name: "árbol", audio: "arbol", color: "primary", difficulty: 'medium' },
];

const totalRounds = 5;
let recognition;

// ========================
// INICIALIZACIÓN DEL JUEGO
// ========================

document.addEventListener('DOMContentLoaded', function() {
  loadHighScore();
  setupSpeechRecognition();
  setupEventListeners();
  initializeAnalyzer();
  startNewRound();
});

// ========================
// CONFIGURAR RECONOCIMIENTO DE VOZ
// ========================

function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = function() {
            recognitionActive = true;
            console.log('Reconocimiento de voz iniciado');
        };

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript.toLowerCase().trim();
            console.log('Transcript:', transcript);
            analyzePronounciation(transcript);
        };

        recognition.onerror = function(event) {
          console.error('Error en reconocimiento de voz:', event.error);
      
            if (event.error === 'network') {
                showFeedback('Error de red. Asegúrate de estar en Chrome/Edge y tener internet.', false);
            } else if (event.error === 'not-allowed') {
                showFeedback('¡Ups! Necesito permiso para usar el micrófono.', false);
            }
            
            // IMPORTANTE: Resetear el estado para que el niño pueda intentar de nuevo
            stopRecording(); 
            isRecording = false;
            const recordButton = document.getElementById('record-button');
            recordButton.innerHTML = '<i class="fas fa-microphone"></i> Reintentar grabar';
        };


        recognition.onend = function() {
            recognitionActive = false;
            console.log('Reconocimiento de voz finalizado');
        };
    } else {
        console.warn('Web Speech API no soportada en este navegador');
        alert('Tu navegador no soporta reconocimiento de voz. Por favor usa Chrome, Edge o Safari.');
    }
}

// ========================
// INICIALIZAR ANALIZADOR
// ========================

function initializeAnalyzer() {
    if (typeof PronunciationAnalyzer !== 'undefined') {
        if(!analyzer){ // <--- Aquí intentas usarlo
          analyzer = new PronunciationAnalyzer();
        }
        console.log('Analizador de pronunciación inicializado');
    }
}

// ========================
// CONFIGURAR EVENT LISTENERS
// ========================

function setupEventListeners() {
    const playButton = document.getElementById('play-button');
    const recordButton = document.getElementById('record-button');
    
    if (playButton) {
        playButton.addEventListener('click', playWord);
    }
    
    if (recordButton) {
        recordButton.addEventListener('click', toggleRecording);
    }
}

// ========================
// INICIAR NUEVA RONDA
// ========================


function startNewRound() {
    console.log("--- Iniciando Ronda ---");
    console.log("Dificultad actual:", difficulty);

    // 1. Limpiamos historial de errores del analizador para que no nos "atrape"
    if (analyzer) {
        analyzer.userHistory.failedPhonemes = [];
    }

    // 2. Filtrado Ultra-Seguro
    let filteredWords = words.filter(w => {
        return w.difficulty.trim().toLowerCase() === difficulty.trim().toLowerCase();
    });

    console.log("Palabras encontradas para esta dificultad:", filteredWords.length);

    // 3. Si por un milagro no encuentra nada, que NO use toda la lista (porque ahí está lluvia)
    // Que use las de nivel 'easy' por defecto.
    if (filteredWords.length === 0) {
        console.warn("Dificultad no encontrada, forzando a 'easy'");
        filteredWords = words.filter(w => w.difficulty === 'easy');
    }

    // 4. Selección aleatoria
    const randomWord = filteredWords[Math.floor(Math.random() * filteredWords.length)];
    currentWord = randomWord;
    
    console.log("Palabra seleccionada:", currentWord.name);

    hasPlayed = false;
    isRecording = false;
    
    roundStartTime = Date.now();
    updateUI();
    setTimeout(playWord, 1000);
}

// Función para obtener y mostrar el récord
async function loadHighScore() {
    try {
        const gameId = 'eco-palabras-1'; // El ID que usas en Koyeb
        const bestScore = await api.getBestScore(gameId);
        
        const highScoreElement = document.getElementById('high-score-text');
        if (highScoreElement) {
            highScoreElement.textContent = `${bestScore} pts`;
        }
        return bestScore;
    } catch (error) {
        console.error("Error cargando récord:", error);
        return 0;
    }
}


// ========================
// ACTUALIZAR INTERFAZ
// ========================

function updateUI() {
    // Actualizar número de ronda
    document.getElementById('current-round').textContent = currentRound + 1;
    document.getElementById('total-rounds').textContent = totalRounds;
    
    // Actualizar puntaje
    document.getElementById('score').textContent = score + ' ' + gs('points', 'puntos');
    document.getElementById('score-display').textContent = score + ' ' + gs('points', 'puntos');
    
    // Actualizar barra de progreso
    const progress = ((currentRound + 1) / totalRounds) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';
    
    // Actualizar imagen
    document.getElementById('current-image').src = currentWord.src;
    
    // Actualizar badge de dificultad
    const badgeElement = document.getElementById('difficulty-badge');
    let diffText = 'Normal';
    if (difficulty === 'easy') {
        diffText = gs('easy','Fácil');
    } else if (difficulty === 'hard') {
        diffText = gs('hard','Difícil');
    }
    badgeElement.textContent = 'Dificultad: ' + diffText;
    badgeElement.className = 'difficulty-badge ' + difficulty;
    
    // Limpiar medidor de similitud
    document.getElementById('similarity-meter').style.display = 'none';
    document.getElementById('similarity-fill').style.width = '0%';
    document.getElementById('similarity-text').textContent = '0%';
    document.getElementById('similarity-fill').className = 'similarity-fill';
    
    // Resetear botón de grabación
    const recordButton = document.getElementById('record-button');
    recordButton.innerHTML = '<i class="fas fa-microphone"></i> Grabar mi voz';
    recordButton.className = 'audio-button red';
    
    // Limpiar feedback
    document.getElementById('feedback').classList.remove('show');
    document.getElementById('recorded-text').classList.remove('show');
}

// ========================
// REPRODUCIR PALABRA
// ========================

function playWord() {
    if (!currentWord) return;
    
    const playButton = document.getElementById('play-button');
    playButton.innerHTML = '<i class="fas fa-volume-up"></i> Reproduciendo...';
    playButton.disabled = true;
    
    // Crear utterance para síntesis de voz
    const utterance = new SpeechSynthesisUtterance(currentWord.name);
    utterance.lang = 'es-ES';
    utterance.rate = difficulty === 'hard' ? 0.6 : 0.8;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    utterance.onend = function() {
        playButton.innerHTML = '<i class="fas fa-volume-up"></i> Escuchar palabra';
        playButton.disabled = false;
        hasPlayed = true;
    };
    
    utterance.onerror = function(event) {
        console.error('Error en síntesis de voz:', event.error);
        playButton.innerHTML = '<i class="fas fa-volume-up"></i> Escuchar palabra';
        playButton.disabled = false;
        hasPlayed = true;
    };
    
    speechSynthesis.speak(utterance);
}

// ========================
// GRABAR VOZ
// ========================

function toggleRecording() {
    if (!hasPlayed) {
        showFeedback('Primero escucha la palabra', false);
        return;
    }
    
    const recordButton = document.getElementById('record-button');
    
    if (!isRecording) {
        // Iniciar grabación
        isRecording = true;
        recordButton.innerHTML = '<i class="fas fa-stop"></i> Detener grabación';
        recordButton.className = 'audio-button red recording';
        
        if (recognition) {
            recognition.start();
        } else {
            showFeedback('Error: Reconocimiento de voz no disponible', false);
            stopRecording();
        }
    } else {
        // Detener grabación
        stopRecording();
    }
}

// ========================
// DETENER GRABACIÓN
// ========================

function stopRecording() {
    isRecording = false;
    const recordButton = document.getElementById('record-button');
    recordButton.innerHTML = '<i class="fas fa-microphone"></i> Analizando...';
    recordButton.className = 'audio-button red';
    
    if (recognition) {
        recognition.stop();
    }
}

// ========================
// ANALIZAR PRONUNCIACIÓN
// ========================

function analyzePronounciation(transcript) {
    // Inicializar analizador si no existe
    if (!analyzer) {
        analyzer = new PronunciationAnalyzer();
    }
    
    // Analizar usando la clase PronunciationAnalyzer
    const result = analyzer.analyze(currentWord.name, transcript);
    const similarity = result.score;
    
    // Mostrar texto grabado
    const recordedTextElement = document.getElementById('recorded-text');
    document.getElementById('recorded-text-content').textContent = '"' + transcript + '"';
    recordedTextElement.classList.add('show');
    
    // Actualizar medidor de similitud
    document.getElementById('similarity-meter').style.display = 'block';
    document.getElementById('similarity-fill').style.width = similarity + '%';
    document.getElementById('similarity-text').textContent = similarity + '%';
    
    // Cambiar color del medidor según resultado
    const fillElement = document.getElementById('similarity-fill');
    fillElement.className = 'similarity-fill';
    if (similarity >= 70) {
        fillElement.classList.add('success');
    } else if (similarity >= 50) {
        fillElement.classList.add('warning');
    } else {
        fillElement.classList.add('error');
    }

    // Determinar si es correcto
    const isCorrect = similarity >= 70;
    const pointsEarned = Math.floor(similarity / 10);

    // Mostrar feedback
    if (isCorrect) {
        score += pointsEarned;
        const feedbackMsg = result.feedback.emoji + ' ' + result.feedback.messages[0];
        showFeedback(feedbackMsg, true);
        
          // En lugar de saltar a hard con una sola de 90
      if (similarity >= 95 && difficulty === 'medium') {
          difficulty = 'hard';
      } else if (similarity >= 90 && difficulty === 'easy') {
          difficulty = 'medium';
      }
    } else {
        const feedbackMsg = result.feedback.emoji + ' ' + result.feedback.messages[0];
        showFeedback(feedbackMsg, false);
        
        // Reducir dificultad si va mal
        if (similarity < 50 && difficulty !== 'easy') {
            difficulty = 'easy';
        }
    }

    // Actualizar puntaje en pantalla
    document.getElementById('score').textContent = score + ' ' + gs('points', 'puntos');
    document.getElementById('score-display').textContent = score + ' ' + gs('points', 'puntos');

    // Log para debug
    console.log('Resultado:', {
        palabra: currentWord.name,
        grabado: transcript,
        similitud: similarity,
        puntos: pointsEarned,
        errores: result.errors,
        feedback: result.feedback
    });
    const responseTime = Date.now() - roundStartTime;
    roundTimes.push(responseTime); // Guardamos el tiempo de esta ronda
    
    console.log(`Ronda ${currentRound + 1}: ${responseTime}ms`);

    // Avanzar a siguiente ronda después de 2.5 segundos
    setTimeout(function() {
        if (currentRound + 1 >= totalRounds) {
            completeGame();
        } else {
            currentRound++;
            startNewRound();
        }
    }, 2500);
}

// ========================
// MOSTRAR FEEDBACK
// ========================

function showFeedback(message, isCorrect) {
    const feedbackElement = document.getElementById('feedback');
    const feedbackText = document.getElementById('feedback-text');
    
    feedbackText.textContent = message;
    
    if (isCorrect) {
        feedbackElement.className = 'feedback correct show';
    } else {
        feedbackElement.className = 'feedback incorrect show';
    }
}

// ========================
// COMPLETAR JUEGO
// ========================

async function completeGame() {
    const audioCard = document.getElementById('audio-card');
    const reportData = getPlayerReport();
    const promedio = Math.round(score / totalRounds);
    const totalTime = roundTimes.reduce((acc,time) => acc + time, 0);
    const averageResponseTime = Math.round(totalTime / roundTimes.length);
    const gameData = {
        gameId: 'eco-palabras-1',
        style: 'auditivo',
        level: difficulty === 'hard' ? 3 : (difficulty === 'easy' ? 1 : 2),
        score: score,
        accuracy: reportData ? reportData.averageScore : Math.round(score / totalRounds),
        responseTime: averageResponseTime 
    };

    try {
    console.log("Tratando de guardar en api ", gameData);
      await api.saveGameResults(gameData);
      console.log('Progreso guardado en backend');

    } catch (error){
      console.error('Error al guardar ', error);
    }
    
    // Obtener reporte si el analizador está disponible
    let reporteExtra = '';
    if (analyzer) {
        const report = analyzer.getProgressReport();
        if (report.weakPhonemes.length > 0) {
            reporteExtra = '<p style="color: #6B7280; font-size: 14px; margin-top: 15px;">Sonidos a practicar: ' + report.weakPhonemes.join(', ') + '</p>';
        }
    }
    
    let html = '<div class="game-completed">';
    html += '<h2 style="margin-bottom: 20px; color: #0066CC;">¡Juego Completado!</h2>';
    html += '<div class="final-score">';
    html += '<h2>Tu puntaje final:</h2>';
    html += '<div class="score-number">' + score + '</div>';
    html += '<p>puntos</p>';
    html += '</div>';
    html += '<p style="color: #6B7280; margin-bottom: 20px;">Promedio: ' + promedio + '% por ronda</p>';
    html += reporteExtra;
    html += '<div class="options-container">';
    html += '<button class="option-button primary" onclick="location.reload()">';
    html += '<i class="fas fa-redo"></i> Jugar de Nuevo';
    html += '</button>';
    html += '<button class="option-button blue" onclick="goToMainPage()">';
    html += '<i class="fas fa-arrow-left"></i> Volver al Menú';
    html += '</button>';
    html += '</div>';
    html += '</div>';
    
    audioCard.innerHTML = html;
}

// ========================
// VOLVER A PÁGINA PRINCIPAL
// ========================

function goToMainPage() {
    window.location.href = '../../../../selectores/selector-auditivo.html';
}

// ========================
// FUNCIONES AUXILIARES
// ========================

/**
 * Obtener reporte de progreso del jugador
 * Útil para mostrar al padre o terapeuta
 */
function getPlayerReport() {
    if (!analyzer) {
        return null;
    }
    
    const report = analyzer.getProgressReport();
    
    return {
        totalAttempts: report.totalAttempts,
        averageScore: report.averageScore,
        strongPhonemes: report.strongPhonemes,
        weakPhonemes: report.weakPhonemes,
        recommendedFocus: report.recommendedFocus,
        totalScore: score,
        currentDifficulty: difficulty
    };
}

/**
 * Mostrar reporte en consola (para debug)
 */
function logReport() {
    const report = getPlayerReport();
    console.table(report);
    console.log('Historial completo:', analyzer.userHistory.attempts);
}
