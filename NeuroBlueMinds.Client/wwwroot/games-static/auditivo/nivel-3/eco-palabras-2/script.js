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
// ANALIZADOR DE IMITACIÓN AUDITIVA CON IA ADAPTATIVA
// ========================

class AdaptiveAnimalSoundAnalyzer {
    constructor() {
        this.sessionStats = {
            totalAttempts: 0,
            correctAttempts: 0,
            averageAccuracy: 0,
            discriminationScore: 0,
            imitationScore: 0,
            confusionCount: 0
        };
        this.attempts = [];
        this.difficultyLevel = 1;
        this.soundClarity = 0.8;
        this.auditoryFilterLevel = 'none';
        this.currentDifficulty = 'easy';
    }

    analyze(animalName, expectedSound, recordedSound, timeElapsed) {
        const isCorrect = this.compareAnimalSounds(expectedSound, recordedSound);
        const accuracy = this.calculateSoundAccuracy(expectedSound, recordedSound);
        const similarity = this.calculateSimilarity(expectedSound, recordedSound);
        const confusion = this.detectSoundConfusion(expectedSound, recordedSound);
        
        const score = this.generateScore(accuracy, isCorrect, similarity);
        
        const attempt = {
            timestamp: new Date(),
            animal: animalName,
            expectedSound: expectedSound,
            recordedSound: recordedSound,
            isCorrect: isCorrect,
            accuracy: accuracy,
            similarity: similarity,
            confusion: confusion,
            score: score,
            timeElapsed: timeElapsed
        };
        
        this.attempts.push(attempt);
        this.updateSessionStats(attempt);
        this.adaptDifficulty();
        
        return {
            isCorrect: isCorrect,
            accuracy: accuracy,
            similarity: similarity,
            score: score,
            feedback: this.generateFeedback(isCorrect, accuracy, confusion),
            analysis: this.generateAnalysis(attempt),
            nextAdjustment: this.getNextAdjustment()
        };
    }

    compareAnimalSounds(expected, recorded) {
        const expectedLower = expected.toLowerCase().trim();
        const recordedLower = recorded.toLowerCase().trim();
        
        if (expectedLower === recordedLower) return true;
        
        const similarity = this.calculateSimilarity(expected, recorded);
        return similarity >= 75;
    }

    calculateSoundAccuracy(expected, recorded) {
        const expectedLower = expected.toLowerCase();
        const recordedLower = recorded.toLowerCase();
        
        let matches = 0;
        const minLen = Math.min(expectedLower.length, recordedLower.length);
        
        for (let i = 0; i < minLen; i++) {
            if (expectedLower[i] === recordedLower[i]) {
                matches++;
            }
        }
        
        return (matches / Math.max(expectedLower.length, recordedLower.length)) * 100;
    }

    calculateSimilarity(expected, recorded) {
        const expectedLower = expected.toLowerCase();
        const recordedLower = recorded.toLowerCase();
        
        const maxLen = Math.max(expectedLower.length, recordedLower.length);
        let matches = 0;
        
        for (let i = 0; i < Math.min(expectedLower.length, recordedLower.length); i++) {
            if (expectedLower[i] === recordedLower[i]) {
                matches++;
            }
        }
        
        if (recordedLower.includes(expectedLower) || expectedLower.includes(recordedLower)) {
            matches = Math.min(maxLen, matches + 10);
        }
        
        return Math.round((matches / maxLen) * 100);
    }

    detectSoundConfusion(expected, recorded) {
        const confusionPairs = {
            'guau': ['miau', 'quiquiriqui'],
            'miau': ['guau', 'pío'],
            'pío': ['miau', 'cua'],
            'muuu': ['beee', 'guau'],
            'beee': ['muuu', 'pío'],
            'quiquiriqui': ['guau', 'pío'],
            'cua': ['pío', 'muuu'],
            'sss': ['fff', 'zzz']
        };
        
        const expectedLower = expected.toLowerCase();
        const recordedLower = recorded.toLowerCase();
        
        if (confusionPairs[expectedLower]) {
            if (confusionPairs[expectedLower].includes(recordedLower)) {
                return 'Confusión auditiva con sonido similar';
            }
        }
        
        return 'Sin confusión detectada';
    }

    generateScore(accuracy, isCorrect, similarity) {
        let baseScore = accuracy;
        
        if (isCorrect) {
            baseScore += 30;
        }
        
        if (similarity >= 80) {
            baseScore += 15;
        } else if (similarity >= 60) {
            baseScore += 8;
        }
        
        return Math.min(100, Math.round(baseScore));
    }

