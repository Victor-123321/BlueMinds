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

// ===== SISTEMA DE IA ADAPTATIVO PARA CONSTRUCCIÓN SINTÁCTICA CON AUDIO =====

class AudioManager {
    constructor() {
        this.synth = window.speechSynthesis;
        this.isSpeaking = false;
        this.audioEnabled = true;
    }

    speak(text, rate = 1, pitch = 1) {
        if (!this.audioEnabled) return;

        // Cancelar cualquier audio en progreso
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.lang = 'es-ES';

        utterance.onstart = () => {
            this.isSpeaking = true;
        };

        utterance.onend = () => {
            this.isSpeaking = false;
        };

        utterance.onerror = () => {
            this.isSpeaking = false;
        };

        this.synth.speak(utterance);
    }

    toggleAudio() {
        this.audioEnabled = !this.audioEnabled;
        return this.audioEnabled;
    }
}

class AISyntaxGame {
    constructor() {
        this.currentRound = 0;
        this.score = 0;
        this.currentSentence = null;
        this.selectedWords = [];
        this.showFeedback = false;
        this.audioManager = new AudioManager();
        
        // Parámetros de IA
        this.syntaxScore = 0;
        this.difficulty = 'easy';
        this.consecutiveCorrect = 0;
        this.consecutiveWrong = 0;
        this.attentionTime = 0;
        this.startTime = 0;
        
        // Análisis de errores
        this.syntaxErrors = {
            wrongOrder: 0,
            wrongWord: 0,
            inversionPattern: false,
            blockedWords: []
        };
        
        this.wordStats = {};
        this.sentenceStats = {};
        
        // Niveles de dificultad
        this.difficultyLevels = {
            easy: { wordCount: 3, examples: true },
            medium: { wordCount: 4, examples: false },
            hard: { wordCount: 5, examples: false }
        };

        // Base de oraciones con descripciones de audio
        this.sentences = [
            { 
                words: ["El", "gato", "duerme"], 
                correct: ["El", "gato", "duerme"], 
                complexity: 'easy',
                type: 'SVO',
                image: "🐱💤",
                audioDescription: "Se muestra un gato. ¿Cuál es el animal en la imagen?",
                audioInstruction: "Forma la oración correcta haciendo clic en las palabras en el orden adecuado"
            },
            { 
                words: ["perro", "El", "corre"], 
                correct: ["El", "perro", "corre"], 
                complexity: 'easy',
                type: 'SV',
                image: "🐕",
                audioDescription: "Se muestra un perro. ¿Cuál es este animal?",
                audioInstruction: "Haz clic en las palabras para formar: El perro corre"
            },
            { 
                words: ["vuela", "pájaro", "El"], 
                correct: ["El", "pájaro", "vuela"], 
                complexity: 'easy',
                type: 'SV',
                image: "🦅",
                audioDescription: "Se muestra un pájaro volando. ¿Qué animal ves?",
                audioInstruction: "Ordena las palabras para decir que el pájaro vuela"
            },
            
            { 
                words: ["niña", "come", "La", "manzana"], 
                correct: ["La", "niña", "come", "manzana"], 
                complexity: 'medium',
                type: 'SVO',
                image: "👧🍎",
                audioDescription: "Se muestra una niña comiendo una manzana. ¿Quién aparece en la imagen?",
                audioInstruction: "Forma la oración con cuatro palabras sobre la niña"
            },
            { 
                words: ["bonita", "Una", "casa", "es"], 
                correct: ["Una", "casa", "es", "bonita"], 
                complexity: 'medium',
                type: 'SVC',
                image: "🏠",
                audioDescription: "Se muestra una casa. ¿Cómo es esta casa?",
                audioInstruction: "Completa la frase sobre las características de la casa"
            },
            
            { 
                words: ["niños", "parque", "Los", "en", "juegan"], 
                correct: ["Los", "niños", "juegan", "en", "parque"], 
                complexity: 'hard',
                type: 'SVLP',
                image: "👦🛝👦",
                audioDescription: "Se muestran niños jugando en el parque. ¿Dónde están jugando?",
                audioInstruction: "Forma la oración de cinco palabras sobre dónde juegan los niños"
            }
        ];

        this.totalRounds = 5;
        
        // Inicializar estadísticas
        this.sentences.forEach(sent => {
            this.sentenceStats[sent.correct.join(' ')] = {
                attempts: 0,
                correct: 0,
                errors: []
            };
        });
    }

