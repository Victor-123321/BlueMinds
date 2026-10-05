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

// ===== SISTEMA DE IA ADAPTATIVO PARA MEMORIA DE PATRONES =====
class AIMemoryGame {
    constructor() {
        this.sequence = [];
        this.playerSequence = [];
        this.isShowingSequence = false;
        this.currentLevel = 1;
        this.score = 0;
        this.highlightedColor = null;
        
        // Parámetros de IA
        this.memoryScore = 0;
        this.difficulty = 'easy';
        this.consecutiveCorrect = 0;
        this.consecutiveWrong = 0;
        this.sequenceSpeed = 800; // milisegundos entre colores
        this.reactionTime = 0;
        
        // Audio
        this.synth = window.speechSynthesis;
        this.audioEnabled = true;
        
        // Análisis de errores
        this.errorPattern = {
            firstError: false,
            repeatableErrors: 0,
            speedErrors: 0
        };
        
        this.colors = ["🔴", "🔵", "🟢", "🟡", "🟣", "🟠"];
        this.maxLevel = 5;
        
        // Niveles de dificultad
        this.difficultyConfig = {
            easy: { initialLength: 2, speed: 900, increment: 0.5 },
            medium: { initialLength: 3, speed: 700, increment: 1 },
            hard: { initialLength: 4, speed: 500, increment: 1.5 }
        };
        this.activeTimeouts = [];
    }

    // ===== SÍNTESIS DE VOZ =====
    speak(text) {
        if (!this.audioEnabled || !this.synth) return;
        
        // Cancelar cualquier audio en curso
        this.synth.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 1;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        this.synth.speak(utterance);
    }

    // ===== INICIO DEL JUEGO =====
    startNewLevel() {
        const config = this.difficultyConfig[this.difficulty];
        let sequenceLength = Math.min(config.initialLength + Math.floor(this.currentLevel * config.increment), 8);
        
        // Generar nueva secuencia
        this.sequence = [];
        for (let i = 0; i < sequenceLength; i++) {
            this.sequence.push(this.colors[Math.floor(Math.random() * this.colors.length)]);
        }
        
        this.playerSequence = [];
        this.updateUI();
        
        // Mostrar secuencia con retraso
        setTimeout(() => {
            this.speak(`Sigue el patrón que ves a continuación.`);
            setTimeout(() => {
                this.showSequence();
            }, 2500);
        }, 500);
    }

    // ===== MOSTRAR SECUENCIA DE COLORES =====
    async showSequence() {
        this.isShowingSequence = true;
        document.getElementById('status-message').textContent = gs('sequence_watch','👀 ¡Mira la secuencia!');
        
        for (let i = 0; i < this.sequence.length; i++) {
            await this.delay(this.sequenceSpeed);
            this.highlightColor(this.sequence[i]);
            await this.delay(600);
            this.unhighlightColor();
        }
        
        this.isShowingSequence = false;
        document.getElementById('status-message').textContent = gs('your_turn','🎮 ¡Tu turno!');
    }

    // ===== UTILIDADES =====
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    highlightColor(color) {
        this.highlightedColor = color;
        const button = document.querySelector(`[data-color="${color}"]`);
        if (button) {
            button.classList.add('highlighted');
        }
    }

    unhighlightColor() {
        if (this.highlightedColor) {
            const button = document.querySelector(`[data-color="${this.highlightedColor}"]`);
            if (button) {
                button.classList.remove('highlighted');
            }
            this.highlightedColor = null;
        }
    }

    // ===== MANEJO DE CLICS =====
    handleColorClick(color) {
        if (this.isShowingSequence) return;
        
        this.playerSequence.push(color);
        
        // Flash del color
        this.highlightColor(color);
        setTimeout(() => this.unhighlightColor(), 300);
        
        // Verificar si es correcto
        const isCorrect = this.sequence[this.playerSequence.length - 1] === color;
        
        if (!isCorrect) {
            this.handleError();
            return;
        }
        
        // Verificar si completó la secuencia
        if (this.playerSequence.length === this.sequence.length) {
            this.handleLevelComplete();
        }
        
        this.updateUI();
    }