    generateFeedback(isCorrect, accuracy, confusion) {
        let emoji = '';
        let message = '';
        let details = [];
        
        if (isCorrect) {
            emoji = '🎉';
            message = '¡Excelente imitación!';
            details.push('Reprodujiste perfectamente el sonido del animal');
        } else if (accuracy >= 75) {
            emoji = '👍';
            message = 'Muy cercano, casi perfecto';
            details.push('Tu imitación fue muy parecida al original');
            details.push('Intenta una vez más para perfeccionar');
        } else if (accuracy >= 50) {
            emoji = '📢';
            message = 'Necesitas practicar más';
            if (confusion !== 'Sin confusión detectada') {
                details.push('⚠️ ' + confusion);
            }
            details.push('Escucha bien el sonido y repite lentamente');
        } else {
            emoji = '💪';
            message = 'Sigue intentando';
            details.push('Escucha el sonido varias veces');
            details.push('Los sonidos de animales requieren práctica');
        }
        
        return {
            emoji: emoji,
            message: message,
            details: details
        };
    }

    generateAnalysis(attempt) {
        return {
            animal: attempt.animal,
            exactitud: Math.round(attempt.accuracy) + '%',
            similitud: attempt.similarity + '%',
            confusionDetectada: attempt.confusion,
            puntos: attempt.score
        };
    }

    updateSessionStats(attempt) {
        this.sessionStats.totalAttempts++;
        if (attempt.isCorrect) {
            this.sessionStats.correctAttempts++;
        }
        
        this.sessionStats.averageAccuracy = 
            (this.sessionStats.averageAccuracy * (this.sessionStats.totalAttempts - 1) + attempt.accuracy) / this.sessionStats.totalAttempts;
        
        this.sessionStats.discriminationScore = 
            (this.sessionStats.correctAttempts / this.sessionStats.totalAttempts) * 100;
        
        this.sessionStats.imitationScore = this.sessionStats.averageAccuracy;
        
        if (attempt.confusion !== 'Sin confusión detectada') {
            this.sessionStats.confusionCount++;
        }
    }

    adaptDifficulty() {
        if (this.sessionStats.totalAttempts < 2) return;
        
        const discriminationScore = this.sessionStats.discriminationScore;
        const imitationScore = this.sessionStats.imitationScore;
        
        if (discriminationScore >= 85 && imitationScore >= 80) {
            // Aumentar dificultad
            this.currentDifficulty = 'hard';
            this.soundClarity = Math.max(0.6, this.soundClarity - 0.1);
            this.auditoryFilterLevel = 'background-noise';
        } else if (discriminationScore >= 70 && imitationScore >= 70) {
            // Mantener dificultad
            this.currentDifficulty = 'medium';
            this.soundClarity = 0.8;
            this.auditoryFilterLevel = 'none';
        } else if (discriminationScore >= 50) {
            // Reducir ligeramente
            this.currentDifficulty = 'easy';
            this.soundClarity = Math.min(1.0, this.soundClarity + 0.1);
            this.auditoryFilterLevel = 'none';
        } else {
            // Reducir significativamente
            this.currentDifficulty = 'very-easy';
            this.soundClarity = 1.0;
            this.auditoryFilterLevel = 'visual-aid';
        }
    }

    getNextAdjustment() {
        return {
            difficulty: this.currentDifficulty,
            soundClarity: this.soundClarity,
            auditoryFilterLevel: this.auditoryFilterLevel,
            showMouthAnimation: this.auditoryFilterLevel === 'visual-aid',
            recommendation: this.generateRecommendation()
        };
    }

    generateRecommendation() {
        if (this.sessionStats.discriminationScore >= 85) {
            return '🌟 Excelente discriminación auditiva. Aumentando dificultad.';
        } else if (this.sessionStats.discriminationScore >= 70) {
            return '👂 Buena discriminación. Continúa así.';
        } else if (this.sessionStats.discriminationScore >= 50) {
            return '🎯 Discriminación en desarrollo. Mostrando ayudas visuales.';
        } else {
            return '📚 Discriminación en entrenamiento. Mejorando sonido.';
        }
    }