    // ===== AUDIO PARA INSTRUCCIONES INICIALES =====
    announceGameStart() {
        const message = `Bienvenido al Detective de Errores. Tu objetivo es formar oraciones correctas haciendo clic en las palabras en el orden adecuado. Tienes cinco rondas para completar. ¡Buena suerte!`;
        this.audioManager.speak(message, 0.9);
    }

    // ===== AUDIO PARA DESCRIPCIÓN DE IMAGEN =====
    announceImageDescription() {
        if (this.currentSentence) {
            this.audioManager.speak(this.currentSentence.audioDescription, 0.95, 1.1);
        }
    }

    // ===== AUDIO PARA INSTRUCCIONES DE RONDA =====
    announceRoundInstruction() {
        const roundMessage = `Ronda ${this.currentRound + 1} de ${this.totalRounds}. ${this.currentSentence.audioInstruction}`;
        setTimeout(() => {
            this.audioManager.speak(roundMessage, 0.9);
        }, 500);
    }

    // ===== ANÁLISIS DE ERRORES SINTÁCTICOS =====
    analyzeError(selected, correct) {
        const selectedStr = selected.join(' ');
        const correctStr = correct.join(' ');
        
        let errorType = '';
        
        if (new Set(selected).size === new Set(correct).size && 
            selected.every(w => correct.includes(w))) {
            
            errorType = 'wrongOrder';
            this.syntaxErrors.wrongOrder++;
            
            const isInverted = selected.every((w, i) => w === correct[correct.length - 1 - i]);
            if (isInverted) {
                this.syntaxErrors.inversionPattern = true;
            }
        } else {
            errorType = 'wrongWord';
            this.syntaxErrors.wrongWord++;
            
            selected.forEach((word, idx) => {
                if (word !== correct[idx] && !this.syntaxErrors.blockedWords.includes(word)) {
                    this.syntaxErrors.blockedWords.push(word);
                }
            });
        }
        
        return errorType;
    }

    // ===== DETECCIÓN DE BLOQUEOS =====
    detectBlocking() {
        if (this.consecutiveWrong >= 3) {
            return true;
        }
        return false;
    }

    // ===== CÁLCULO DE PUNTUACIÓN SINTÁCTICA =====
    calculateSyntaxScore() {
        const totalAttempts = this.currentRound + 1;
        const correctCount = Math.floor((this.score / 20));
        this.syntaxScore = (correctCount / totalAttempts) * 100;
        return this.syntaxScore;
    }

    // ===== AJUSTE AUTOMÁTICO DE DIFICULTAD =====
    adjustDifficulty() {
        this.calculateSyntaxScore();
        
        if (this.consecutiveCorrect >= 3 && this.syntaxScore >= 75) {
            if (this.difficulty === 'easy') {
                this.difficulty = 'medium';
                this.audioManager.speak('¡Excelente! Pasamos al nivel medio.', 0.9);
            } else if (this.difficulty === 'medium') {
                this.difficulty = 'hard';
                this.audioManager.speak('¡Muy bien! Ahora el nivel difícil.', 0.9);
            }
        }
        else if (this.detectBlocking() || this.syntaxScore < 50) {
            if (this.difficulty === 'hard') {
                this.difficulty = 'medium';
                this.audioManager.speak('Volvemos al nivel medio para seguir practicando.', 0.9);
            } else if (this.difficulty === 'medium') {
                this.difficulty = 'easy';
                this.audioManager.speak('Practicemos el nivel fácil.', 0.9);
            }
            this.consecutiveWrong = 0;
        }
        
        this.showDifficultyIndicator();
    }

    showDifficultyIndicator() {
        const indicator = document.getElementById('difficulty-indicator');
        const levels = {
            easy: '⭐ Dificultad: FÁCIL (3 palabras)',
            medium: '⭐⭐ Dificultad: MEDIO (4 palabras)',
            hard: '⭐⭐⭐ Dificultad: DIFÍCIL (5 palabras)'
        };

        indicator.textContent = levels[this.difficulty];
        indicator.style.display = 'block';
    }

    // ===== SELECCIÓN INTELIGENTE DE ORACIONES =====
    selectNextSentence() {
        const sentencesByDifficulty = this.sentences.filter(
            s => s.complexity === this.difficulty
        );

        if (sentencesByDifficulty.length === 0) {
            return this.sentences[Math.floor(Math.random() * this.sentences.length)];
        }

        const errorProne = sentencesByDifficulty.filter(s => {
            const key = s.correct.join(' ');
            return this.sentenceStats[key] && this.sentenceStats[key].errors.length > 0;
        });

        if (errorProne.length > 0 && Math.random() > 0.4) {
            return errorProne[Math.floor(Math.random() * errorProne.length)];
        }

        return sentencesByDifficulty[Math.floor(Math.random() * sentencesByDifficulty.length)];
    }