    // ===== MANEJO DE ERRORES =====
    handleError() {
        this.consecutiveWrong++;
        this.consecutiveCorrect = 0;
        this.errorPattern.speedErrors++;
        
        const feedbackElement = document.getElementById('feedback');
        feedbackElement.textContent = gs('wrong','¡Ups! Intenta de nuevo 😊');
        feedbackElement.className = 'feedback incorrect';
        
        this.speak('¡Ups! Ese no era el patrón correcto. Intenta de nuevo.');
        
        this.score = Math.max(0, this.score - 5);
        this.adjustDifficulty();
        this.showAIAnalysis();
        
        setTimeout(() => {
            this.startNewLevel();
        }, 2000);
    }

    // ===== NIVEL COMPLETADO =====
    handleLevelComplete() {
        this.consecutiveCorrect++;
        this.consecutiveWrong = 0;
        
        const levelScore = this.currentLevel * 20;
        this.score += levelScore;
        
        const feedbackElement = document.getElementById('feedback');
        feedbackElement.textContent = gs('correct','¡Excelente! 🎉');
        feedbackElement.className = 'feedback correct';
        
        this.speak('¡Excelente! Completaste este nivel correctamente.');
        
        this.adjustDifficulty();
        this.showAIAnalysis();
        
        setTimeout(() => {
            if (this.currentLevel >= this.maxLevel) {
                this.completeGame();
            } else {
                this.currentLevel++;
                this.startNewLevel();
            }
        }, 1500);
    }

    // ===== ANÁLISIS Y AJUSTE DE DIFICULTAD =====
    adjustDifficulty() {
        this.memoryScore = (this.score / (this.currentLevel * 20)) * 100;
        
        const config = this.difficultyConfig[this.difficulty];
        
        // Si 3 aciertos seguidos → aumentar dificultad
        if (this.consecutiveCorrect >= 3 && this.memoryScore >= 80) {
            if (this.difficulty === 'easy') {
                this.difficulty = 'medium';
                this.sequenceSpeed = this.difficultyConfig.medium.speed;
            } else if (this.difficulty === 'medium') {
                this.difficulty = 'hard';
                this.sequenceSpeed = this.difficultyConfig.hard.speed;
            }
        }
        // Si está teniendo dificultad → reducir
        else if (this.consecutiveWrong >= 2 || this.memoryScore < 50) {
            if (this.difficulty === 'hard') {
                this.difficulty = 'medium';
                this.sequenceSpeed = this.difficultyConfig.medium.speed;
            } else if (this.difficulty === 'medium') {
                this.difficulty = 'easy';
                this.sequenceSpeed = this.difficultyConfig.easy.speed;
            }
            this.consecutiveWrong = 0;
        }
        
        this.showDifficultyIndicator();
    }

    showDifficultyIndicator() {
        const indicator = document.getElementById('difficulty-indicator');
        const levels = {
            easy: '⭐ Dificultad: FÁCIL (secuencias cortas y lentas)',
            medium: '⭐⭐ Dificultad: MEDIO (secuencias medianas y rápidas)',
            hard: '⭐⭐⭐ Dificultad: DIFÍCIL (secuencias largas y muy rápidas)'
        };

        indicator.textContent = levels[this.difficulty];
        indicator.style.display = 'block';
    }

    // ===== ANÁLISIS EN TIEMPO REAL =====
    showAIAnalysis() {
        const analysisEl = document.getElementById('ai-analysis');
        const analysisText = document.getElementById('analysis-text');
        
        let analysis = '';

        // Análisis de velocidad
        if (this.sequenceSpeed < 600) {
            analysis += '⚡ Secuencia muy rápida. ';
        } else if (this.sequenceSpeed > 800) {
            analysis += '🐢 Secuencia lenta para practicar. ';
        }

        // Análisis de racha
        if (this.consecutiveCorrect > 0) {
            analysis += `✅ ${this.consecutiveCorrect} acierto(s) seguido(s). `;
        }
        if (this.consecutiveWrong > 0) {
            analysis += `❌ ${this.consecutiveWrong} error(es) seguido(s). `;
        }

        // Cambios de dificultad
        if (this.difficulty === 'hard') {
            analysis += '📈 Nivel: DIFÍCIL. ';
        } else if (this.difficulty === 'easy') {
            analysis += '📉 Nivel: FÁCIL. ';
        } else {
            analysis += '➡️ Nivel: MEDIO. ';
        }

        analysisText.textContent = analysis || gs('memory_developing','Memoria en desarrollo...');
        analysisEl.classList.add('show');
    }

