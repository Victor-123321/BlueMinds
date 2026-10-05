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
// ANALIZADOR DE MEMORIA AUDITIVA CON IA ADAPTATIVA
// ========================

class AdaptiveAuditoryMemoryAnalyzer {
    constructor() {
        this.sessionStats = {
            totalAttempts: 0,
            correctAttempts: 0,
            totalTime: 0,
            averageAccuracy: 0,
            memoryScore: 0,
            processingSpeed: 0,
            auditoryMemoryScore: 0,
            orderingAccuracy: 0
        };
        this.attempts = [];
        this.difficultyLevel = 1;
        this.speedMultiplier = 0.7;
        this.showVisualCues = false;
    }

    analyze(expectedSequence, selectedSequence, timeElapsed) {
        const startTime = performance.now();
        
        // Verificar si el orden es correcto
        const isCorrect = JSON.stringify(expectedSequence) === JSON.stringify(selectedSequence);
        
        // Calcular accuracy parcial (cuántos en orden correcto)
        let partialMatches = 0;
        for (let i = 0; i < Math.min(expectedSequence.length, selectedSequence.length); i++) {
            if (expectedSequence[i] === selectedSequence[i]) {
                partialMatches++;
            } else {
                break;
            }
        }
        const accuracy = (partialMatches / expectedSequence.length) * 100;
        
        // Calcular velocidad de procesamiento (ms por palabra)
        const processingSpeed = timeElapsed / expectedSequence.length;
        
        // Generar score
        const score = this.generateScore(accuracy, isCorrect, processingSpeed, selectedSequence.length);
        
        // Registrar intento
        const attempt = {
            timestamp: new Date(),
            expectedSequence: expectedSequence,
            selectedSequence: selectedSequence,
            isCorrect: isCorrect,
            accuracy: accuracy,
            partialMatches: partialMatches,
            timeElapsed: timeElapsed,
            processingSpeed: processingSpeed,
            score: score
        };
        
        this.attempts.push(attempt);
        this.updateSessionStats(attempt);
        this.adaptDifficulty();
        
        return {
            isCorrect: isCorrect,
            accuracy: accuracy,
            partialMatches: partialMatches,
            score: score,
            timeElapsed: timeElapsed,
            processingSpeed: processingSpeed,
            feedback: this.generateFeedback(isCorrect, accuracy, partialMatches, expectedSequence.length),
            analysis: this.generateAnalysis(attempt),
            nextDifficulty: this.getNextDifficulty()
        };
    }

    generateScore(accuracy, isCorrect, processingSpeed, sequenceLength) {
        let baseScore = accuracy;
        
        if (isCorrect) {
            baseScore += 20;
        }
        
        if (processingSpeed < 2000) {
            baseScore += 10;
        } else if (processingSpeed < 5000) {
            baseScore += 5;
        }
        
        if (sequenceLength === 4) {
            baseScore += 5;
        } else if (sequenceLength === 5) {
            baseScore += 10;
        }
        
        return Math.min(100, Math.round(baseScore));
    }

    generateFeedback(isCorrect, accuracy, partialMatches, totalWords) {
        let emoji = '';
        let message = '';
        let details = [];
        
        if (isCorrect) {
            emoji = '🎉';
            message = '¡Perfecto! Orden correcto';
            details.push('Recordaste todas las palabras en orden');
        } else if (accuracy >= 75) {
            emoji = '👍';
            message = 'Muy bien, casi lo tienes';
            details.push('Acertaste ' + partialMatches + ' de ' + totalWords + ' palabras');
            details.push('Intenta nuevamente con más atención');
        } else if (accuracy >= 50) {
            emoji = '📝';
            message = 'Necesitas practicar más';
            details.push('Recordaste ' + partialMatches + ' palabras');
            details.push('Escucha de nuevo con mucha atención');
        } else {
            emoji = '💪';
            message = 'Sigue intentando';
            details.push('La memoria auditiva se mejora con práctica');
            details.push('Presiona "Repetir" para intentar de nuevo');
        }
        
        return {
            emoji: emoji,
            message: message,
            details: details
        };
    }

