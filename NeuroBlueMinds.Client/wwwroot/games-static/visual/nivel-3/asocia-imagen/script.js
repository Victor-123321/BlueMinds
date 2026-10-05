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

// ===== SISTEMA DE IA ADAPTATIVO PARA ASOCIACIÓN PALABRA-IMAGEN =====
class AIAssociationGame {
    constructor() {
        this.currentRound = 0;
        this.score = 0;
        this.currentImage = null;
        this.options = [];
        this.showFeedback = false;
        this.draggedElement = null;
        
        // Parámetros de IA
        this.associationScore = 0;
        this.difficulty = 'easy';
        this.consecutiveCorrect = 0;
        this.consecutiveWrong = 0;
        this.totalQuestions = 5;
        this.sensitivity = 'normal';
        
        // Análisis de respuesta
        this.responseTime = 0;
        this.startTime = 0;
        this.errorTypes = {
            visualConfusion: 0,
            semanticConfusion: 0,
            slowResponse: 0,
            impulsiveResponse: 0
        };
        
        this.imageStats = {};
        this.problemImages = [];
        this.preferredCategories = {};
        
        // Base de imágenes con múltiples categorías
        this.allImages = {
            easy: [
                { src: "https://i.pinimg.com/originals/29/1e/d3/291ed353f93b45f607755109cca2a052.jpg", name: "coche", category: "vehículos", distractors: ["casa", "árbol"] },
                { src: "https://cdn5.vectorstock.com/i/1000x1000/43/49/cartoon-house-vector-4514349.jpg", name: "casa", category: "lugares", distractors: ["coche", "flor"] },
                { src: "https://thumbs.dreamstime.com/z/pelota-de-f%C3%BAtbol-para-jugar-icono-en-el-estilo-dibujos-animados-caricatura-aislado-fondo-blanco-236463054.jpg", name: "pelota", category: "juguetes", distractors: ["perro", "gato"] },
                { src: "https://cdn.pixabay.com/photo/2024/03/10/13/43/dog-8624743_1280.png", name: "perro", category: "animales", distractors: ["gato", "casa"] },
                { src: "https://static.vecteezy.com/system/resources/previews/013/089/641/original/illustration-of-cute-colored-cat-cat-cartoon-image-in-eps10-format-suitable-for-children-s-book-design-elements-introduction-of-cats-to-children-books-or-posters-about-animal-vector.jpg", name: "gato", category: "animales", distractors: ["perro", "pelota"] },
                { src: "https://cdn.pixabay.com/photo/2022/12/13/05/16/flowers-7652496_1280.png", name: "flor", category: "naturaleza", distractors: ["árbol", "casa"] }
            ],
            medium: [
                { src: "https://c8.alamy.com/compes/2bwxntf/ordenador-de-dibujos-animados-apuntando-con-su-dedo-2bwxntf.jpg", name: "computadora", category: "tecnología", distractors: ["teléfono", "libro"] },
                { src: "https://i.pinimg.com/originals/49/6e/44/496e44ee1f77e1b12edf3c9d68e23707.png", name: "libro", category: "educación", distractors: ["computadora", "lápiz"] },
                { src: "https://img.freepik.com/vetores-premium/pato-de-ilustracao-de-desenho-animado_323802-361.jpg?w=2000", name: "pato", category: "animales", distractors: ["gato", "pajaro"] },
                { src: "https://static.vecteezy.com/system/resources/previews/011/157/544/large_2x/mobile-phone-cartoon-icon-illustration-technology-object-icon-concept-isolated-premium-flat-cartoon-style-vector.jpg", name: "teléfono", category: "tecnología", distractors: ["computadora", "reloj"] },
                { src: "https://tse1.explicit.bing.net/th/id/OIP.nBy5c3VCj3LlojKPGb0ILgHaIm?rs=1&pid=ImgDetMain&o=7&rm=3", name: "manzana", category: "comida", distractors: ["naranja", "pan"] }
            ],
            hard: [
                { src: "https://static.vecteezy.com/system/resources/previews/016/704/376/original/cartoon-illustration-acoustic-guitar-colorful-musical-instrument-vector.jpg", name: "guitarra", category: "música", distractors: ["piano", "trompeta"] },
                { src: "https://tse2.mm.bing.net/th/id/OIP.dgfaiili0WFTJb1FPxoEKQHaHa?rs=1&pid=ImgDetMain&o=7&rm=3", name: "bicicleta", category: "vehículos", distractors: ["coche", "tren"] },
                { src: "https://img.freepik.com/vector-premium/ilustracion-vectorial-al-estilo-dibujos-animados-clip-microfono_761413-4518.jpg", name: "micrófono", category: "música", distractors: ["guitarra", "auriculares"] },
                { src: "https://tse2.mm.bing.net/th/id/OIP.29aisGf4Boe8M1l2_xNJJAHaGH?rs=1&pid=ImgDetMain&o=7&rm=3", name: "escritorio", category: "lugares", distractors: ["silla", "cama"] },
                { src: "https://image.freepik.com/vector-gratis/dibujos-animados-naturaleza-paisaje-mar_107173-7110.jpg", name: "mar", category: "naturaleza", distractors: ["montaña", "bosque"] }
            ]
        };
        
        // Inicializar estadísticas
        Object.values(this.allImages).forEach(images => {
            images.forEach(img => {
                this.imageStats[img.name] = {
                    attempts: 0,
                    correct: 0,
                    avgTime: 0,
                    errors: []
                };
                this.preferredCategories[img.category] = 0;
            });
        });
        
        this.loadImage();
    }
    