    getSessionReport() {
        return {
            totalAttempts: this.sessionStats.totalAttempts,
            correctAttempts: this.sessionStats.correctAttempts,
            averageAccuracy: Math.round(this.sessionStats.averageAccuracy),
            discriminationScore: Math.round(this.sessionStats.discriminationScore),
            imitationScore: Math.round(this.sessionStats.imitationScore),
            confusionsDetected: this.sessionStats.confusionCount
        };
    }
}

// ========================
// BASE DE DATOS DE ANIMALES
// ========================

const animalDatabase = {
    'perro': {
        image: 'https://png.pngtree.com/png-clipart/20231004/original/pngtree-cute-dog-puppy-cartoon-png-image_13098172.png?w=400',
        sound: 'guau',
        difficulty: 'easy'
    },
    'gato': {
        image: 'https://static.vecteezy.com/system/resources/previews/013/089/641/original/illustration-of-cute-colored-cat-cat-cartoon-image-in-eps10-format-suitable-for-children-s-book-design-elements-introduction-of-cats-to-children-books-or-posters-about-animal-vector.jpg?w=400',
        sound: 'miau',
        difficulty: 'easy'
    },
    'pájaro': {
        image: 'https://static.vecteezy.com/system/resources/previews/013/480/622/non_2x/cartoon-illustration-of-a-bird-vector.jpg?w=400',
        sound: 'pío',
        difficulty: 'easy'
    },
    'vaca': {
        image: 'https://img.freepik.com/premium-vector/cartoon-cow-with-black-spot-its-face-white-background_730620-516642.jpg?w=400',
        sound: 'muuu',
        difficulty: 'medium'
    },
    'oveja': {
        image: 'https://static.vecteezy.com/system/resources/previews/004/650/604/original/a-sheep-farm-animal-cartoon-sticker-free-vector.jpg?w=400',
        sound: 'beee',
        difficulty: 'medium'
    },
    'gallo': {
        image: 'https://image.freepik.com/vector-gratis/dibujos-animados-gallo-adorable_74769-26.jpg?w=400',
        sound: 'quiquiriqui',
        difficulty: 'hard'
    },
    'pato': {
        image: 'https://img.freepik.com/vetores-premium/pato-de-ilustracao-de-desenho-animado_323802-361.jpg?w=400',
        sound: 'cua',
        difficulty: 'medium'
    },
    'cerdo': {
        image: 'https://static.vecteezy.com/system/resources/previews/003/607/581/large_2x/pig-cartoon-cute-swine-illustration-vector.jpg?w=400',
        sound: 'oinc',
        difficulty: 'easy'
    }
};

// ========================
// VARIABLES DEL JUEGO
// ========================

let currentRound = 0;
let score = 0;
let currentAnimal = null;
let selectedOption = null;
let gameStarted = false;
let isRecording = false;
let hasPlayed = false;

const analyzer = new AdaptiveAnimalSoundAnalyzer();
const totalRounds = 5;
let recognition;

// ========================
// INICIALIZACIÓN
// ========================

document.addEventListener('DOMContentLoaded', function() {
    const gameId = 'imitacion-animales-1';
    api.getBestScore(gameId).then(bestScore => {
        document.getElementById('score-display').innerHTML = 
            `🏆 Récord: ${bestScore} pts | <span id="current-score-val">0</span> pts`;
    }).catch(() => {
        document.getElementById('score-display').innerHTML = `Actual: <span id="current-score-val">0</span> pts`;
    });
    setupSpeechRecognition();
    setupEventListeners();
    startNewRound();
});

function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript.toLowerCase().trim();
            analyzeImitation(transcript);
        };

        recognition.onerror = function(event) {
            console.error('Error:', event.error);
            showFeedback('Error al grabar', false);
            stopRecording();
        };
    }
}

function setupEventListeners() {
    document.getElementById('play-sound-button').addEventListener('click', playAnimalSound);
    document.getElementById('record-button').addEventListener('click', toggleRecording);
}

function startNewRound() {
    speechSynthesis.cancel();
    
    const nextAdjustment = analyzer.getNextAdjustment();
    const animals = Object.entries(animalDatabase).filter(([name, data]) => {
        if (nextAdjustment.difficulty === 'easy') return data.difficulty === 'easy';
        if (nextAdjustment.difficulty === 'very-easy') return data.difficulty === 'easy';
        if (nextAdjustment.difficulty === 'hard') return data.difficulty !== 'easy';
        return true;
    });
    
    const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
    currentAnimal = {
        name: randomAnimal[0],
        ...randomAnimal[1]
    };
    
    gameStarted = false;
    isRecording = false;
    hasPlayed = false;
    
    updateUI();
    setupAnimationIfNeeded();
}

