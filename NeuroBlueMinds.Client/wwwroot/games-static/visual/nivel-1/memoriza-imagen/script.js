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

// ===== SISTEMA DE IA ADAPTATIVO =====
class AIMemoryGame {
    constructor() {
        this.currentRound = 0;
        this.score = 0;
        this.currentImage = null;
        this.options = [];
        this.showFeedback = false;
        this.isMemorizingPhase = true;
        this.timeRemaining = 5;
        
        // Parámetros de IA
        this.playerMemoryScore = 0;
        this.exposureTime = 5;
        this.failedImages = [];
        this.imageStats = {};
        this.difficulty = 'normal';
        this.consecutiveCorrect = 0;
        this.consecutiveWrong = 0;
        this.responseTime = 0;
        this.startMemoryTime = 0;
        
        // Niveles de dificultad
        this.difficultyLevels = {
            easy: { distractors: 2, time: 6, complexity: 'simple' },
            normal: { distractors: 2, time: 5, complexity: 'normal' },
            hard: { distractors: 3, time: 4, complexity: 'complex' }
        };

        // Base de imágenes categorizadas
        this.images = [
            { src: "https://tse2.mm.bing.net/th/id/OIP.iremaMYVEQmKqX0XkISwQgAAAA?rs=1&pid=ImgDetMain&o=7&rm=3?w=1380", name: "gato", category: "animal", difficulty: 1 },
            { src: "https://tse4.mm.bing.net/th/id/OIP.g20yYrHhw8E7FZWE5yf3MwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3?w=1380", name: "perro", category: "animal", difficulty: 1 },
            { src: "https://tse2.mm.bing.net/th/id/OIP.vluLeVl5ITns3V9R5ptDZgHaFc?rs=1&pid=ImgDetMain&o=7&rm=3?w=1380", name: "casa", category: "objeto", difficulty: 1 },
            { src: "https://img.freepik.com/vector-premium/dibujo-dibujos-animados-flor-rosa-centro-amarillo_1167562-3170.jpg?w=1380", name: "flor", category: "naturaleza", difficulty: 1 },
            { src: "https://tse1.mm.bing.net/th/id/OIP.J48Rm8Jv492HD2uEpSw6uwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3?w=1380", name: "árbol", category: "naturaleza", difficulty: 1 },
            { src: "https://th.bing.com/th/id/OIP.KvENQqXrbmaCQ9st9X_kkQHaHH?o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3?w=1380", name: "sol", category: "naturaleza", difficulty: 1 }
        ];

        this.totalRounds = 5;

        // Inicializar estadísticas de imágenes
        this.images.forEach(img => {
            this.imageStats[img.name] = {
                attempts: 0,
                correct: 0,
                wrong: 0,
                avgResponseTime: 0
            };
        });
    }

    // ===== ANÁLISIS DE IA =====
    analyzePerformance(isCorrect, responseTime) {
        const stats = this.imageStats[this.currentImage.name];
        
        stats.attempts++;
        stats.avgResponseTime = (stats.avgResponseTime + responseTime) / 2;

        if (isCorrect) {
            stats.correct++;
            this.consecutiveCorrect++;
            this.consecutiveWrong = 0;
        } else {
            stats.wrong++;
            this.consecutiveWrong++;
            this.consecutiveCorrect = 0;
            
            if (!this.failedImages.includes(this.currentImage.name)) {
                this.failedImages.push(this.currentImage.name);
            }
        }

        // Análisis de memoria
        this.playerMemoryScore = (this.score / ((this.currentRound + 1) * 20)) * 100;

        // Ajuste de dificultad automático
        this.adjustDifficulty();
    }

    adjustDifficulty() {
        // Si 3 respuestas correctas consecutivas → aumentar dificultad
        if (this.consecutiveCorrect >= 3) {
            this.difficulty = 'hard';
            this.exposureTime = Math.max(3, this.exposureTime - 1);
        }
        // Si 2 respuestas incorrectas → reducir dificultad
        else if (this.consecutiveWrong >= 2) {
            this.difficulty = 'easy';
            this.exposureTime = Math.min(7, this.exposureTime + 1);
        }
        // Desempeño normal
        else {
            this.difficulty = 'normal';
            this.exposureTime = 5;
        }

        this.showDifficultyIndicator();
    }