    generateAnalysis(attempt) {
        return {
            exactness: attempt.isCorrect ? 'Exacto' : 'Incompleto',
            memorized: attempt.partialMatches + '/' + attempt.expectedSequence.length,
            responseTime: Math.round(attempt.timeElapsed) + 'ms',
            processingSpeed: Math.round(attempt.processingSpeed) + 'ms/palabra',
            score: attempt.score
        };
    }

    updateSessionStats(attempt) {
        this.sessionStats.totalAttempts++;
        if (attempt.isCorrect) {
            this.sessionStats.correctAttempts++;
        }
        this.sessionStats.totalTime += attempt.timeElapsed;
        this.sessionStats.averageAccuracy = 
            (this.sessionStats.averageAccuracy * (this.sessionStats.totalAttempts - 1) + attempt.accuracy) / this.sessionStats.totalAttempts;
        this.sessionStats.memoryScore = 
            (this.sessionStats.correctAttempts / this.sessionStats.totalAttempts) * 100;
        this.sessionStats.auditoryMemoryScore = this.sessionStats.memoryScore;
        this.sessionStats.orderingAccuracy = this.sessionStats.averageAccuracy;
    }

    adaptDifficulty() {
        if (this.sessionStats.totalAttempts < 2) return;
        
        const memoryScore = this.sessionStats.auditoryMemoryScore;
        const processingSpeed = this.sessionStats.totalTime / this.sessionStats.totalAttempts;
        
        // Adaptación basada en memoria auditiva
        if (memoryScore >= 85) {
            // Aumentar dificultad
            this.difficultyLevel = Math.min(5, this.difficultyLevel + 0.5);
            this.speedMultiplier = Math.max(0.7, this.speedMultiplier - 0.05);
            this.showVisualCues = false;
        } else if (memoryScore >= 70) {
            // Mantener dificultad
            this.difficultyLevel = Math.max(1, this.difficultyLevel);
            this.speedMultiplier = 0.85;
            this.showVisualCues = false;
        } else if (memoryScore >= 50) {
            // Reducir dificultad ligeramente
            this.difficultyLevel = Math.max(1, this.difficultyLevel - 0.3);
            this.speedMultiplier = Math.min(0.95, this.speedMultiplier + 0.05);
            this.showVisualCues = true;
        } else {
            // Reducir dificultad significativamente
            this.difficultyLevel = Math.max(1, this.difficultyLevel - 0.5);
            this.speedMultiplier = 1.0;
            this.showVisualCues = true;
        }
    }

    getNextDifficulty() {
        return {
            level: Math.round(this.difficultyLevel * 10) / 10,
            speedMultiplier: this.speedMultiplier,
            showVisualCues: this.showVisualCues,
            recommendation: this.generateRecommendation()
        };
    }

    generateRecommendation() {
        if (this.sessionStats.auditoryMemoryScore >= 85) {
            return 'Excelente memoria auditiva. Aumentando dificultad.';
        } else if (this.sessionStats.auditoryMemoryScore >= 70) {
            return 'Buena memoria auditiva. Continúa así.';
        } else if (this.sessionStats.auditoryMemoryScore >= 50) {
            return 'Memoria en desarrollo. Mostrando ayudas visuales.';
        } else {
            return 'Memoria en entrenamiento. Reduciendo velocidad.';
        }
    }

    getSessionReport() {
        return {
            totalAttempts: this.sessionStats.totalAttempts,
            correctAttempts: this.sessionStats.correctAttempts,
            averageAccuracy: Math.round(this.sessionStats.averageAccuracy),
            memoryScore: Math.round(this.sessionStats.memoryScore),
            auditoryMemoryScore: Math.round(this.sessionStats.auditoryMemoryScore),
            orderingAccuracy: Math.round(this.sessionStats.orderingAccuracy),
            averageResponseTime: Math.round(this.sessionStats.totalTime / Math.max(1, this.sessionStats.totalAttempts))
        };
    }
}

