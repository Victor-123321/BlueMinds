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

// ===== SISTEMA DE IA ADAPTATIVO PARA CATEGORIZACIÓN VISUAL-VERBAL =====
class AISceneGame {
    constructor() {
        this.currentRound = 0;
        this.score = 0;
        this.currentScene = null;
        this.selectedOption = null;
        this.showFeedback = false;
        
        // Parámetros de IA
        this.categorizationScore = 0;
        this.difficulty = 'easy';
        this.consecutiveCorrect = 0;
        this.consecutiveWrong = 0;
        
        // Análisis de errores
        this.errorAnalysis = {
            visualErrors: 0,
            semanticErrors: 0,
            distractorsSelected: {},
            preferredCategories: {}
        };
        
        this.sceneStats = {};
        
        // Base de escenas por dificultad y categoría
        this.allScenes = {
            easy: [
                {
                    sentence: "El pájaro está en el",
                    options: ["🍅", "🪺", "🌊"],
                    correct: "🪺",
                    correctText: "nido",
                    category: "animales",
                    complexity: 1
                },
                {
                    sentence: "El pez vive en el",
                    options: ["🌳", "🌊", "🏠"],
                    correct: "🌊",
                    correctText: "agua",
                    category: "animales",
                    complexity: 1
                },
                {
                    sentence: "El gato come",
                    options: ["🐟", "🌽", "🥕"],
                    correct: "🐟",
                    correctText: "pescado",
                    category: "animales",
                    complexity: 1
                },
                {
                    sentence: "La flor está en el",
                    options: ["🌳", "🌐", "💻"],
                    correct: "🌳",
                    correctText: "jardín",
                    category: "naturaleza",
                    complexity: 1
                },
                {
                    sentence: "El niño juega con la",
                    options: ["🦃", "⚽", "🪱"],
                    correct: "⚽",
                    correctText: "pelota",
                    category: "juegos",
                    complexity: 1
                }
            ],
            medium: [
                {
                    sentence: "El profesor enseña en la",
                    options: ["🛒", "🏫", "🪸"],
                    correct: "🏫",
                    correctText: "escuela",
                    category: "lugares",
                    complexity: 2
                },
                {
                    sentence: "El médico trabaja en el",
                    options: ["🪸", "🏥", "🪄"],
                    correct: "🏥",
                    correctText: "hospital",
                    category: "lugares",
                    complexity: 2
                },
                {
                    sentence: "La abeja vuela entre las",
                    options: ["😭", "🌻", "🏢"],
                    correct: "🌻",
                    correctText: "flores",
                    category: "naturaleza",
                    complexity: 2
                },
                {
                    sentence: "La mariposa necesita",
                    options: ["👻", "🔥", "🌻"],
                    correct: "🌻",
                    correctText: "flores",
                    category: "naturaleza",
                    complexity: 2
                },
                {
                    sentence: "El perro juega con la",
                    options: ["🛹", "🦺", "🥎"],
                    correct: "🥎",
                    correctText: "pelota",
                    category: "lugares",
                    complexity: 2
                }
            ],
            hard: [
                {
                    sentence: "El pintor usa el",
                    options: ["🎨", "👽", "⚽"],
                    correct: "🎨",
                    correctText: "pincel",
                    category: "profesiones",
                    complexity: 3
                },
                {
                    sentence: "La dentista examina los",
                    options: ["👂", "👁️", "🦷"],
                    correct: "🦷",
                    correctText: "dientes",
                    category: "profesiones",
                    complexity: 3
                },
                {
                    sentence: "El cocinero prepara la",
                    options: ["🍕", "📚", "🚗"],
                    correct: "🍕",
                    correctText: "comida",
                    category: "profesiones",
                    complexity: 3
                },
                {
                    sentence: "La granjero cultiva en el",
                    options: ["🏙️", "🌾", "🏢"],
                    correct: "🌾",
                    correctText: "campo",
                    category: "lugares",
                    complexity: 3
                }
            ]
        };

        this.totalRounds = 5;
        
        // Inicializar estadísticas
        Object.values(this.allScenes).forEach(scenes => {
            scenes.forEach(scene => {
                this.sceneStats[scene.sentence] = {
                    attempts: 0,
                    correct: 0,
                    errorType: null
                };
            });
        });
    }

