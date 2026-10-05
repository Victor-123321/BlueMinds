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
// ANALIZADOR DE COMPRENSIÓN AUDITIVA CON IA ADAPTATIVA
// ========================

class AdaptiveComprehensionAnalyzer {
    constructor() {
        this.sessionStats = {
            totalAttempts: 0,
            correctAttempts: 0,
            totalTime: 0,
            averageAccuracy: 0,
            comprehensionScore: 0,
            semanticConfusions: 0,
            responseLatency: 0
        };
        this.attempts = [];
        this.difficultyLevel = 1;
        this.speedMultiplier = 0.7;
        this.showVisualSupport = false;
        this.sentenceComplexity = 'simple';
    }

    analyze(sentence, selectedOption, correctOption, timeElapsed, distractors) {
        const isCorrect = selectedOption === correctOption;
        
        // Detectar confusiones semánticas
        const semanticConfusion = this.detectSemanticConfusion(selectedOption, correctOption, distractors);
        
        // Calcular respuesta basada en exactitud
        const accuracy = isCorrect ? 100 : this.calculatePartialAccuracy(selectedOption, correctOption, distractors);
        
        // Generar score
        const score = this.generateScore(accuracy, isCorrect, timeElapsed);
        
        // Registrar intento
        const attempt = {
            timestamp: new Date(),
            sentence: sentence,
            selectedOption: selectedOption,
            correctOption: correctOption,
            isCorrect: isCorrect,
            accuracy: accuracy,
            timeElapsed: timeElapsed,
            semanticConfusion: semanticConfusion,
            score: score
        };
        
        this.attempts.push(attempt);
        this.updateSessionStats(attempt);
        this.adaptDifficulty();
        
        return {
            isCorrect: isCorrect,
            accuracy: accuracy,
            score: score,
            timeElapsed: timeElapsed,
            feedback: this.generateFeedback(isCorrect, semanticConfusion),
            analysis: this.generateAnalysis(attempt),
            nextDifficulty: this.getNextDifficulty()
        };
    }

    generateScore(accuracy, isCorrect, timeElapsed) {
        let baseScore = accuracy;
        
        if (isCorrect) {
            baseScore += 25;
        }
        
        if (timeElapsed < 3000) {
            baseScore += 15;
        } else if (timeElapsed < 6000) {
            baseScore += 10;
        } else if (timeElapsed < 10000) {
            baseScore += 5;
        }
        
        return Math.min(100, Math.round(baseScore));
    }

    detectSemanticConfusion(selectedOption, correctOption, distractors) {
        // Detectar si hubo confusión semántica
        if (selectedOption === correctOption) {
            return 'Ninguna - Respuesta correcta';
        }
        
        // Verificar si es un distractor relacionado
        const relatedDisractors = distractors.filter(d => this.isSemanticRelated(d.word, correctOption));
        if (relatedDisractors.some(d => d.word === selectedOption)) {
            return 'Confusión semántica leve';
        }
        
        return 'Confusión semántica';
    }

    isSemanticRelated(word1, word2) {
        const relatedPairs = {
            'pescado': ['hueso', 'leche'],
            'hueso': ['pescado', 'carne'],
            'leche': ['queso', 'mantequilla'],
            'manzana': ['pera', 'naranja'],
            'gato': ['perro', 'ratón']
        };
        
        return relatedPairs[word1]?.includes(word2) || relatedPairs[word2]?.includes(word1);
    }

    calculatePartialAccuracy(selected, correct, distractors) {
        // Si es un distractor relacionado, otorgar parcial
        if (this.isSemanticRelated(selected, correct)) {
            return 60;
        }
        return 20;
    }

    generateScore(accuracy, isCorrect, timeElapsed) {
        let baseScore = accuracy;
        
        if (isCorrect) {
            baseScore += 25;
        }
        
        if (timeElapsed < 3000) {
            baseScore += 15;
        } else if (timeElapsed < 6000) {
            baseScore += 10;
        } else if (timeElapsed < 10000) {
            baseScore += 5;
        }
        
        return Math.min(100, Math.round(baseScore));
    }