// ========================
// VARIABLES DEL JUEGO
// ========================

let currentRound = 0;
let score = 0;
let difficulty = 'adaptive';
let sequenceLength = 3;
let currentSequence = [];
let selectedSequence = [];
let allWords = [];
let gameStarted = false;
let isAnalyzing = false;
let roundStartTime = 0;
let visualCueTimeout = null;

const analyzer = new AdaptiveAuditoryMemoryAnalyzer();
const totalRounds = 5;

// Base de datos de palabras con imágenes
const wordDatabase = {
    'manzana': 'https://img.freepik.com/vector-premium/dibujos-animados-clipart-manzana-dibujo-ilustracion_871209-13267.jpg?w=2000',
    'pera': 'https://img.freepik.com/vector-gratis/fruta-pera-aislada-sobre-fondo-blanco_1308-117166.jpg?semt=ais_hybrid&w=740',
    'uva': 'https://static.vecteezy.com/system/resources/previews/021/964/649/large_2x/grapes-fruit-cartoon-colored-clipart-illustration-free-vector.jpg',
    'plátano': 'https://static.vecteezy.com/system/resources/previews/004/557/519/original/fruit-banana-cartoon-object-vector.jpg',
    'naranja': 'https://img.freepik.com/vector-premium/ilustracion-vectorial-dibujos-animados-color-naranja_871209-3168.jpg?w=2000',
    'fresa': 'https://i.pinimg.com/originals/c8/32/6a/c8326ac10514ba82a4ee79bcd8992c17.jpg',
    'sandía': 'https://static.vecteezy.com/system/resources/previews/007/570/246/original/cartoon-watermelon-slice-fruits-vector.jpg',
    'limón': 'https://static.vecteezy.com/system/resources/previews/004/485/242/original/lemon-fruit-illustrations-free-vector.jpg'
};

// ========================
// INICIALIZACIÓN
// ========================

document.addEventListener('DOMContentLoaded', async function() {
    startNewRound();
    const highScoreElement = document.getElementById('score-display');
    const gameId = 'memoria-auditiva-1';

    try {
        const bestScore = await api.getBestScore(gameId);
        highScoreElement.innerHTML = `🏆 Récord: ${bestScore} pts | <span id="current-score-val">0</span> pts`;
    } catch (error) {
        console.error("No se pudo obtener el récord:", error);
        highScoreElement.innerHTML = `Actual: <span id="current-score-val">0</span> pts`;
    }
});

function startNewRound() {
    speechSynthesis.cancel();
    
    // Calcular longitud de secuencia adaptativa
    const nextDifficulty = analyzer.getNextDifficulty();
    sequenceLength = Math.floor(3 + nextDifficulty.level);
    sequenceLength = Math.min(sequenceLength, 6);
    sequenceLength = Math.max(sequenceLength, 3);
    
    clearSelection();
    document.getElementById('feedback').classList.remove('show');
    document.getElementById('feedback').style.display = 'none';
    
    updateUI();
    generateNewSequence();
    gameStarted = false;
    selectedSequence = [];
    updateSelectedSequence();

    // Asegurar que las imágenes estén visibles
    const imagesGrid = document.getElementById('images-grid');
    imagesGrid.style.opacity = '1';
    imagesGrid.style.pointerEvents = 'auto';

    document.getElementById('play-button').style.display = 'inline-flex';
    document.getElementById('repeat-button').style.display = 'none';
    document.getElementById('check-button').style.display = 'none';
}