    showDifficultyIndicator() {
        const indicator = document.getElementById('difficulty-indicator');
        const levels = {
            easy: '⭐ Dificultad: FÁCIL',
            normal: '⭐⭐ Dificultad: NORMAL',
            hard: '⭐⭐⭐ Dificultad: DIFÍCIL'
        };

        indicator.textContent = levels[this.difficulty];
        indicator.style.display = 'block';
    }

    // ===== SELECCIÓN INTELIGENTE DE OPCIONES =====
    selectOptionsIntelligently(correctImage) {
        const difficulty = this.difficultyLevels[this.difficulty];
        let distractors = [];

        // Si el niño ha fallado, incluir distractores similares
        if (this.failedImages.length > 0) {
            distractors = this.images
                .filter(img => 
                    img.name !== correctImage.name && 
                    this.failedImages.includes(img.name)
                )
                .slice(0, difficulty.distractors);
        }

        // Completar con distractores aleatorios si es necesario
        if (distractors.length < difficulty.distractors) {
            const remaining = this.images
                .filter(img => 
                    img.name !== correctImage.name && 
                    !distractors.find(d => d.name === img.name)
                )
                .sort(() => Math.random() - 0.5);
            
            distractors = [
                ...distractors,
                ...remaining.slice(0, difficulty.distractors - distractors.length)
            ];
        }

        // Mezclar opciones
        return [
            correctImage,
            ...distractors
        ].sort(() => Math.random() - 0.5);
    }

    // ===== INICIO DEL JUEGO =====
    startNewRound() {
        // Priorizar imágenes fallidas
        let randomImage;
        if (this.failedImages.length > 0 && Math.random() > 0.5) {
            randomImage = this.images.find(img => img.name === this.failedImages[0]);
            this.failedImages.shift();
        } else {
            randomImage = this.images[Math.floor(Math.random() * this.images.length)];
        }

        this.currentImage = randomImage;
        this.options = this.selectOptionsIntelligently(randomImage);
        this.showFeedback = false;
        this.isMemorizingPhase = true;
        this.timeRemaining = this.exposureTime;
        this.startMemoryTime = Date.now();

        this.updateUI();
        this.startMemorizingPhase();
    }

    updateUI() {
        document.getElementById('current-round').textContent = this.currentRound + 1;
        document.getElementById('total-rounds').textContent = this.totalRounds;
        document.getElementById('score').textContent = this.score + ' ' + gs('points', 'puntos');
        document.getElementById('score-display').textContent = this.score + ' ' + gs('points', 'puntos');

        const progress = ((this.currentRound + 1) / this.totalRounds) * 100;
        document.getElementById('progress-fill').style.width = progress + '%';

        document.getElementById('current-image').src = this.currentImage.src;
        document.getElementById('word-label').textContent = this.currentImage.name;
        document.getElementById('image-display').classList.remove('hidden');
        document.getElementById('options-section').style.display = 'none';
        document.getElementById('countdown-display').classList.remove('hidden-text');
        document.getElementById('feedback').classList.remove('show');
        document.getElementById('ai-analysis').classList.remove('show');
    }

    startMemorizingPhase() {
        const countdownDisplay = document.getElementById('countdown-display');
        const countdownText = document.getElementById('countdown');

        const interval = setInterval(() => {
            countdownText.textContent = this.timeRemaining;
            this.timeRemaining--;

            if (this.timeRemaining < 0) {
                clearInterval(interval);
                document.getElementById('image-display').classList.add('hidden');
                document.getElementById('countdown-display').classList.add('hidden-text');
                this.showOptionsPhase();
            }
        }, 1000);
    }

    showOptionsPhase() {
        this.isMemorizingPhase = false;
        const optionsContainer = document.getElementById('options-container');
        optionsContainer.innerHTML = '';

        this.options.forEach((image) => {
            const button = document.createElement('button');
            button.className = 'option-button';
            button.textContent = image.name;
            button.onclick = () => this.handleAnswer(image.name);
            optionsContainer.appendChild(button);
        });

        document.getElementById('options-section').style.display = 'block';
    }