function setupAnimationIfNeeded() {
    const nextAdjustment = analyzer.getNextAdjustment();
    const mouthAnimation = document.getElementById('mouth-animation');
    
    if (nextAdjustment.showMouthAnimation) {
        mouthAnimation.style.display = 'block';
    } else {
        mouthAnimation.style.display = 'none';
    }
}

function updateUI() {
    document.getElementById('current-round').textContent = currentRound + 1;
    document.getElementById('total-rounds').textContent = totalRounds;
    document.getElementById('score').textContent = score + ' ' + gs('points', 'puntos');
    document.getElementById('score-display').textContent = score + ' ' + gs('points', 'puntos');

    const progress = ((currentRound + 1) / totalRounds) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';

    document.getElementById('animal-name').textContent = currentAnimal.name.charAt(0).toUpperCase() + currentAnimal.name.slice(1);
    document.getElementById('animal-image').src = currentAnimal.image;

    const nextAdjustment = analyzer.getNextAdjustment();
    const badgeElement = document.getElementById('difficulty-badge');
    badgeElement.textContent = nextAdjustment.recommendation;

    document.getElementById('similarity-meter').style.display = 'none';
    document.getElementById('feedback').classList.remove('show');
    document.getElementById('recorded-text').style.display = 'none';

    const recordButton = document.getElementById('record-button');
    recordButton.innerHTML = '<i class="fas fa-microphone"></i> Grabar mi voz';
    recordButton.className = 'btn secondary';
    recordButton.style.display = 'none';
}

function playAnimalSound() {
    if (!currentAnimal) return;
    
    const playButton = document.getElementById('play-sound-button');
    playButton.innerHTML = '<i class="fas fa-volume-up"></i> Reproduciendo...';
    playButton.disabled = true;

    const nextAdjustment = analyzer.getNextAdjustment();
    const rate = nextAdjustment.soundClarity;
    
    const utterance = new SpeechSynthesisUtterance(currentAnimal.sound);
    utterance.lang = 'es-ES';
    utterance.rate = rate;
    utterance.pitch = 1;
    
    utterance.onend = function() {
        playButton.innerHTML = '<i class="fas fa-volume-up"></i> Escuchar Sonido';
        playButton.disabled = false;
        hasPlayed = true;
        
        document.getElementById('record-button').style.display = 'inline-flex';
        
        if (nextAdjustment.showMouthAnimation) {
            animateMouth();
        }
    };
    
    speechSynthesis.speak(utterance);
}

function animateMouth() {
    const mouthAnimation = document.getElementById('mouth-animation');
    mouthAnimation.style.display = 'block';
    
    setTimeout(() => {
        mouthAnimation.style.display = 'none';
    }, 2000);
}

function toggleRecording() {
    if (!hasPlayed) {
        showFeedback('Primero escucha el sonido', false);
        return;
    }
    
    const recordButton = document.getElementById('record-button');
    
    if (!isRecording) {
        isRecording = true;
        recordButton.innerHTML = '<i class="fas fa-stop"></i> Detener grabación';
        recordButton.className = 'btn secondary recording';
        recognition.start();
    } else {
        stopRecording();
    }
}

function stopRecording() {
    isRecording = false;
    const recordButton = document.getElementById('record-button');
    recordButton.innerHTML = '<i class="fas fa-microphone"></i> Analizando...';
    recordButton.className = 'btn secondary';
    recognition.stop();
}