function updateUI() {
    document.getElementById('current-round').textContent = currentRound + 1;
    document.getElementById('total-rounds').textContent = totalRounds;
    document.getElementById('current-score-val').textContent = score;

    const progress = ((currentRound + 1) / totalRounds) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';

    const badgeElement = document.getElementById('difficulty-badge');
    const nextDifficulty = analyzer.getNextDifficulty();
    const levelText = Math.round(nextDifficulty.level * 10) / 10;
    badgeElement.textContent = 'Dificultad Adaptativa: ' + levelText + ' ★';
    badgeElement.className = 'difficulty-badge adaptive';

    const instructionElement = document.getElementById('instruction-text');
    let instructionText = 'Escucha ' + sequenceLength + ' palabras y selecciona las imágenes en orden • ' + nextDifficulty.recommendation;
    instructionElement.textContent = instructionText;
}

function generateNewSequence() {
    const keys = Object.keys(wordDatabase);
    currentSequence = [];
    
    while (currentSequence.length < sequenceLength) {
        const randomWord = keys[Math.floor(Math.random() * keys.length)];
        if (!currentSequence.includes(randomWord)) {
            currentSequence.push(randomWord);
        }
    }

    allWords = [...currentSequence];
    
    while (allWords.length < 4) {
        const randomWord = keys[Math.floor(Math.random() * keys.length)];
        if (!allWords.includes(randomWord)) {
            allWords.push(randomWord);
        }
    }

    allWords = allWords.sort(() => Math.random() - 0.5);

    renderImages();
}

function renderImages() {
    const grid = document.getElementById('images-grid');
    grid.innerHTML = '';

    allWords.forEach((word, index) => {
        const card = document.createElement('div');
        card.className = 'image-card';
        card.setAttribute('data-index', index + 1);
        card.innerHTML = `
            <img src="${wordDatabase[word]}" alt="${word}">
            <div class="image-label">${word}</div>
            <div class="visual-cue" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 48px; animation: pulse 1.5s infinite;">•</div>
        `;
        card.addEventListener('click', () => selectImage(word, card));
        grid.appendChild(card);
    });
}

function showVisualCuesIfNeeded() {
    if (!analyzer.showVisualCues) return;

    const cards = document.querySelectorAll('.image-card');
    let delay = 500;

    currentSequence.forEach((word, index) => {
        setTimeout(() => {
            cards.forEach(card => {
                if (card.querySelector('.image-label').textContent === word) {
                    const cue = card.querySelector('.visual-cue');
                    cue.style.display = 'block';
                    cue.style.color = getColorForPosition(index);
                    
                    setTimeout(() => {
                        cue.style.display = 'none';
                    }, 800);
                }
            });
        }, delay);
        delay += 1500;
    });
}

function getColorForPosition(index) {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
    return colors[index % colors.length];
}

function selectImage(word, element) {
    if (isAnalyzing) return;
    if (!gameStarted) return;

    if (selectedSequence.includes(word)) {
        selectedSequence = selectedSequence.filter(w => w !== word);
        element.classList.remove('selected');
    } else {
        if (selectedSequence.length < sequenceLength) {
            selectedSequence.push(word);
            element.classList.add('selected');
        }
    }

    updateSelectedSequence();

    if (selectedSequence.length === sequenceLength) {
        document.getElementById('check-button').style.display = 'inline-flex';
    } else {
        document.getElementById('check-button').style.display = 'none';
    }
}

function updateSelectedSequence() {
    const container = document.getElementById('selected-items');
    
    if (selectedSequence.length === 0) {
        container.innerHTML = '<span style="color: #9CA3AF;">Selecciona las imágenes en orden</span>';
        return;
    }

    container.innerHTML = selectedSequence.map((word, index) => `
        <div class="selected-item">
            ${index + 1}. ${word}
            <button class="remove-btn" onclick="removeFromSelection(${index})">×</button>
        </div>
    `).join('');
}

function removeFromSelection(index) {
    selectedSequence.splice(index, 1);
    updateSelectedSequence();
    
    const cards = document.querySelectorAll('.image-card');
    cards.forEach(card => card.classList.remove('selected', 'incorrect'));
    
    selectedSequence.forEach(word => {
        cards.forEach(card => {
            if (card.querySelector('.image-label').textContent === word) {
                card.classList.add('selected');
            }
        });
    });

    document.getElementById('check-button').style.display = 'none';
}