    // ===== ANÁLISIS DE ERRORES =====
    analyzeError(selectedOption, correctOption, sceneCategory) {
        let errorType = 'semantic';
        
        if (this.isVisualDistractor(selectedOption)) {
            this.errorAnalysis.visualErrors++;
            errorType = 'visual';
        } else {
            this.errorAnalysis.semanticErrors++;
            errorType = 'semantic';
        }
        
        if (!this.errorAnalysis.distractorsSelected[selectedOption]) {
            this.errorAnalysis.distractorsSelected[selectedOption] = 0;
        }
        this.errorAnalysis.distractorsSelected[selectedOption]++;
        
        return errorType;
    }

    isVisualDistractor(option) {
        const visualSimilarPairs = [
            ['🌳', '🌲'], ['🏠', '🏡'], ['🐕', '🐶'], ['🍎', '🍎']
        ];
        return visualSimilarPairs.some(pair => pair.includes(option));
    }

    // ===== CÁLCULO DE PUNTUACIÓN =====
    calculateCategorizationScore() {
        const totalAttempts = this.currentRound + 1;
        const correctCount = Math.floor(this.score / 20);
        this.categorizationScore = (correctCount / totalAttempts) * 100;
        return this.categorizationScore;
    }

    // ===== AJUSTE AUTOMÁTICO DE DIFICULTAD =====
    adjustDifficulty() {
        this.calculateCategorizationScore();
        
        if (this.consecutiveCorrect >= 3 && this.categorizationScore >= 75) {
            if (this.difficulty === 'easy') {
                this.difficulty = 'medium';
                audioManager.speak('Aumentando dificultad a nivel medio', 0.9);
            } else if (this.difficulty === 'medium') {
                this.difficulty = 'hard';
                audioManager.speak('Aumentando dificultad a nivel difícil', 0.9);
            }
        }
        else if (this.consecutiveWrong >= 2 || this.categorizationScore < 50) {
            if (this.difficulty === 'hard') {
                this.difficulty = 'medium';
                audioManager.speak('Reduciendo dificultad a nivel medio', 0.9);
            } else if (this.difficulty === 'medium') {
                this.difficulty = 'easy';
                audioManager.speak('Reduciendo dificultad a nivel fácil', 0.9);
            }
            this.consecutiveWrong = 0;
        }
        
        this.showDifficultyIndicator();
    }

    showDifficultyIndicator() {
        const indicator = document.getElementById('difficulty-indicator');
        const levels = {
            easy: '⭐ Dificultad: FÁCIL (3 opciones simples)',
            medium: '⭐⭐ Dificultad: MEDIO (3 opciones complejas)',
            hard: '⭐⭐⭐ Dificultad: DIFÍCIL (conceptos abstractos)'
        };

        indicator.textContent = levels[this.difficulty];
        indicator.style.display = 'block';
    }

    // ===== SELECCIÓN INTELIGENTE DE ESCENAS =====
    selectNextScene() {
        const scenesForDifficulty = this.allScenes[this.difficulty];
        
        const errorProneScenes = scenesForDifficulty.filter(scene => {
            const stats = this.sceneStats[scene.sentence];
            return stats && stats.attempts > 0 && stats.correct === 0;
        });

        if (errorProneScenes.length > 0 && Math.random() > 0.4) {
            return errorProneScenes[Math.floor(Math.random() * errorProneScenes.length)];
        }

        return scenesForDifficulty[Math.floor(Math.random() * scenesForDifficulty.length)];
    }

    // ===== MOSTRAR HINT =====
    showHint() {
        if (this.consecutiveWrong >= 1) {
            const hintBox = document.getElementById('hint-box');
            const hintText = `💡 Pista: Piensa en la categoría "${this.currentScene.category}"`;
            hintBox.textContent = hintText;
            hintBox.style.display = 'block';
            audioManager.speak(`Pista: Piensa en la categoría ${this.currentScene.category}`, 0.9);
        } else {
            document.getElementById('hint-box').style.display = 'none';
        }
    }

    // ===== INICIO DEL JUEGO =====
    startNewRound() {
        this.currentScene = this.selectNextScene();
        this.selectedOption = null;
        this.showFeedback = false;
        
        this.updateUI();
        this.showHint();
        audioManager.speak(`Ronda ${this.currentRound + 1}. Completa: ${this.currentScene.sentence}`, 1);
    }