function analyzeImitation(transcript) {
    const timeElapsed = performance.now() - roundStartTime;
    const result = analyzer.analyze(currentAnimal.name, currentAnimal.sound, transcript, timeElapsed);
    
    const recordedTextElement = document.getElementById('recorded-text');
    document.getElementById('recorded-text-content').textContent = '"' + transcript + '"';
    recordedTextElement.style.display = 'block';
    
    document.getElementById('similarity-meter').style.display = 'block';
    document.getElementById('similarity-fill').style.width = result.similarity + '%';
    document.getElementById('similarity-text').textContent = result.similarity + '%';
    
    const fillElement = document.getElementById('similarity-fill');
    fillElement.className = 'similarity-fill';
    if (result.similarity >= 75) {
        fillElement.classList.add('success');
    } else if (result.similarity >= 50) {
        fillElement.classList.add('warning');
    } else {
        fillElement.classList.add('error');
    }

    const isCorrect = result.isCorrect;
    const pointsEarned = Math.floor(result.similarity / 10);

    if (isCorrect) {
        score += pointsEarned;
        const feedbackMsg = result.feedback.emoji + ' ' + result.feedback.message;
        showFeedback(feedbackMsg, true, result.feedback.details);
    } else {
        const feedbackMsg = result.feedback.emoji + ' ' + result.feedback.message;
        showFeedback(feedbackMsg, false, result.feedback.details);
    }

    document.getElementById('score').textContent = score + ' ' + gs('points', 'puntos');
    document.getElementById('score-display').textContent = score + ' ' + gs('points', 'puntos');

    document.getElementById('record-button').style.display = 'none';

    setTimeout(() => {
        document.getElementById('feedback').classList.remove('show');
        document.getElementById('feedback').style.display = 'none';
        
        if (currentRound + 1 >= totalRounds) {
            completeGame();
        } else {
            currentRound++;
            startNewRound();
        }
    }, 3500);
}

function showFeedback(message, isCorrect, details = []) {
    const feedbackElement = document.getElementById('feedback');
    const feedbackMessage = document.getElementById('feedback-message');
    const feedbackDetail = document.getElementById('feedback-detail');
    const analysisBox = document.getElementById('analysis-box');
    
    feedbackMessage.textContent = message;
    feedbackDetail.textContent = details.join(' • ');
    
    let analysisHTML = '<div class="stat-row"><span class="stat-label">Animal:</span><span class="stat-value">' + currentAnimal.name + '</span></div>';
    analysisHTML += '<div class="stat-row"><span class="stat-label">Sonido esperado:</span><span class="stat-value">' + currentAnimal.sound + '</span></div>';
    analysisHTML += '<div class="stat-row"><span class="stat-label">Puntos ganados:</span><span class="stat-value">' + Math.floor(document.getElementById('similarity-text').textContent) / 10 + ' pts</span></div>';
    
    analysisBox.innerHTML = analysisHTML;
    
    feedbackElement.className = isCorrect ? 'feedback show correct' : 'feedback show incorrect';
    feedbackElement.style.display = 'block';
}

// --- Función completeGame actualizada ---
async function completeGame() {
    const mainCard = document.getElementById('main-card');
    const report = analyzer.getSessionReport();
    
    // Preparar el objeto para Koyeb
    const gameData = {
        gameId: 'imitacion-animales-1',
        style: 'auditivo',
        level: analyzer.currentDifficulty === 'hard' ? 3 : (analyzer.currentDifficulty === 'medium' ? 2 : 1),
        score: score,
        accuracy: report.averageAccuracy,
        responseTime: 0 // Opcional en este juego
    };

    mainCard.innerHTML = '<div class="game-completed"><h2>Guardando tu progreso...</h2></div>';

    try {
        await api.saveGameResults(gameData);
    } catch (error) {
        console.error("Error al guardar:", error);
    }

    // Renderizar reporte final
    mainCard.innerHTML = `
        <div class="game-completed">
            <h2 style="margin-bottom: 20px; color: #0066CC;">¡Sesión de Sonidos Terminada!</h2>
            <div class="final-score">
                <h2>Puntuación Final:</h2>
                <div class="score-number">${score}</div>
                <p>puntos</p>
            </div>
            <div class="analysis-box">
                <h3 style="text-align: center; margin-bottom: 15px; color: #0066CC;">📊 Análisis Vocal</h3>
                <div class="stat-row"><span class="stat-label">🎤 Imitación:</span><span class="stat-value">${report.imitationScore}%</span></div>
                <div class="stat-row"><span class="stat-label">👂 Discriminación:</span><span class="stat-value">${report.discriminationScore}%</span></div>
                <div class="stat-row"><span class="stat-label">⚠️ Confusiones:</span><span class="stat-value">${report.confusionsDetected}</span></div>
            </div>
            <div class="options-container" style="margin-top: 20px;">
                <button class="option-button primary" onclick="location.reload()">Jugar de Nuevo</button>
                <button class="option-button blue" onclick="goToMainPage()">' + gs('back','Volver') + '</button>
            </div>
        </div>`;
}

function goToMainPage() {
    window.location.href = 'https://plekdev.github.io/BlueMinds/selectores/selector-auditivo.html';
}

// Iniciar tiempo de ronda
const roundStartTime = performance.now();