function clearSelection() {
    selectedSequence = [];
    updateSelectedSequence();
    
    document.querySelectorAll('.image-card').forEach(card => {
        card.classList.remove('selected', 'incorrect');
    });
    
    document.getElementById('check-button').style.display = 'none';
}

function playSequence() {
    if (gameStarted) return;
    
    gameStarted = true;
    roundStartTime = performance.now();
    
    // Ocultar imágenes mientras se reproduce el audio
    const imagesGrid = document.getElementById('images-grid');
    imagesGrid.style.opacity = '0';
    imagesGrid.style.pointerEvents = 'none';
    
    const utterances = currentSequence.map(word => word);
    const nextDifficulty = analyzer.getNextDifficulty();
    const speechRate = nextDifficulty.speedMultiplier;
    
    playSequenceAudio(utterances, 0, speechRate);
}

function playSequenceAudio(words, index, speechRate) {
    if (index >= words.length) {
        // Mostrar imágenes cuando termina el audio
        const imagesGrid = document.getElementById('images-grid');
        imagesGrid.style.opacity = '1';
        imagesGrid.style.pointerEvents = 'auto';
        imagesGrid.style.transition = 'opacity 0.5s ease';
        
        document.getElementById('repeat-button').style.display = 'inline-flex';
        
        // Mostrar pistas visuales después de la reproducción si está habilitado
        if (analyzer.showVisualCues) {
            setTimeout(() => {
                showVisualCuesIfNeeded();
            }, 500);
        }
        return;
    }

    const utterance = new SpeechSynthesisUtterance(words[index]);
    utterance.lang = 'es-ES';
    utterance.rate = speechRate;
    utterance.pitch = 1;

    utterance.onend = () => {
        setTimeout(() => {
            playSequenceAudio(words, index + 1, speechRate);
        }, 800);
    };

    speechSynthesis.speak(utterance);
}

function repeatSequence() {
    clearSelection();
    
    // Ocultar imágenes nuevamente
    const imagesGrid = document.getElementById('images-grid');
    imagesGrid.style.opacity = '0';
    imagesGrid.style.pointerEvents = 'none';
    
    gameStarted = true;
    roundStartTime = performance.now();
    
    const utterances = currentSequence.map(word => word);
    const nextDifficulty = analyzer.getNextDifficulty();
    const speechRate = nextDifficulty.speedMultiplier;
    
    playSequenceAudio(utterances, 0, speechRate);
}

function checkAnswer() {
    if (isAnalyzing || selectedSequence.length !== sequenceLength) return;
    
    isAnalyzing = true;
    const timeElapsed = performance.now() - roundStartTime;

    const result = analyzer.analyze(currentSequence, selectedSequence, timeElapsed);
    
    showFeedback(result);
    
    score += result.score;
    const scoreVal = document.getElementById('current-score-val');
    if (scoreVal) scoreVal.textContent = score;

    if (!result.isCorrect) {
        const cards = document.querySelectorAll('.image-card');
        selectedSequence.forEach(word => {
            cards.forEach(card => {
                if (card.querySelector('.image-label').textContent === word && 
                    currentSequence.indexOf(word) !== selectedSequence.indexOf(word)) {
                    card.classList.add('incorrect');
                }
            });
        });
    }

    document.getElementById('check-button').style.display = 'none';

    setTimeout(() => {
        document.getElementById('feedback').classList.remove('show');
        document.getElementById('feedback').style.display = 'none';
        isAnalyzing = false;
        
        if (currentRound + 1 >= totalRounds) {
            completeGame();
        } else {
            currentRound++;
            startNewRound();
        }
    }, 3500);
}