    // ===== MOSTRAR EJEMPLO MODELO =====
    showModelExample() {
        const shouldShow = this.difficulty === 'easy' && this.consecutiveWrong >= 1;
        
        if (shouldShow) {
            const modelEl = document.getElementById('model-example');
            modelEl.innerHTML = `
                <strong>💡 Ejemplo modelo:</strong> 
                "${this.currentSentence.correct.join(' ')}" es una oración con orden ${this.currentSentence.type}
            `;
            modelEl.style.display = 'block';
            this.audioManager.speak(`Ejemplo: ${this.currentSentence.correct.join(' ')}`, 1);
        } else {
            document.getElementById('model-example').style.display = 'none';
        }
    }

    // ===== INICIO DEL JUEGO =====
    startNewRound() {
        this.currentSentence = this.selectNextSentence();
        this.selectedWords = [];
        this.showFeedback = false;
        this.startTime = Date.now();
        
        this.updateUI();
        this.showModelExample();
        
        // Audio secuencial
        setTimeout(() => this.announceImageDescription(), 300);
        setTimeout(() => this.announceRoundInstruction(), 2000);
    }

    updateUI() {
        document.getElementById('current-round').textContent = this.currentRound + 1;
        document.getElementById('total-rounds').textContent = this.totalRounds;
        document.getElementById('score').textContent = this.score + ' ' + gs('points', 'puntos');
        document.getElementById('score-display').textContent = this.score + ' ' + gs('points', 'puntos');

        const progress = ((this.currentRound + 1) / this.totalRounds) * 100;
        document.getElementById('progress-fill').style.width = progress + '%';

        const sentenceDisplay = document.getElementById('sentence-display');
        sentenceDisplay.innerHTML = '';
        
        // Mostrar imagen
        const imageEl = document.createElement('div');
        imageEl.style.fontSize = '60px';
        imageEl.textContent = this.currentSentence.image;
        sentenceDisplay.appendChild(imageEl);
        
        const wordsContainer = document.createElement('div');
        wordsContainer.style.width = '100%';
        wordsContainer.style.display = 'flex';
        wordsContainer.style.flexWrap = 'wrap';
        wordsContainer.style.gap = '8px';
        wordsContainer.style.justifyContent = 'center';
        
        for (let i = 0; i < this.currentSentence.correct.length; i++) {
            const slot = document.createElement('div');
            slot.className = 'word-slot';
            
            if (this.selectedWords[i]) {
                slot.textContent = this.selectedWords[i];
                if (this.selectedWords[i] === this.currentSentence.correct[i]) {
                    slot.classList.add('correct');
                } else if (this.currentSentence.correct.includes(this.selectedWords[i])) {
                    slot.classList.add('wrong-position');
                } else {
                    slot.classList.add('incorrect');
                }
            } else {
                slot.textContent = '?';
                slot.classList.add('empty');
            }
            wordsContainer.appendChild(slot);
        }
        
        sentenceDisplay.appendChild(wordsContainer);

        const wordsBank = document.getElementById('words-bank');
        wordsBank.innerHTML = '';
        
        const shuffledWords = [...this.currentSentence.words].sort(() => Math.random() - 0.5);
        
        shuffledWords.forEach((word) => {
            const button = document.createElement('button');
            button.className = 'word-button';
            button.textContent = word;
            button.disabled = this.selectedWords.includes(word);
            button.classList.toggle('used', this.selectedWords.includes(word));
            button.onclick = () => this.selectWord(word);
            wordsBank.appendChild(button);
        });

        document.getElementById('feedback').classList.remove('show');
        document.getElementById('ai-analysis').classList.remove('show');
    }

    selectWord(word) {
        if (!this.selectedWords.includes(word) && this.selectedWords.length < this.currentSentence.correct.length) {
            this.selectedWords.push(word);
            this.audioManager.speak(word, 1, 1.2);
            this.updateUI();
        }
    }

    resetSentence() {
        this.selectedWords = [];
        this.audioManager.speak('Reiniciado. Intenta de nuevo.', 0.9);
        this.updateUI();
    }