    handleAnswer(selectedName) {
        if (this.showFeedback) return;

        this.responseTime = (Date.now() - this.startMemoryTime) / 1000;
        const isCorrect = selectedName === this.currentImage.name;
        const feedbackElement = document.getElementById('feedback');
        const feedbackText = document.getElementById('feedback-text');

        this.analyzePerformance(isCorrect, this.responseTime);

        if (isCorrect) {
            this.score += 20;
            feedbackText.textContent = "¡Correcto! 🎉";
            feedbackElement.className = 'feedback correct show';
        } else {
            feedbackText.textContent = `No es correcto. Era: ${this.currentImage.name} 😊`;
            feedbackElement.className = 'feedback incorrect show';
        }

        this.showFeedback = true;
        document.getElementById('score').textContent = this.score + ' ' + gs('points', 'puntos');
        document.getElementById('score-display').textContent = this.score + ' ' + gs('points', 'puntos');

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

    showAIAnalysis() {
        const analysisEl = document.getElementById('ai-analysis');
        const analysisText = document.getElementById('analysis-text');
        
        let analysis = '';
        const memoryPercentage = this.playerMemoryScore.toFixed(0);

        if (this.responseTime < 2) {
            analysis += '⚡ Respuesta muy rápida. ';
        } else if (this.responseTime > 4) {
            analysis += '🤔 Respuesta lenta. ';
        }

        if (this.consecutiveCorrect > 0) {
            analysis += `✅ ${this.consecutiveCorrect} correcta(s) consecutiva(s). `;
        }

        if (this.difficulty === 'hard') {
            analysis += '📈 Nivel aumentado a DIFÍCIL. ';
        } else if (this.difficulty === 'easy') {
            analysis += '📉 Nivel reducido a FÁCIL. ';
        }

        analysisText.textContent = analysis || gs('memory_developing','Memoria en desarrollo...');
        analysisEl.classList.add('show');
    }

    async completeGame() {
// --- INTEGRACIÓN BLUEMINDS ---
        // Determinamos el nivel numérico basado en la dificultad alcanzada
        const levelNum = this.difficulty === 'hard' ? 3 : (this.difficulty === 'normal' ? 2 : 1);
        
        // La precisión se basa en el score acumulado (cada acierto son 20 pts, 5 rondas = 100)
        const calculatedAccuracy = Math.min((this.score / 100) * 100, 100);

        const gameData = {
            gameId: "memoriza-imagen", 
            style: "visual", 
            level: levelNum,
            score: this.score,
            accuracy: calculatedAccuracy,
            // Registramos el puntaje de memoria calculado por tu lógica de IA
            responseTime: this.playerMemoryScore ? Math.round(this.playerMemoryScore * 100) : 0 
        };

        // Envío al servidor de Arch Linux
        if (window.BlueMindsAPI) {
            window.BlueMindsAPI.saveGameResults(gameData);
            console.log("🧠 Analíticas de Memoria Visual enviadas:", gameData);
        }
        // ----------------------------
        const gameCard = document.querySelector('.game-card');
        const avgAccuracy = ((this.score / (this.totalRounds * 20)) * 100).toFixed(1);
        
        let performanceMessage = '¡Excelente memoria visual! 🏆';
        if (avgAccuracy < 60) {
            performanceMessage = '¡Sigue practicando para mejorar tu memoria! 💪';
        } else if (avgAccuracy < 80) {
            performanceMessage = '¡Muy buen trabajo! Tu memoria mejora. 🌟';
        }

        gameCard.innerHTML = `
            <h2>¡Juego Completado!</h2>
            <div style="font-size: 80px; margin: 30px 0;">🎉</div>
            
            <div style="background: linear-gradient(135deg, #0066CC 0%, #0099FF 100%); color: white; padding: 20px; border-radius: 12px; margin: 20px 0;">
                <div style="font-size: 24px; font-weight: 700; margin-bottom: 10px;">Tu puntaje final: ${this.score} puntos</div>
                <div style="font-size: 18px; opacity: 0.9;">Precisión: ${avgAccuracy}%</div>
            </div>

            <div style="background: rgba(0, 102, 204, 0.1); border-left: 4px solid #0066CC; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left; color: #1F2937;">
                <strong>📊 Análisis Final de IA:</strong>
                <div style="margin-top: 10px; font-size: 14px;">
                    <div>✓ Capacidad de memoria: ${this.playerMemoryScore.toFixed(0)}%</div>
                    <div>✓ Tiempo de reacción promedio: ${(this.options.length > 0 ? this.responseTime : 0).toFixed(2)}s</div>
                    <div>✓ Imágenes que requieren práctica: ${this.failedImages.length > 0 ? this.failedImages.join(', ') : 'Ninguna'}</div>
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
const game = new AIMemoryGame();

document.addEventListener('DOMContentLoaded', () => {
    game.startNewRound();
});

// ===== NAVEGACIÓN =====
function goToMainPage() {
    window.location.href = 'https://plekdev.github.io/BlueMinds/selectores/selector-visual.html';
}