    generateFeedback(isCorrect, semanticConfusion) {
        let emoji = '';
        let message = '';
        let details = [];
        
        if (isCorrect) {
            emoji = '🎉';
            message = '¡Excelente! Comprensión correcta';
            details.push('Entendiste perfectamente el significado de la oración');
        } else if (semanticConfusion === 'Confusión semántica leve') {
            emoji = '👍';
            message = 'Buena intención, pero no es la respuesta correcta';
            details.push('La palabra que elegiste tiene relación, pero no completa bien la oración');
            details.push('Piensa en qué palabra tiene más sentido en el contexto');
        } else {
            emoji = '💭';
            message = 'Necesitas reflexionar más';
            details.push('Recuerda que la palabra debe tener sentido en la oración');
            details.push('Intenta nuevamente escuchando con más atención');
        }
        
        return {
            emoji: emoji,
            message: message,
            details: details
        };
    }

    generateAnalysis(attempt) {
        return {
            comprehension: attempt.isCorrect ? 'Completa' : 'Parcial',
            semantic: attempt.semanticConfusion,
            responseTime: Math.round(attempt.timeElapsed) + 'ms',
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
        this.sessionStats.comprehensionScore = 
            (this.sessionStats.correctAttempts / this.sessionStats.totalAttempts) * 100;
        this.sessionStats.responseLatency = this.sessionStats.totalTime / this.sessionStats.totalAttempts;
    }

    adaptDifficulty() {
        if (this.sessionStats.totalAttempts < 2) return;
        
        const comprehension = this.sessionStats.comprehensionScore;
        
        if (comprehension >= 85) {
            // Aumentar dificultad
            this.difficultyLevel = Math.min(5, this.difficultyLevel + 0.5);
            this.speedMultiplier = Math.max(0.7, this.speedMultiplier - 0.1);
            this.showVisualSupport = false;
            this.sentenceComplexity = 'complex';
        } else if (comprehension >= 70) {
            // Mantener dificultad
            this.difficultyLevel = Math.max(1, this.difficultyLevel);
            this.speedMultiplier = 0.85;
            this.showVisualSupport = false;
            this.sentenceComplexity = 'medium';
        } else if (comprehension >= 50) {
            // Reducir dificultad
            this.difficultyLevel = Math.max(1, this.difficultyLevel - 0.3);
            this.speedMultiplier = Math.min(0.95, this.speedMultiplier + 0.1);
            this.showVisualSupport = true;
            this.sentenceComplexity = 'simple';
        } else {
            // Reducir significativamente
            this.difficultyLevel = Math.max(1, this.difficultyLevel - 0.5);
            this.speedMultiplier = 1.0;
            this.showVisualSupport = true;
            this.sentenceComplexity = 'very_simple';
        }
    }

    getNextDifficulty() {
        return {
            level: Math.round(this.difficultyLevel * 10) / 10,
            speedMultiplier: this.speedMultiplier,
            showVisualSupport: this.showVisualSupport,
            sentenceComplexity: this.sentenceComplexity,
            recommendation: this.generateRecommendation()
        };
    }

    generateRecommendation() {
        if (this.sessionStats.comprehensionScore >= 85) {
            return 'Excelente comprensión. Aumentando dificultad.';
        } else if (this.sessionStats.comprehensionScore >= 70) {
            return 'Buena comprensión. Continúa así.';
        } else if (this.sessionStats.comprehensionScore >= 50) {
            return 'Comprensión en desarrollo. Mostrando ayudas.';
        } else {
            return 'Comprensión en entrenamiento. Simplificando oraciones.';
        }
    }

    getSessionReport() {
        return {
            totalAttempts: this.sessionStats.totalAttempts,
            correctAttempts: this.sessionStats.correctAttempts,
            comprehensionScore: Math.round(this.sessionStats.comprehensionScore),
            averageAccuracy: Math.round(this.sessionStats.averageAccuracy),
            averageResponseTime: Math.round(this.sessionStats.responseLatency)
        };
    }
}

// ========================
// BASE DE DATOS DE ORACIONES
// ========================

const sentenceDatabase = {
    very_simple: [
        {
            simple: 'El gato come...',
            medium: 'El gato toma leche y come...',
            complex: 'El gato maúlla tristemente porque no encuentra su comida y le encanta comer...',
            correctAnswer: 'pescado',
            image: 'https://img.freepik.com/vector-premium/lindo-gato-comiendo-pescado-dibujos-animados-vector-ilustracion_9845-581.jpg?w=400',
            options: [
                { word: 'pescado', image: 'https://static.vecteezy.com/system/resources/previews/002/174/077/original/fish-cartoon-style-isolated-free-vector.jpg?w=300' },
                { word: 'martillo', image: 'https://img.freepik.com/vector-gratis/diseno-etiqueta-martillo-garra-aislado_1308-61820.jpg?w=300' },
                { word: 'pelota', image: 'https://wallpaperaccess.com/full/6273127.png?w=300' }
            ]
        },
        {
            simple: 'El niño bebe...',
            medium: 'El niño tiene mucha sed y bebe...',
            complex: 'Después de jugar en el parque todo el día, el niño cansado y sediento decide beber...',
            correctAnswer: 'agua',
            image: 'https://img.freepik.com/vector-premium/ilustracion-vectorial-nino-bebiendo-agua-estilo-diseno-plano_844724-4072.jpg?w=400',
            options: [
                { word: 'agua', image: 'https://thumbs.dreamstime.com/z/glass-water-cartoon-vector-illustration-144223612.jpg?w=300' },
                { word: 'zumo', image: 'https://thumbs.dreamstime.com/z/estilo-de-dibujos-animados-iconos-zumo-naranja-tropical-icono-del-jugo-caricatura-vector-para-el-dise%C3%B1o-web-aislado-en-fondo-176870364.jpg?w=300' },
                { word: 'leche', image: 'https://clipground.com/images/milk-glass-clipart-4.jpg?w=300' }
            ]
        },
        {
            simple: 'La flor es...',
            medium: 'La flor en el jardín es muy...',
            complex: 'La flor silvestre que crece en el jardín es extraordinariamente...',
            correctAnswer: 'bella',
            image: 'https://i.pinimg.com/736x/30/9f/75/309f75498f8b6e50bea5904d16493593--cartoon-flowers-jigsaw-puzzles.jpg?w=400',
            options: [
                { word: 'bella', image: 'https://img.freepik.com/vector-premium/dibujo-dibujos-animados-flor-rosa-centro-amarillo_1167562-3170.jpg?w=300' },
                { word: 'metalica', image: 'https://cdn.pixabay.com/photo/2012/04/18/12/17/metal-36867_1280.png?w=300' },
                { word: 'fuego', image: 'https://static.vecteezy.com/system/resources/previews/008/063/039/non_2x/fire-cartoon-element-vector.jpg?w=300' }
            ]
        },
        {
            simple: 'El pájaro vuela en...',
            medium: 'El pájaro extiende sus alas y vuela libre en...',
            complex: 'El hermoso pájaro de colores brillantes extiende sus alas majestuosamente y vuela en...',
            correctAnswer: 'el cielo',
            image: 'https://img.freepik.com/vector-gratis/fondo-pajaros-azules-volando_23-2147739864.jpg?w=400',
            options: [
                { word: 'el cielo', image: 'https://img.freepik.com/vector-gratis/ilustracion-diaria-nubes-cielo-cirros-dibujos-animados-cumulos-nubes-blancas-rayos-sol-ilustracion_1284-62767.jpg?size=626&ext=jpg?w=300' },
                { word: 'el mar', image: 'https://image.freepik.com/vector-gratis/dibujos-animados-naturaleza-paisaje-mar_107173-7110.jpg?w=300' },
                { word: 'la cueva', image: 'https://static.vecteezy.com/system/resources/previews/026/717/887/original/cave-cartoon-illustration-vector.jpg?w=300' }
            ]
        },
        {
            simple: 'Los niños juegan en...',
            medium: 'Los niños felices juegan y ríen en...',
            complex: 'Los niños llenos de energía y alegría juegan corriendo y brincando en...',
            correctAnswer: 'el parque',
            image: 'https://static.vecteezy.com/system/resources/previews/001/943/139/non_2x/kids-playing-at-the-park-vector.jpg?w=400',
            options: [
                { word: 'el parque', image: 'https://c8.alamy.com/comp/2HB036D/playground-park-design-with-games-2HB036D.jpg?w=300' },
                { word: 'la escuela', image: 'https://static.vecteezy.com/system/resources/previews/008/734/924/large_2x/cartoon-group-of-elementary-school-kids-in-the-school-yard-vector.jpg?w=300' },
                { word: 'la casa', image: 'https://static.vecteezy.com/system/resources/previews/025/902/050/original/house-cartoon-style-illustration-ai-generated-vector.jpg?w=300' }
            ]
        }
    ]
};

// ========================
// VARIABLES DEL JUEGO
// ========================

let currentQuestion = 0;
let score = 0;
let currentSentence = null;
let selectedOption = null;
let gameStarted = false;
let isAnalyzing = false;
let questionStartTime = 0;

const analyzer = new AdaptiveComprehensionAnalyzer();
const totalQuestions = 5;

// ========================
// INICIALIZACIÓN
// ========================

document.addEventListener('DOMContentLoaded', async function() {
    startNewQuestion();

  const gameId = 'comprension-auditiva-1';
    const highScoreElement = document.getElementById('score-display');
    
    try {
        const bestScore = await api.getBestScore(gameId);
        highScoreElement.innerHTML = `🏆 Récord: ${bestScore} pts | <span id="current-score-val">0</span> pts`;
    } catch (e) {
        highScoreElement.innerHTML = `Actual: <span id="current-score-val">0</span> pts`;
    }
});

function startNewQuestion() {
    speechSynthesis.cancel();
    
    const nextDifficulty = analyzer.getNextDifficulty();
    const complexity = nextDifficulty.sentenceComplexity;
    
    // Seleccionar oración aleatoria
    const sentences = sentenceDatabase[complexity] || sentenceDatabase.very_simple;
    currentSentence = sentences[Math.floor(Math.random() * sentences.length)];
    
    selectedOption = null;
    gameStarted = false;
    
    document.getElementById('feedback').classList.remove('show');
    document.getElementById('feedback').style.display = 'none';
    document.getElementById('visual-support').style.display = 'none';
    
    updateUI();
    renderOptions();

    document.getElementById('play-button').style.display = 'inline-flex';
    document.getElementById('repeat-button').style.display = 'none';
}

function updateUI() {
    document.getElementById('current-question').textContent = currentQuestion + 1;
    document.getElementById('total-questions').textContent = totalQuestions;
    document.getElementById('score').textContent = score + ' ' + gs('points', 'puntos');
    document.getElementById('score-display').textContent = score + ' ' + gs('points', 'puntos');

    const progress = ((currentQuestion + 1) / totalQuestions) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';

    const badgeElement = document.getElementById('difficulty-badge');
    const nextDifficulty = analyzer.getNextDifficulty();
    const levelText = Math.round(nextDifficulty.level * 10) / 10;
    badgeElement.textContent = 'Comprensión: ' + levelText + ' ★';
    badgeElement.className = 'difficulty-badge adaptive';

    const instructionElement = document.getElementById('instruction-text');
    instructionElement.textContent = nextDifficulty.recommendation;
}

function renderOptions() {
    const grid = document.getElementById('options-grid');
    grid.innerHTML = '';
    
    const options = currentSentence.options.sort(() => Math.random() - 0.5);
    
    options.forEach(option => {
        const card = document.createElement('div');
        card.className = 'option-card';
        card.innerHTML = `
            <img src="${option.image}" alt="${option.word}">
            <div class="option-card-label">${option.word}</div>
        `;
        card.addEventListener('click', () => selectOption(option.word, card));
        grid.appendChild(card);
    });
}

function selectOption(word, element) {
    if (isAnalyzing || !gameStarted) return;
    
    // Remover selección anterior
    document.querySelectorAll('.option-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    selectedOption = word;
    element.classList.add('selected');
    
    // Verificar respuesta inmediatamente
    setTimeout(() => {
        checkAnswer();
    }, 500);
}

function playSentence() {
    if (gameStarted) return;
    
    gameStarted = true;
    questionStartTime = performance.now();
    
    const nextDifficulty = analyzer.getNextDifficulty();
    const speechRate = nextDifficulty.speedMultiplier;
    
    // Seleccionar la oración según complejidad
    let sentenceText = '';
    if (nextDifficulty.sentenceComplexity === 'very_simple') {
        sentenceText = currentSentence.simple;
    } else if (nextDifficulty.sentenceComplexity === 'simple') {
        sentenceText = currentSentence.medium;
    } else {
        sentenceText = currentSentence.complex;
    }
    
    // Reproducir oración
    const utterance = new SpeechSynthesisUtterance(sentenceText);
    utterance.lang = 'es-ES';
    utterance.rate = speechRate;
    utterance.pitch = 1;
    
    utterance.onend = () => {
        // Mostrar apoyo visual si es necesario
        if (nextDifficulty.showVisualSupport) {
            showVisualSupport();
        }
        document.getElementById('repeat-button').style.display = 'inline-flex';
    };
    
    speechSynthesis.speak(utterance);
}

function showVisualSupport() {
    const visualSupport = document.getElementById('visual-support');
    const visualImage = document.getElementById('visual-image');
    visualImage.src = currentSentence.image;
    visualSupport.style.display = 'block';
}

function repeatSentence() {
    selectedOption = null;
    document.querySelectorAll('.option-card').forEach(card => {
        card.classList.remove('selected', 'correct', 'incorrect');
    });
    
    playSentence();
}

function checkAnswer() {
    if (isAnalyzing || !selectedOption) return;
    
    isAnalyzing = true;
    const timeElapsed = performance.now() - questionStartTime;
    
    const result = analyzer.analyze(
        currentSentence.simple,
        selectedOption,
        currentSentence.correctAnswer,
        timeElapsed,
        currentSentence.options
    );
    
    // Aplicar estilos de corrección
    const cards = document.querySelectorAll('.option-card');
    cards.forEach(card => {
        const label = card.querySelector('.option-card-label').textContent;
        if (label === currentSentence.correctAnswer) {
            card.classList.add('correct');
        } else if (label === selectedOption && selectedOption !== currentSentence.correctAnswer) {
            card.classList.add('incorrect');
        }
    });
    
    showFeedback(result);
    
    score += result.score;
    document.getElementById('score').textContent = score + ' ' + gs('points', 'puntos');
    document.getElementById('score-display').textContent = score + ' ' + gs('points', 'puntos');
    
    document.getElementById('repeat-button').style.display = 'none';
    document.getElementById('play-button').style.display = 'none';
    
    setTimeout(() => {
        document.getElementById('feedback').classList.remove('show');
        document.getElementById('feedback').style.display = 'none';
        isAnalyzing = false;
        
        if (currentQuestion + 1 >= totalQuestions) {
            completeGame();
        } else {
            currentQuestion++;
            startNewQuestion();
        }
    }, 3500);
}
function playFeedbackSound(isCorrect) {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(isCorrect ? "¡Sí!" : "¡Oh!");
    utterance.volume = 0.5;
    utterance.pitch = isCorrect ? 1.5 : 0.5;
    utterance.rate = 2;
    synth.speak(utterance);
}

function showFeedback(result) {
    const feedbackElement = document.getElementById('feedback');
    const feedbackMessage = document.getElementById('feedback-message');
    const feedbackDetail = document.getElementById('feedback-detail');
    const analysisBox = document.getElementById('analysis-box');
    
    feedbackMessage.textContent = result.feedback.emoji + ' ' + result.feedback.message;
    feedbackDetail.textContent = result.feedback.details.join(' • ');
    
    let analysisHTML = '<div class="stat-row"><span class="stat-label">Exactitud:</span><span class="stat-value">' + result.accuracy.toFixed(0) + '%</span></div>';
    analysisHTML += '<div class="stat-row"><span class="stat-label">Comprensión:</span><span class="stat-value">' + result.analysis.comprehension + '</span></div>';
    analysisHTML += '<div class="stat-row"><span class="stat-label">Tipo:</span><span class="stat-value">' + result.analysis.semantic + '</span></div>';
    analysisHTML += '<div class="stat-row"><span class="stat-label">Tiempo:</span><span class="stat-value">' + result.analysis.responseTime + '</span></div>';
    analysisHTML += '<div class="stat-row"><span class="stat-label">Puntos:</span><span class="stat-value">' + result.score + ' pts</span></div>';
    
    analysisBox.innerHTML = analysisHTML;
    
    feedbackElement.className = result.isCorrect ? 'feedback show correct' : 'feedback show incorrect';
    feedbackElement.style.display = 'block';
    playFeedbackSound(result.isCorrect);
}

async function completeGame() {
    const mainCard = document.getElementById('main-card');
    const report = analyzer.getSessionReport();
    const gameId = 'comprension-auditiva-1';

    // Preparar datos para la API
    const gameData = {
        gameId: gameId,
        style: 'auditivo',
        level: Math.round(analyzer.difficultyLevel),
        score: score,
        accuracy: report.averageAccuracy,
        responseTime: report.averageResponseTime
    };

    mainCard.innerHTML = '<div class="game-completed"><h2>Guardando progreso...</h2></div>';

    try {
        await api.saveGameResults(gameData);
    } catch (error) {
        console.error("Error al guardar:", error);
    }

    // Mostrar el reporte final
    let html = `
        <div class="game-completed">
            <h2 style="margin-bottom: 20px; color: #0066CC;">¡Comprensión Completada!</h2>
            <div class="final-score">
                <h2>Puntuación Final:</h2>
                <div class="score-number">${score}</div>
                <p>puntos</p>
            </div>
            <div class="analysis-box">
                <h3 style="text-align: center; margin-bottom: 15px; color: #0066CC;">📊 Análisis de Desempeño</h3>
                <div class="stat-row"><span class="stat-label">📌 Comprensión:</span><span class="stat-value">${report.comprehensionScore}%</span></div>
                <div class="stat-row"><span class="stat-label">🎯 Exactitud:</span><span class="stat-value">${report.averageAccuracy}%</span></div>
                <div class="stat-row"><span class="stat-label">⚡ Velocidad:</span><span class="stat-value">${report.averageResponseTime}ms</span></div>
            </div>
            <div class="options-container" style="margin-top: 20px;">
                <button class="option-button primary" onclick="location.reload()">Jugar de Nuevo</button>
                <button class="option-button blue" onclick="goToMainPage()">' + gs('back','Volver') + '</button>
            </div>
        </div>`;
    
    mainCard.innerHTML = html;
}

function goToMainPage() {
    window.location.href = '../../../../selectores/selector-auditivo.html';
}

// Event Listeners
document.getElementById('play-button').addEventListener('click', playSentence);
document.getElementById('repeat-button').addEventListener('click', repeatSentence);