    // ===== VERIFICACIÓN Y ANÁLISIS =====
    checkSentence() {
        if (this.selectedWords.length !== this.currentSentence.correct.length) {
            const feedbackElement = document.getElementById('feedback');
            feedbackElement.textContent = 'Debes completar toda la oración';
            feedbackElement.className = 'feedback incorrect show';
            this.audioManager.speak('Debes seleccionar todas las palabras', 0.9);
            return;
        }

        this.attentionTime = (Date.now() - this.startTime) / 1000;
        const isCorrect = JSON.stringify(this.selectedWords) === JSON.stringify(this.currentSentence.correct);
        const feedbackElement = document.getElementById('feedback');
        const feedbackText = document.getElementById('feedback-text');

        const sentenceKey = this.currentSentence.correct.join(' ');
        this.sentenceStats[sentenceKey].attempts++;

        if (isCorrect) {
            this.score += 20;
            this.consecutiveCorrect++;
            this.consecutiveWrong = 0;
            this.sentenceStats[sentenceKey].correct++;
            
            feedbackText.textContent = `¡Correcto! 🎉 ${this.currentSentence.image} Orden: ${this.currentSentence.type}`;
            feedbackElement.className = 'feedback correct show';
            this.audioManager.speak(`¡Correcto! La oración es: ${this.currentSentence.correct.join(' ')}`, 0.95);
        } else {
            const errorType = this.analyzeError(this.selectedWords, this.currentSentence.correct);
            this.consecutiveWrong++;
            this.consecutiveCorrect = 0;
            this.sentenceStats[sentenceKey].errors.push(errorType);
            
            feedbackText.textContent = `No es correcto. Intenta de nuevo 😊`;
            feedbackElement.className = 'feedback incorrect show';
            this.audioManager.speak(`Incorrecto. La respuesta correcta es: ${this.currentSentence.correct.join(' ')}. Intenta de nuevo.`, 0.9);
        }

        this.showFeedback = true;
        document.getElementById('score').textContent = this.score + ' ' + gs('points', 'puntos');
        document.getElementById('score-display').textContent = this.score + ' ' + gs('points', 'puntos');

        this.adjustDifficulty();
        this.showAIAnalysis();

        setTimeout(() => {
            if (this.currentRound + 1 >= this.totalRounds) {
                this.completeGame();
            } else {
                this.currentRound++;
                this.startNewRound();
            }
        }, 3000);
    }

    // ===== ANÁLISIS EN TIEMPO REAL =====
    showAIAnalysis() {
        const analysisEl = document.getElementById('ai-analysis');
        const analysisText = document.getElementById('analysis-text');
        
        let analysis = '';

        if (this.attentionTime < 2) {
            analysis += '⚡ Respuesta muy rápida (impulsiva). ';
        } else if (this.attentionTime > 8) {
            analysis += '🤔 Sostuvo la atención > 8s (concentración prolongada). ';
        }

        if (this.syntaxErrors.inversionPattern) {
            analysis += '🔄 Patrón detectado: inversión sistemática de palabras. ';
        }

        if (this.syntaxErrors.blockedWords.length > 0) {
            analysis += `🚫 Palabras problemáticas: ${this.syntaxErrors.blockedWords.slice(0, 2).join(', ')}. `;
        }

        if (this.consecutiveCorrect > 0) {
            analysis += `✅ ${this.consecutiveCorrect} acierto(s) consecutivo(s). `;
        }
        if (this.consecutiveWrong > 0) {
            analysis += `❌ ${this.consecutiveWrong} error(es) consecutivo(s). `;
        }

        if (this.difficulty === 'hard') {
            analysis += '📈 Nivel: DIFÍCIL. ';
        } else if (this.difficulty === 'easy') {
            analysis += '📉 Nivel: FÁCIL. ';
        } else {
            analysis += '➡️ Nivel: MEDIO. ';
        }

        analysisText.textContent = analysis || 'Construcción sintáctica en desarrollo...';
        analysisEl.classList.add('show');
    }