    selectNextImage() {
        const imagesForDifficulty = this.allImages[this.difficulty];
        
        // Priorizar imágenes problemáticas
        const problematicImages = imagesForDifficulty.filter(img => {
            const stats = this.imageStats[img.name];
            return stats && stats.attempts > 0 && stats.correct === 0;
        });
        
        if (problematicImages.length > 0 && Math.random() > 0.5) {
            return problematicImages[Math.floor(Math.random() * problematicImages.length)];
        }
        
        return imagesForDifficulty[Math.floor(Math.random() * imagesForDifficulty.length)];
    }
    
    adjustDifficulty() {
        this.associationScore = (this.score / (this.totalQuestions * 20)) * 100;
        
        // Si 3 aciertos seguidos y >= 80% → aumentar dificultad
        if (this.consecutiveCorrect >= 3 && this.associationScore >= 80) {
            if (this.difficulty === 'easy') {
                this.difficulty = 'medium';
                audioManager.speak('Aumentando dificultad a nivel medio', 0.9);
            } else if (this.difficulty === 'medium') {
                this.difficulty = 'hard';
                audioManager.speak('Aumentando dificultad a nivel difícil', 0.9);
            }
        }
        // Si está teniendo dificultad → reducir
        else if (this.consecutiveWrong >= 2 || this.associationScore < 50) {
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
        const numOptions = this.difficulty === 'easy' ? 2 : (this.difficulty === 'medium' ? 3 : 4);
        const levels = {
            easy: `⭐ Dificultad: FÁCIL (${numOptions} opciones)`,
            medium: `⭐⭐ Dificultad: MEDIO (${numOptions} opciones)`,
            hard: `⭐⭐⭐ Dificultad: DIFÍCIL (${numOptions} opciones)`
        };
        
        indicator.textContent = levels[this.difficulty];
        indicator.style.display = 'block';
    }
    
    detectSensitivity() {
        // Detectar si hay hipersensibilidad (muchos errores visuales) o hiposensibilidad
        if (this.errorTypes.visualConfusion > this.errorTypes.semanticConfusion) {
            this.sensitivity = 'hypersensitive';
            this.applyLowStimuliMode();
        } else if (this.consecutiveWrong >= 2 && this.responseTime > 8) {
            this.sensitivity = 'hyposensitive';
            this.applyHighContrastMode();
        } else {
            this.sensitivity = 'normal';
            this.applyNormalMode();
        }
        
        this.showVisualHint();
    }
    
    applyLowStimuliMode() {
        const display = document.getElementById('image-display');
        display.classList.remove('high-contrast');
        display.classList.add('low-stimuli');
    }
    
    applyHighContrastMode() {
        const display = document.getElementById('image-display');
        display.classList.remove('low-stimuli');
        display.classList.add('high-contrast');
    }
    
    applyNormalMode() {
        const display = document.getElementById('image-display');
        display.classList.remove('low-stimuli', 'high-contrast');
    }
    
    showVisualHint() {
        if (this.consecutiveWrong >= 1) {
            const hintBox = document.getElementById('visual-hint');
            const hints = {
                easy: `💡 Pista: La palabra comienza con "${this.currentImage.name.charAt(0).toUpperCase()}"`,
                medium: `💡 Pista: Es de la categoría "${this.currentImage.category}"`,
                hard: `💡 Pista: Tiene ${this.currentImage.name.length} letras`
            };
            hintBox.textContent = hints[this.difficulty];
            hintBox.style.display = 'block';
            audioManager.speak(hints[this.difficulty].replace('💡 Pista: ', ''), 0.9);
        } else {
            document.getElementById('visual-hint').style.display = 'none';
        }
    }
    
    loadImage() {
        this.showFeedback = false;
        this.startTime = Date.now();
        
        // Seleccionar imagen
        this.currentImage = this.selectNextImage();
        
        // Crear opciones
        const numOptions = this.difficulty === 'easy' ? 2 : (this.difficulty === 'medium' ? 3 : 4);
        const wrongOptions = this.allImages[this.difficulty]
            .filter(img => img.name !== this.currentImage.name)
            .sort(() => Math.random() - 0.5)
            .slice(0, numOptions - 1);
        
        this.options = [this.currentImage, ...wrongOptions].sort(() => Math.random() - 0.5);
        
        // Actualizar UI
        document.getElementById('current-round').textContent = this.currentRound + 1;
        document.getElementById('total-rounds').textContent = this.totalQuestions;
        
        const progress = ((this.currentRound + 1) / this.totalQuestions) * 100;
        document.getElementById('progress-fill').style.width = progress + '%';
        
        document.getElementById('current-image').src = this.currentImage.src;
        
        // Cargar opciones
        const optionsContainer = document.getElementById('options-container');
        optionsContainer.innerHTML = '';
        
        this.options.forEach((option) => {
            const button = document.createElement('button');
            button.className = 'option-button';
            button.textContent = option.name;
            button.draggable = true;
            button.dataset.correct = option.name === this.currentImage.name;
            
            button.addEventListener('dragstart', (e) => this.handleDragStart(e, button));
            button.addEventListener('dragend', (e) => this.handleDragEnd(e));
            button.addEventListener('click', () => this.handleAnswer(option.name));
            
            optionsContainer.appendChild(button);
        });
        
        // Drag and drop en imagen
        const imageDisplay = document.getElementById('image-display');
        imageDisplay.addEventListener('dragover', (e) => this.handleDragOver(e));
        imageDisplay.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Limpiar feedback
        document.getElementById('feedback').classList.remove('show');
        document.getElementById('ai-analysis').classList.remove('show');
        
        this.adjustDifficulty();
        this.detectSensitivity();
        
        // Audio: Anunciar la ronda
        audioManager.speak(`Ronda ${this.currentRound + 1}. Selecciona la palabra correcta para la imagen`, 1);
    }
    
    handleDragStart(e, element) {
        this.draggedElement = element;
        element.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }
    
    handleDragEnd(e) {
        this.draggedElement = null;
        document.querySelectorAll('.option-button').forEach(el => {
            el.classList.remove('dragging');
        });
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    }
    
    handleDrop(e) {
        e.preventDefault();
        if (this.draggedElement) {
            const wordName = this.draggedElement.textContent;
            this.handleAnswer(wordName);
        }
        return false;
    }
    
    handleAnswer(selectedName) {
        if (this.showFeedback) return;
        
        this.responseTime = (Date.now() - this.startTime) / 1000;
        const isCorrect = selectedName === this.currentImage.name;
        
        const feedbackElement = document.getElementById('feedback');
        const feedbackText = document.getElementById('feedback-text');
        
        const imageKey = this.currentImage.name;
        this.imageStats[imageKey].attempts++;
        this.imageStats[imageKey].avgTime = 
            (this.imageStats[imageKey].avgTime + this.responseTime) / 2;
        
        if (isCorrect) {
            this.score += 20;
            this.consecutiveCorrect++;
            this.consecutiveWrong = 0;
            this.imageStats[imageKey].correct++;
            this.preferredCategories[this.currentImage.category]++;
            
            feedbackText.textContent = `¡Correcto! 🎉 "${this.currentImage.name}"`;
            feedbackElement.className = 'feedback correct show';
            audioManager.speak(`Correcto. La palabra es ${this.currentImage.name}`, 0.95);
            
            // Reproducir sonido
            this.playSound();
        } else {
            this.consecutiveWrong++;
            this.consecutiveCorrect = 0;
            this.imageStats[imageKey].errors.push(selectedName);
            
            // Detectar tipo de error
            if (selectedName.length === this.currentImage.name.length) {
                this.errorTypes.visualConfusion++;
            } else {
                this.errorTypes.semanticConfusion++;
            }
            
            if (!this.problemImages.includes(imageKey)) {
                this.problemImages.push(imageKey);
            }
            
            feedbackText.textContent = `No es correcto. Era: "${this.currentImage.name}" 😊`;
            feedbackElement.className = 'feedback incorrect show';
            audioManager.speak(`Incorrecto. La palabra correcta es ${this.currentImage.name}`, 0.95);
        }
        
        document.getElementById('score').textContent = this.score + ' ' + gs('points', 'puntos');
        document.getElementById('score-display').textContent = this.score + ' ' + gs('points', 'puntos');
        
        // Actualizar botones
        document.querySelectorAll('.option-button').forEach(btn => {
            if (btn.textContent === selectedName) {
                if (isCorrect) {
                    btn.classList.add('correct-highlight', 'used');
                } else {
                    btn.classList.add('error-highlight');
                }
            }
            if (btn.textContent === this.currentImage.name && !isCorrect) {
                btn.classList.add('correct-highlight');
            }
            btn.disabled = true;
        });
        
        this.showFeedback = true;
        this.adjustDifficulty();
        this.detectSensitivity();
        this.showAIAnalysis();
        
        setTimeout(() => {
            if (this.currentRound + 1 >= this.totalQuestions) {
                this.endGame();
            } else {
                this.currentRound++;
                this.loadImage();
            }
        }, 2500);
    }
    
    playSound() {
        // Reproducir sonido usando Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    }
    
    showAIAnalysis() {
        const analysisEl = document.getElementById('ai-analysis');
        const analysisText = document.getElementById('analysis-text');
        
        let analysis = '';
        
        if (this.responseTime < 1.5) {
            analysis += '⚡ Respuesta impulsiva muy rápida. ';
            this.errorTypes.impulsiveResponse++;
        } else if (this.responseTime > 5) {
            analysis += '🤔 Respuesta lenta, necesita más tiempo. ';
            this.errorTypes.slowResponse++;
        }
        
        if (this.consecutiveCorrect > 0) {
            analysis += `✅ ${this.consecutiveCorrect} acierto(s) seguido(s). `;
        }
        if (this.consecutiveWrong > 0) {
            analysis += `❌ ${this.consecutiveWrong} error(es) seguido(s). `;
        }
        
        if (this.sensitivity === 'hypersensitive') {
            analysis += '👁️ Modo: Bajo estímulo visual. ';
        } else if (this.sensitivity === 'hyposensitive') {
            analysis += '🔆 Modo: Alto contraste. ';
        }
        
        if (this.difficulty === 'hard') {
            analysis += '📈 Nivel: DIFÍCIL. ';
        } else if (this.difficulty === 'easy') {
            analysis += '📉 Nivel: FÁCIL. ';
        } else {
            analysis += '➡️ Nivel: MEDIO. ';
        }
        
        analysisText.textContent = analysis || 'Asociación en desarrollo...';
        analysisEl.classList.add('show');
    }
    
     async endGame() {
        const gameCard = document.querySelector('.image-card');
        const avgAccuracy = ((this.score / (this.totalQuestions * 20)) * 100).toFixed(1);
        const finalScore = this.associationScore.toFixed(0);
    // --- INTEGRACIÓN BLUEMINDS ---
        const levelNum = this.difficulty === 'hard' ? 3 : (this.difficulty === 'medium' ? 2 : 1);

        const gameData = {
            gameId: "lee-asocia", 
            style: "lectoescritura", 
            level: levelNum,
            score: this.score,
            accuracy: Math.round(parseFloat(avgAccuracy)),
            // Capturamos el tiempo promedio de respuesta de las estadísticas acumuladas
            responseTime: Object.values(this.imageStats).reduce((acc, curr) => acc + curr.avgTime, 0) / this.totalQuestions,
            // Enviamos metadatos adicionales sobre el perfil sensorial detectado
            metadata: {
                sensitivity: this.sensitivity,
                visualErrors: this.errorTypes.visualConfusion,
                semanticErrors: this.errorTypes.semanticConfusion
            }
        };

        try {
            await api.saveGameResults(gameData);
            console.log('✅ Progreso guardado exitosamente');
        } catch (error) {
            console.error('❌ Error al conectar con el servidor:', error);
        }
        // ----------------------------
        
        let performanceMessage = '¡Excelente asociación palabra-imagen! 🏆';
        let performanceAudio = 'Excelente asociación palabra imagen';
        
        if (avgAccuracy < 60) {
            performanceMessage = '¡Sigue practicando! La asociación mejorará. 💪';
            performanceAudio = 'Sigue practicando, la asociación mejorará';
        } else if (avgAccuracy < 80) {
            performanceMessage = '¡Muy buen trabajo! Tu asociación mejora. 🌟';
            performanceAudio = 'Muy buen trabajo, tu asociación mejora';
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
                <strong>📊 Análisis Final de IA - Asociación Palabra-Imagen:</strong>
                <div style="margin-top: 10px; line-height: 1.8;">
                    <div>✓ Puntuación de asociación: ${finalScore}%</div>
                    <div>✓ Tiempo promedio de respuesta: ${(this.imageStats[this.currentImage?.name]?.avgTime || 0).toFixed(2)}s</div>
                    <div>✓ Errores visuales: ${this.errorTypes.visualConfusion}</div>
                    <div>✓ Errores semánticos: ${this.errorTypes.semanticConfusion}</div>
                    <div>✓ Sensibilidad detectada: ${this.sensitivity === 'hypersensitive' ? 'Hipersensible' : (this.sensitivity === 'hyposensitive' ? 'Hiposensible' : 'Normal')}</div>
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
    
    goToMainPage() {
        window.location.href = 'https://plekdev.github.io/BlueMinds/selectores/selector-visual.html';
    }
}

// Inicializar el juego
document.addEventListener('DOMContentLoaded', () => {
    const game = new AIAssociationGame();
    window.goToMainPage = () => game.goToMainPage();
});