    // ===== ACTUALIZAR UI =====
    updateUI() {
        document.getElementById('current-level').textContent = this.currentLevel;
        document.getElementById('max-level').textContent = this.maxLevel;
        document.getElementById('score').textContent = this.score + ' ' + gs('points', 'puntos');
        document.getElementById('score-display').textContent = this.score + ' ' + gs('points', 'puntos');

        const progress = (this.currentLevel / this.maxLevel) * 100;
        document.getElementById('progress-fill').style.width = progress + '%';

        document.getElementById('sequence-progress').textContent = this.playerSequence.length;
        document.getElementById('sequence-length').textContent = this.sequence.length;
    }

    // ===== JUEGO COMPLETADO =====
    async completeGame() {


      const gameData = {
        gameId: 'memoria-patrones-1',
        style: 'visual',
        level: this.difficulty === 'hard' ? 3 : (this.difficulty === 'medium' ? 2 : 1),
        score: this.score,
        accuracy: parseFloat(((this.score / (this.maxLevel * 20)) * 100).toFixed(1)),
        responseTime: this.sequenceSpeed
      }
      try {
          await api.saveGameResults(gameData);
      } catch (e) {
          console.error("No se pudo guardar el progreso:", e);
      }

      const gameCard = document.querySelector('.status-card');
      const avgAccuracy = ((this.score / (this.maxLevel * 20)) * 100).toFixed(1);
      
      let performanceMessage = '¡Memoria excepcional! 🏆';
      let audioMessage = '¡Felicidades! Completaste el juego con una memoria excepcional.';
      
      if (avgAccuracy < 60) {
          performanceMessage = '¡Sigue practicando! Tu memoria mejorará. 💪';
          audioMessage = 'Juego completado. Sigue practicando para mejorar tu memoria.';
      } else if (avgAccuracy < 80) {
          performanceMessage = '¡Muy buen trabajo! Tu memoria está en desarrollo. 🌟';
          audioMessage = '¡Muy buen trabajo! Tu memoria está mejorando constantemente.';
      }

      this.speak(audioMessage);

      gameCard.innerHTML = `
          <div class="status-message">
              ¡Juego Completado!
          </div>
          
          <div style="background: linear-gradient(135deg, #0066CC 0%, #0099FF 100%); color: white; padding: 20px; border-radius: 12px; margin: 20px 0; font-size: 24px; font-weight: 700;">
              Tu puntaje final: ${this.score} puntos
          </div>

          <div style="background: rgba(0, 102, 204, 0.1); border-left: 4px solid #0066CC; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left; color: #1F2937; font-size: 14px;">
              <strong>📊 Análisis Final de IA - Memoria de Patrones:</strong>
              <div style="margin-top: 10px; line-height: 1.8;">
                  <div>✓ Precisión: ${avgAccuracy}%</div>
                  <div>✓ Puntuación de memoria: ${this.memoryScore.toFixed(0)}%</div>
                  <div>✓ Nivel final alcanzado: ${this.difficulty.toUpperCase()}</div>
                  <div>✓ Velocidad de respuesta: ${this.sequenceSpeed}ms</div>
              </div>
          </div>

          <div style="color: var(--primary-blue); font-size: 18px; font-weight: 600; margin: 15px 0;">
              ${performanceMessage}
          </div>
      `;

      const colorCard = document.querySelector('.color-card');
      colorCard.innerHTML = `
          <div class="options-container">
              <button class="option-button primary" onclick="location.reload()">
                  Jugar de Nuevo
              </button>
              <button class="option-button blue" onclick="goToMainPage()">
                  Volver al Menú
              </button>
          </div>
      `;

      document.getElementById('ai-analysis').classList.remove('show');
  }
}

// ===== INICIALIZACIÓN =====
const game = new AIMemoryGame();

document.addEventListener('DOMContentLoaded', () => {
    game.startNewLevel();
});

// ===== FUNCIONES GLOBALES =====
function handleColorClick(color) {
    game.handleColorClick(color);
}

function goToMainPage() {
    window.location.href = 'https://plekdev.github.io/BlueMinds/selectores/selector-visual.html';
    
}