    updateUI() {
        document.getElementById('current-round').textContent = this.currentRound + 1;
        document.getElementById('total-rounds').textContent = this.totalRounds;
        document.getElementById('score').textContent = this.score + ' ' + gs('points', 'puntos');
        document.getElementById('score-display').textContent = this.score + ' ' + gs('points', 'puntos');

        const progress = ((this.currentRound + 1) / this.totalRounds) * 100;
        document.getElementById('progress-fill').style.width = progress + '%';

        const sentenceDisplay = document.getElementById('sentence-display');
        sentenceDisplay.innerHTML = this.currentScene.sentence + ' <span class="blank-space">?</span>';

        const optionsDisplay = document.getElementById('options-display');
        optionsDisplay.innerHTML = '';
        
        const shuffledOptions = [...this.currentScene.options].sort(() => Math.random() - 0.5);
        
        shuffledOptions.forEach((option) => {
            const button = document.createElement('div');
            button.className = 'option-image';
            button.textContent = option;
            if (this.selectedOption === option) {
                button.classList.add('selected');
            }
            button.onclick = () => this.selectOption(option);
            optionsDisplay.appendChild(button);
        });

        document.getElementById('feedback').classList.remove('show');
        document.getElementById('ai-analysis').classList.remove('show');
    }

    selectOption(option) {
        this.selectedOption = option;
        this.updateUI();
    }

    resetAnswer() {
        this.selectedOption = null;
        this.updateUI();
    }