    // ===== REPORTE FINAL =====
    async completeGame() {
// --- INTEGRACIÓN BLUEMINDS ---
        // El nivel se basa en el estado final de la dificultad adaptativa
        const levelNum = this.difficulty === 'hard' ? 3 : (this.difficulty === 'medium' ? 2 : 1);
        
        // Calculamos la precisión real sobre el total de puntos posibles (5 rondas de 20pts = 100)
        const totalRoundsPossible = this.totalRounds * 20;
        const calculatedAccuracy = Math.min((this.score / totalRoundsPossible) * 100, 100);

        const gameData = {
            gameId: "detective-errores", 
            style: "visual", 
            level: levelNum,
            score: this.score,
            accuracy: calculatedAccuracy,
            // Registramos el tiempo promedio de atención capturado por tu IA
            responseTime: this.attentionTime ? (this.attentionTime * 1000) : 60000 
        };

        // Envío al servidor a través del bridge
        if (window.BlueMindsAPI) {
            window.BlueMindsAPI.saveGameResults(gameData);
            console.log("🎮 Analíticas de Detective-Errores enviadas:", gameData);
        }
        // ----------------------------
        const gameCard = document.querySelector('.game-card');
        const avgAccuracy = ((this.score / (this.totalRounds * 20)) * 100).toFixed(1);
        const finalSyntaxScore = this.calculateSyntaxScore().toFixed(0);
        
        let performanceMessage = '¡Excelente construcción sintáctica! 🏆';
        let mainWeakness = 'Ninguna detectada';

        if (avgAccuracy < 60) {
            performanceMessage = '¡Sigue practicando la construcción de oraciones! 💪';
        } else if (avgAccuracy < 80) {
            performanceMessage = '¡Muy buen trabajo! Tu sintaxis mejora. 🌟';
        }

        if (this.syntaxErrors.blockedWords.length > 0) {
            mainWeakness = this.syntaxErrors.blockedWords.slice(0, 2).join(', ');
        }

        // Audio final
        const finalMessage = `Juego completado. Tu puntaje final es de ${this.score} puntos con una precisión de ${avgAccuracy} por ciento. ${performanceMessage}`;
        this.audioManager.speak(finalMessage, 0.9);

        gameCard.innerHTML = `
            <h2>¡Juego Completado!</h2>
            <div style="font-size: 80px; margin: 30px 0;">🎉</div>
            
            <div style="background: linear-gradient(135deg, #0066CC 0%, #0099FF 100%); color: white; padding: 20px; border-radius: 12px; margin: 20px 0;">
                <div style="font-size: 24px; font-weight: 700; margin-bottom: 10px;">Tu puntaje final: ${this.score} puntos</div>
                <div style="font-size: 18px; opacity: 0.9;">Precisión: ${avgAccuracy}%</div>
            </div>

            <div style="background: rgba(0, 102, 204, 0.1); border-left: 4px solid #0066CC; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left; color: #1F2937; font-size: 14px;">
                <strong>📊 Análisis Final de IA - Construcción Sintáctica:</strong>
                <div style="margin-top: 10px; line-height: 1.8;">
                    <div>✓ Puntuación sintáctica: ${finalSyntaxScore}%</div>
                    <div>✓ Errores de orden: ${this.syntaxErrors.wrongOrder}</div>
                    <div>✓ Errores de palabra: ${this.syntaxErrors.wrongWord}</div>
                    <div>✓ Palabras a practicar: ${mainWeakness}</div>
                    <div>✓ Patrón de inversión detectado: ${this.syntaxErrors.inversionPattern ? 'Sí' : 'No'}</div>
                    <div>✓ Nivel final: ${this.difficulty.toUpperCase()}</div>
                </div>
            </div>

            <div style="color: var(--primary-blue); font-size: 18px; font-weight: 600; margin: 15px 0;">
                ${performanceMessage}
            </div>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px;">
                <button style="background: linear-gradient(135deg, #0066CC 0%, #0099FF 100%); color: white; padding: 15px; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" onclick="location.reload()">
                    Jugar de Nuevo
                </button>
                <button style="background-color: #00B4D8; color: white; padding: 15px; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" onclick="goToMainPage()">
                    Volver al Menú
                </button>
            </div>
        `;
    }
}

// ===== INICIALIZACIÓN =====
const game = new AISyntaxGame();

document.addEventListener('DOMContentLoaded', () => {
    game.announceGameStart();
    setTimeout(() => {
        game.startNewRound();
    }, 3000);
});

// ===== FUNCIONES GLOBALES =====
function checkSentence() {
    game.checkSentence();
}

function resetSentence() {
    game.resetSentence();
}

function toggleAudio() {
    const enabled = game.audioManager.toggleAudio();
    const btn = document.getElementById('audio-toggle');
    if (btn) {
        btn.innerHTML = enabled ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
    }
}

function goToMainPage() {
   window.location.href = 'https://plekdev.github.io/BlueMinds/selectores/selector-visual.html';
}