function showFeedback(result) {
    const feedbackElement = document.getElementById('feedback');
    const feedbackMessage = document.getElementById('feedback-message');
    const feedbackDetail = document.getElementById('feedback-detail');
    const analysisBox = document.getElementById('analysis-box');

    feedbackMessage.textContent = result.feedback.emoji + ' ' + result.feedback.message;
    feedbackDetail.textContent = result.feedback.details.join(' • ');

    let analysisHTML = '<div class="stat-row"><span class="stat-label">Exactitud:</span><span class="stat-value">' + result.accuracy.toFixed(0) + '%</span></div>';
    analysisHTML += '<div class="stat-row"><span class="stat-label">Memorizadas:</span><span class="stat-value">' + result.analysis.memorized + '</span></div>';
    analysisHTML += '<div class="stat-row"><span class="stat-label">Tiempo:</span><span class="stat-value">' + result.analysis.responseTime + '</span></div>';
    analysisHTML += '<div class="stat-row"><span class="stat-label">Velocidad:</span><span class="stat-value">' + result.analysis.processingSpeed + '</span></div>';
    analysisHTML += '<div class="stat-row"><span class="stat-label">Puntos:</span><span class="stat-value">' + result.score + ' pts</span></div>';
    analysisHTML += '<div class="stat-row"><span class="stat-label">IA Detectó:</span><span class="stat-value">' + result.nextDifficulty.recommendation + '</span></div>';

    analysisBox.innerHTML = analysisHTML;

    feedbackElement.className = result.isCorrect ? 'feedback show correct' : 'feedback show incorrect';
    feedbackElement.style.display = 'block';
}

async function completeGame() {
    const mainCard = document.getElementById('main-card');
    const report = analyzer.getSessionReport();

    // 1. Preparar el objeto para la API
    const gameData = {
        gameId: 'memoria-auditiva-1', // ID único para este minijuego
        style: 'auditivo',
        level: Math.round(analyzer.difficultyLevel), // Nivel adaptativo final
        score: score,
        accuracy: report.averageAccuracy,
        responseTime: report.averageResponseTime
    };

    // 2. Mostrar estado de carga en la UI
    mainCard.innerHTML = '<div class="game-completed"><h2>Guardando tu progreso...</h2></div>';

    try {
        // 3. Enviar a la API (usando tu instancia global 'api')
        await api.saveGameResults(gameData);
        console.log("Resultados guardados con éxito");
    } catch (error) {
        console.error("Error al guardar en el backend:", error);
        // No bloqueamos al usuario, permitimos ver su reporte aunque falle la red
    }

    // 4. Mostrar el reporte final (tu HTML original mejorado)
    let html = '<div class="game-completed">';
    html += '<h2 style="margin-bottom: 20px; color: #0066CC;">¡Juego Completado!</h2>';
    html += '<div class="final-score"><h2>Puntuación Final:</h2><div class="score-number">' + score + '</div><p>puntos</p></div>';
    html += '<div class="analysis-box">';
    html += '<h3 style="text-align: center; margin-bottom: 15px; color: #0066CC;">📊 Análisis de Desempeño</h3>';
    html += '<div class="stat-row"><span class="stat-label">📌 Memoria Auditiva:</span><span class="stat-value">' + report.auditoryMemoryScore + '%</span></div>';
    html += '<div class="stat-row"><span class="stat-label">⚡ Velocidad Promedio:</span><span class="stat-value">' + report.averageResponseTime + 'ms</span></div>';
    html += '</div>';
    html += '<div class="options-container" style="margin-top: 20px;">';
    html += '<button class="option-button primary" onclick="location.reload()">Jugar de Nuevo</button>';
    html += '<button class="option-button blue" onclick="goToMainPage()">' + gs('back','Volver') + '</button>';
    html += '</div></div>';

    mainCard.innerHTML = html;
}

function goToMainPage() {
    window.location.href = '../../../../selectores/selector-auditivo.html';
}

// Event Listeners
document.getElementById('play-button').addEventListener('click', playSequence);
document.getElementById('repeat-button').addEventListener('click', repeatSequence);
document.getElementById('check-button').addEventListener('click', checkAnswer);