    // ===== VERIFICACIÓN Y ANÁLISIS =====
    checkAnswer() {
        if (!this.selectedOption) {
            const feedbackElement = document.getElementById('feedback');
            feedbackElement.textContent = 'Debes seleccionar una opción';
            feedbackElement.className = 'feedback incorrect show';
            audioManager.speak('Debes seleccionar una opción', 0.9);
            return;
        }

        const isCorrect = this.selectedOption === this.currentScene.correct;
        const feedbackElement = document.getElementById('feedback');
        const feedbackText = document.getElementById('feedback-text');

        const sceneKey = this.currentScene.sentence;
        this.sceneStats[sceneKey].attempts++;

        if (isCorrect) {
            this.score += 20;
            this.consecutiveCorrect++;
            this.consecutiveWrong = 0;
            this.sceneStats[sceneKey].correct++;
            
            feedbackText.textContent = `¡Correcto! Era "${this.currentScene.correctText}" 🎉`;
            feedbackElement.className = 'feedback correct show';
            audioManager.speak(`¡Correcto! La respuesta correcta es ${this.currentScene.correctText}`, 0.95);
            
            if (!this.errorAnalysis.preferredCategories[this.currentScene.category]) {
                this.errorAnalysis.preferredCategories[this.currentScene.category] = 0;
            }
            this.errorAnalysis.preferredCategories[this.currentScene.category]++;
        } else {
            const errorType = this.analyzeError(
                this.selectedOption, 
                this.currentScene.correct,
                this.currentScene.category
            );
            this.consecutiveWrong++;
            this.consecutiveCorrect = 0;
            this.sceneStats[sceneKey].errorType = errorType;
            
            feedbackText.textContent = `No es correcto. Era "${this.currentScene.correctText}" 😊`;
            feedbackElement.className = 'feedback incorrect show';
            audioManager.speak(`No es correcto. La respuesta correcta es ${this.currentScene.correctText}`, 0.95);
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
        }, 2500);
    }

    // ===== ANÁLISIS EN TIEMPO REAL =====
    showAIAnalysis() {
        const analysisEl = document.getElementById('ai-analysis');
        const analysisText = document.getElementById('analysis-text');
        
        let analysis = '';

        if (this.errorAnalysis.visualErrors > 0 && !this.showFeedback) {
            analysis += `👁️ Errores visuales detectados: ${this.errorAnalysis.visualErrors}. `;
        }
        if (this.errorAnalysis.semanticErrors > 0 && !this.showFeedback) {
            analysis += `📝 Errores semánticos: ${this.errorAnalysis.semanticErrors}. `;
        }

        if (this.consecutiveCorrect > 0) {
            analysis += `✅ ${this.consecutiveCorrect} acierto(s) consecutivo(s). `;
        }
        if (this.consecutiveWrong > 0) {
            analysis += `❌ ${this.consecutiveWrong} error(es) consecutivo(s). `;
        }

        if (this.difficulty === 'hard') {
            analysis += '📈 Nivel: DIFÍCIL (conceptos avanzados). ';
        } else if (this.difficulty === 'easy') {
            analysis += '📉 Nivel: FÁCIL (conceptos básicos). ';
        } else {
            analysis += '➡️ Nivel: MEDIO (conceptos intermedios). ';
        }

        analysisText.textContent = analysis || 'Categorización en desarrollo...';
        analysisEl.classList.add('show');
    }

    // ===== JUEGO COMPLETADO =====
    async completeGame() {

    // --- INTEGRACIÓN BLUEMINDS ---
        // Nivel basado en la dificultad adaptativa final
        const levelNum = this.difficulty === 'hard' ? 3 : (this.difficulty === 'medium' ? 2 : 1);
        
        // La precisión se basa en el score (5 rondas de 20pts = 100)
        const calculatedAccuracy = Math.min((this.score / 100) * 100, 100);

        const gameData = {
            gameId: "completa-escena", 
            style: "visual", 
            level: levelNum,
            score: this.score,
            accuracy: calculatedAccuracy,
            // Usamos el categorizationScore que calcula tu IA (0-100)
            responseTime: Math.round(this.categorizationScore) 
        };

        try {
            await api.saveGameResults(gameData);
            console.log('✅ Progreso guardado exitosamente');
        } catch (error) {
            console.error('❌ Error al conectar con el servidor:', error);
        }
        // ----------------------------
        const gameCard = document.querySelector('.game-card');
        const avgAccuracy = ((this.score / (this.totalRounds * 20)) * 100).toFixed(1);
        const finalScore = this.calculateCategorizationScore().toFixed(0);
        
        let favoriteCategory = 'General';
        let maxAttempts = 0;
        for (const [category, count] of Object.entries(this.errorAnalysis.preferredCategories)) {
            if (count > maxAttempts) {
                maxAttempts = count;
                favoriteCategory = category;
            }
        }
        
        let performanceMessage = '¡Excelente categorización visual! 🏆';
        let performanceAudio = 'Excelente categorización visual';
        
        if (avgAccuracy < 60) {
            performanceMessage = '¡Sigue practicando! La categorización mejorará. 💪';
            performanceAudio = 'Sigue practicando, la categorización mejorará';
        } else if (avgAccuracy < 80) {
            performanceMessage = '¡Muy buen trabajo! Entiendes bien las categorías. 🌟';
            performanceAudio = 'Muy buen trabajo, entiendes bien las categorías';
        }

        audioManager.speak(`Juego completado. Puntuación: ${this.score} puntos. Precisión: ${avgAccuracy} por ciento. ${performanceAudio}`, 0.95);

        gameCard.innerHTML = `
            <h2>¡Juego Completado!</h2>
            <div style="font-size: 80px; margin: 30px 0;">🎉</div>
            
            <div style="background: linear-gradient(135deg, #0066CC 0%, #0099FF 100%); color: white; padding: 20px; border-radius: 12px; margin: 20px 0;">
                <div style="font-size: 24px; font-weight: 700; margin-bottom: 10px;">Tu puntaje final: ${this.score} puntos</div>
                <div style="font-size: 18px; opacity: 0.9;">Precisión: ${avgAccuracy}%</div>
            </div>

            <div style="background: rgba(0, 102, 204, 0.1); border-left: 4px solid #0066CC; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left; color: #1F2937; font-size: 14px;">
                <strong>📊 Análisis Final de IA - Categorización Visual-Verbal:</strong>
                <div style="margin-top: 10px; line-height: 1.8;">
                    <div>✓ Puntuación de categorización: ${finalScore}%</div>
                    <div>✓ Errores visuales: ${this.errorAnalysis.visualErrors}</div>
                    <div>✓ Errores semánticos: ${this.errorAnalysis.semanticErrors}</div>
                    <div>✓ Categoría favorita: ${favoriteCategory}</div>
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

        document.getElementById('ai-analysis').classList.remove('show');
    }
}

// ===== INICIALIZACIÓN =====
const game = new AISceneGame();

document.addEventListener('DOMContentLoaded', () => {
    game.startNewRound();
});

// ===== FUNCIONES GLOBALES =====
function selectOption(option) {
    game.selectOption(option);
}

function resetAnswer() {
    game.resetAnswer();
}

function checkAnswer() {
    game.checkAnswer();
}

function goToMainPage() {
    window.location.href = 'https://plekdev.github.io/BlueMinds/selectores/selector-visual.html';
}
