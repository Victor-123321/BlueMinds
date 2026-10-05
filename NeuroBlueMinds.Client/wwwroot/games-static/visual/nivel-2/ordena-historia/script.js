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

// ===== AUDIO MANAGER =====
class AudioManager {
    constructor() {
        this.synth = window.speechSynthesis;
        this.audioEnabled = true;
    }
    
    speak(text, rate = 1) {
        if (!this.audioEnabled) return;
        this.synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.lang = 'es-ES';
        this.synth.speak(utterance);
    }
    
    toggleAudio() {
        this.audioEnabled = !this.audioEnabled;
        return this.audioEnabled;
    }
}

// ===== SISTEMA DE IA ADAPTATIVO PARA SECUENCIACIÓN NARRATIVA =====
class AISequenceGame {
    constructor() {
        this.currentRound = 0;
        this.score = 0;
        this.selectedSequence = [];
        this.showFeedback = false;
        this.draggedElement = null;
        
        // Audio Manager
        this.audioManager = new AudioManager();
        
        // Parámetros de IA
        this.narrativeScore = 0;
        this.difficulty = 'easy';
        this.consecutiveCorrect = 0;
        this.consecutiveWrong = 0;
        this.totalQuestions = 5;
        
        // Análisis de errores
        this.sequenceStats = {};
        this.confusingImages = [];
        this.reactionTimes = [];
        this.startSequenceTime = 0;
        
        // Base de secuencias expandida con descripciones para imágenes personalizables
        // INSTRUCCIONES: Reemplaza las URLs con tus propias imágenes
        this.allSequences = {
            easy: [
                {
                    images: [
                        { src: "https://static.vecteezy.com/system/resources/previews/017/076/256/original/boy-waking-up-yawning-cartoon-vector.jpg", desc: "Niño despertando en la cama" },
                        { src: "https://img.freepik.com/vector-premium/nino-feliz-desayunando-colorida-ilustracion-vectorial-al-estilo-dibujos-animados_1322206-39435.jpg", desc: "Desayunando en la mesa" },
                        { src: "https://st2.depositphotos.com/2945617/8585/v/950/depositphotos_85856074-stock-illustration-little-boy-going-to-school.jpg", desc: "Niño en la escuela" }
                    ],
                    correct: [0, 1, 2],
                    title: "La Mañana",
                    narrative: "Primero nos despertamos, luego desayunamos y finalmente vamos a la escuela.",
                    complexity: 1
                },
                {
                    images: [
                        { src: "https://tse4.mm.bing.net/th/id/OIP.xMwDxflkWqaKagRuOp1hZAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3", desc: "Nube de lluvia" },
                        { src: "https://tse3.mm.bing.net/th/id/OIP.FAMR-s9zad_LslQlDT9gDQHaHa?rs=1&pid=ImgDetMain&o=7&rm=3", desc: "Charcos de agua" },
                        { src: "https://tse2.mm.bing.net/th/id/OIP.t2COZIcOmALI7sa9CeRsfQHaG5?rs=1&pid=ImgDetMain&o=7&rm=3", desc: "Arcoíris en el cielo" }
                    ],
                    correct: [0, 1, 2],
                    title: "Después de la lluvia",
                    narrative: "Primero llueve, se forman charcos y luego aparece un arcoíris.",
                    complexity: 1
                },
                {
                    images: [
                        { src: "https://static.vecteezy.com/system/resources/previews/024/778/157/non_2x/seed-with-sprouted-sprout-isolated-cartoon-illustration-concept-of-gardening-and-sowing-vector.jpg", desc: "Semilla en la tierra" },
                        { src: "https://tse2.mm.bing.net/th/id/OIP.a2tNbGqI4G98OE6yJv-wEAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3", desc: "Planta pequeña creciendo" },
                        { src: "https://tse3.mm.bing.net/th/id/OIP.bcBuWNMwvSZF6uOdADg29gHaHa?rs=1&pid=ImgDetMain&o=7&rm=3", desc: "Flor completamente abierta" }
                    ],
                    correct: [0, 1, 2],
                    title: "Crecimiento de una flor",
                    narrative: "Primero sembramos la semilla, luego crece como una plantita y finalmente florece.",
                    complexity: 1
                }
            ],
            medium: [
                {
                    images: [
                        { src: "https://c8.alamy.com/comp/2M0HW0Y/baking-ingredients-isolated-cartoon-vector-illustration-cooking-ingredients-preparing-food-at-home-close-up-set-of-products-view-from-above-homemade-pastry-home-kitchen-vector-cartoon-2M0HW0Y.jpg", desc: "Ingredientes para hornear" },
                        { src: "https://tse1.mm.bing.net/th/id/OIP.mStS74GCKGvdTpsFDNxhfwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3", desc: "Mezclando ingredientes" },
                        { src: "https://media.istockphoto.com/id/847089908/es/vector/pastel-en-el-horno-hvector-dibujos-animados.jpg?s=612x612&w=is&k=20&c=0HeOwc26coQNYFCkETUa75sDCOjqRnZzMEvBG1kxAsU=", desc: "Pastel en el horno" },
                        { src: "https://png.pngtree.com/png-clipart/20220430/original/pngtree-birthday-cake-cartoon-vector-illustration-png-image_7597943.png", desc: "Pastel listo y delicioso" }
                    ],
                    correct: [0, 1, 2, 3],
                    title: "Hacer un pastel",
                    narrative: "Primero preparamos los ingredientes, los mezclamos, los horneamos y finalmente tenemos un pastel delicioso.",
                    complexity: 2
                },
                {
                    images: [
                        { src: "https://tse1.mm.bing.net/th/id/OIP.KzGzpzjsBBdyEh-zjkgUpQHaHa?rs=1&pid=ImgDetMain&o=7&rm=3", desc: "Oruga pequeña" },
                        { src: "https://tse3.mm.bing.net/th/id/OIP.lV2ReNOe6gdmf-egtADD-AHaI7?rs=1&pid=ImgDetMain&o=7&rm=3", desc: "Capullo de la metamorfosis" },
                        { src: "https://static.vecteezy.com/system/resources/previews/010/337/273/original/cartoon-colourful-butterfly-character-welcoming-hands-gesture-butterfly-with-beuatifil-wing-pattern-png.png", desc: "Mariposa hermosa volando" }
                    ],
                    correct: [0, 1, 2],
                    title: "Ciclo de la mariposa",
                    narrative: "La oruga se convierte en capullo y luego en una hermosa mariposa.",
                    complexity: 2
                }
            ],
            hard: [
                {
                    images: [
                        { src: "https://img.freepik.com/vector-premium/lindo-huevo-gallina-feliz-personaje-animado-huevo-gallina-concepto-pascua_92289-1205.jpg?w=2000o", desc: "Huevo de gallina" },
                        { src: "https://tse1.mm.bing.net/th/id/OIP.-UsPwYf55VTgxb6OyhbMMQHaHJ?rs=1&pid=ImgDetMain&o=7&rm=3", desc: "Pollito recién nacido" },
                        { src: "https://tse1.mm.bing.net/th/id/OIP.4il2Ne-LrqPmpksaW96T_AHaHa?rs=1&pid=ImgDetMain&o=7&rm=3", desc: "Pollo adulto" },
                        { src: "https://thumbs.dreamstime.com/b/la-gallina-linda-anaranjada-est%C3%A1-poniendo-los-huevos-en-el-ejemplo-plano-del-vector-de-historieta-jerarqu%C3%ADa-aislado-fondo-blanco-109469709.jpg", desc: "Gallina poniendo huevos" }
                    ],
                    correct: [0, 1, 2, 3],
                    title: "Ciclo de vida de la gallina",
                    narrative: "El huevo se convierte en pollito, luego en pollo adulto y finalmente la gallina pone nuevos huevos.",
                    complexity: 3
                },
                {
                    images: [
                        { src: "https://tse4.mm.bing.net/th/id/OIP.i9DsDzYnHNuRbMS1Xrjc_AHaHa?rs=1&pid=ImgDetMain&o=7&rm=3", desc: "Moneda en la mano" },
                        { src: "https://img.freepik.com/vector-premium/ilustracion-dibujos-animados-bonita-ahorrando-dinero-usando-alcancia_869472-1101.jpg?w=2000", desc: "Depositando en el banco" },
                        { src: "https://tse1.mm.bing.net/th/id/OIP.0hUNQY1KWP1Ir5vroY_bSAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3", desc: "Tiempo pasando" },
                        { src: "https://tse3.mm.bing.net/th/id/OIP.CPVijvshD_czEmmRwkf98wHaHa?rs=1&pid=ImgDetMain&o=7&rm=3", desc: "Dinero con intereses" }
                    ],
                    correct: [0, 1, 2, 3],
                    title: "Ahorrar dinero",
                    narrative: "Guardamos monedas, las depositamos en el banco, espera tiempo y crece nuestro dinero.",
                    complexity: 3
                }
            ]
        };
        
        // Inicializar estadísticas
        Object.values(this.allSequences).forEach(sequences => {
            sequences.forEach((seq, idx) => {
                this.sequenceStats[seq.title] = {
                    attempts: 0,
                    correct: 0,
                    avgTime: 0,
                    mistakesPattern: []
                };
            });
        });
        
        this.loadSequence();
    }
    
    selectNextSequence() {
        const sequencesForDifficulty = this.allSequences[this.difficulty];
        
        // Priorizar secuencias problemáticas
        const problematicSequences = sequencesForDifficulty.filter(seq => {
            const stats = this.sequenceStats[seq.title];
            return stats && stats.attempts > 0 && stats.correct === 0;
        });
        
        if (problematicSequences.length > 0 && Math.random() > 0.5) {
            return problematicSequences[Math.floor(Math.random() * problematicSequences.length)];
        }
        
        return sequencesForDifficulty[Math.floor(Math.random() * sequencesForDifficulty.length)];
    }
    
    adjustDifficulty() {
        this.narrativeScore = (this.score / (this.totalQuestions * 20)) * 100;
        
        // Si 3 aciertos seguidos y >= 80% → aumentar dificultad
        if (this.consecutiveCorrect >= 3 && this.narrativeScore >= 80) {
            if (this.difficulty === 'easy') {
                this.difficulty = 'medium';
            } else if (this.difficulty === 'medium') {
                this.difficulty = 'hard';
            }
        }
        // Si está teniendo dificultad → reducir
        else if (this.consecutiveWrong >= 2 || this.narrativeScore < 50) {
            if (this.difficulty === 'hard') {
                this.difficulty = 'medium';
            } else if (this.difficulty === 'medium') {
                this.difficulty = 'easy';
            }
            this.consecutiveWrong = 0;
        }
        
        this.showDifficultyIndicator();
    }
    
    showDifficultyIndicator() {
        const indicator = document.getElementById('difficulty-indicator');
        const levels = {
            easy: '⭐ Dificultad: FÁCIL (3 imágenes)',
            medium: '⭐⭐ Dificultad: MEDIO (3-4 imágenes)',
            hard: '⭐⭐⭐ Dificultad: DIFÍCIL (4+ imágenes)'
        };
        
        indicator.textContent = levels[this.difficulty];
        indicator.style.display = 'block';
    }
    
    showNarrativeHint() {
        if (this.consecutiveWrong >= 1) {
            const hintBox = document.getElementById('narrative-hint');
            hintBox.innerHTML = `<strong>💡 Pista narrativa:</strong> ${this.currentSequence.narrative}`;
            hintBox.style.display = 'block';
            
            // Leer la pista en voz alta
            this.audioManager.speak(`Pista: ${this.currentSequence.narrative}`);
        } else {
            document.getElementById('narrative-hint').style.display = 'none';
        }
    }
    
    loadSequence() {
        this.selectedSequence = [];
        this.showFeedback = false;
        this.startSequenceTime = Date.now();
        
        // Seleccionar secuencia
        this.currentSequence = this.selectNextSequence();
        
        // Actualizar UI
        document.getElementById('current-round').textContent = this.currentRound + 1;
        document.getElementById('total-rounds').textContent = this.totalQuestions;
        document.getElementById('sequence-title').textContent = this.currentSequence.title;
        
        // Leer el título de la secuencia
        this.audioManager.speak(this.currentSequence.title);
        
        const progress = ((this.currentRound + 1) / this.totalQuestions) * 100;
        document.getElementById('progress-fill').style.width = progress + '%';
        
        // Cargar secuencia display (vacío al inicio)
        const sequenceDisplay = document.getElementById('sequence-display');
        sequenceDisplay.innerHTML = '';
        
        for (let i = 0; i < this.currentSequence.images.length; i++) {
            const item = document.createElement('div');
            item.className = 'sequence-item empty';
            item.textContent = '?';
            item.dataset.position = i;
            
            // Permitir drop en los slots
            item.addEventListener('dragover', (e) => this.handleDragOver(e));
            item.addEventListener('drop', (e) => this.handleDrop(e));
            
            sequenceDisplay.appendChild(item);
        }
        
        // Cargar opciones
        const optionsDisplay = document.getElementById('options-display');
        optionsDisplay.innerHTML = '';
        
        // Mezclar imágenes
        const shuffledImages = [...this.currentSequence.images].sort(() => Math.random() - 0.5);
        
        shuffledImages.forEach((image, idx) => {
            const button = document.createElement('div');
            button.className = 'option-item';
            button.draggable = true;
            button.dataset.correctIndex = this.currentSequence.images.indexOf(image);
            button.title = image.desc;
            
            // Crear imagen
            const img = document.createElement('img');
            img.src = image.src;
            img.alt = image.desc;
            button.appendChild(img);
            
            // Eventos drag
            button.addEventListener('dragstart', (e) => this.handleDragStart(e, button));
            button.addEventListener('dragend', (e) => this.handleDragEnd(e));
            
            // Click para seleccionar
            button.addEventListener('click', () => this.selectImage(button));
            
            optionsDisplay.appendChild(button);
        });
        
        // Limpiar feedback
        document.getElementById('feedback').classList.remove('show');
        document.getElementById('ai-analysis').classList.remove('show');
        
        this.adjustDifficulty();
        this.showNarrativeHint();
    }
    
    handleDragStart(e, element) {
        this.draggedElement = element;
        element.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }
    
    handleDragEnd(e) {
        this.draggedElement = null;
        document.querySelectorAll('.option-item').forEach(el => {
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
        e.stopPropagation();
        
        if (this.draggedElement && !this.draggedElement.classList.contains('used')) {
            const position = parseInt(e.target.dataset.position) || parseInt(e.target.parentElement.dataset.position);
            const correctIndex = parseInt(this.draggedElement.dataset.correctIndex);
            
            // Solo agregar si no está ya en la secuencia
            if (!this.selectedSequence.includes(correctIndex)) {
                this.selectedSequence.push(correctIndex);
                this.draggedElement.classList.add('used');
                
                // Actualizar display
                const sequenceDisplay = document.getElementById('sequence-display');
                const items = sequenceDisplay.querySelectorAll('.sequence-item');
                const currentIdx = this.selectedSequence.length - 1;
                
                if (items[currentIdx]) {
                    items[currentIdx].innerHTML = '';
                    const img = document.createElement('img');
                    img.src = this.currentSequence.images[correctIndex].src;
                    img.alt = this.currentSequence.images[correctIndex].desc;
                    items[currentIdx].appendChild(img);
                    
                    const number = document.createElement('div');
                    number.className = 'sequence-number';
                    number.textContent = currentIdx + 1;
                    items[currentIdx].appendChild(number);
                    items[currentIdx].classList.remove('empty');
                }
            }
        }
        
        return false;
    }
    
    selectImage(element) {
        if (element.classList.contains('used')) return;
        
        const correctIndex = parseInt(element.dataset.correctIndex);
        
        if (!this.selectedSequence.includes(correctIndex)) {
            this.selectedSequence.push(correctIndex);
            element.classList.add('used');
            
            // Actualizar display
            const sequenceDisplay = document.getElementById('sequence-display');
            const items = sequenceDisplay.querySelectorAll('.sequence-item');
            const currentIdx = this.selectedSequence.length - 1;
            
            if (items[currentIdx]) {
                items[currentIdx].innerHTML = '';
                const img = document.createElement('img');
                img.src = this.currentSequence.images[correctIndex].src;
                img.alt = this.currentSequence.images[correctIndex].desc;
                items[currentIdx].appendChild(img);
                
                const number = document.createElement('div');
                number.className = 'sequence-number';
                number.textContent = currentIdx + 1;
                items[currentIdx].appendChild(number);
                items[currentIdx].classList.remove('empty');
            }
        }
    }
    
    resetSequence() {
        this.selectedSequence = [];
        this.audioManager.speak('Reiniciando secuencia');
        this.loadSequence();
    }
    
    checkSequence() {
        if (this.selectedSequence.length !== this.currentSequence.images.length) {
            this.showFeedback = true;
            const feedbackElement = document.getElementById('feedback');
            feedbackElement.textContent = 'Debes completar toda la secuencia';
            feedbackElement.className = 'feedback incorrect show';
            this.audioManager.speak('Debes completar toda la secuencia');
            return;
        }
        
        this.reactionTime = (Date.now() - this.startSequenceTime) / 1000;
        const isCorrect = JSON.stringify(this.selectedSequence) === JSON.stringify(this.currentSequence.correct);
        
        const feedbackElement = document.getElementById('feedback');
        const feedbackText = document.getElementById('feedback-text');
        
        const sequenceKey = this.currentSequence.title;
        this.sequenceStats[sequenceKey].attempts++;
        this.sequenceStats[sequenceKey].avgTime = 
            (this.sequenceStats[sequenceKey].avgTime + this.reactionTime) / 2;
        
        if (isCorrect) {
            this.score += 20;
            this.consecutiveCorrect++;
            this.consecutiveWrong = 0;
            this.sequenceStats[sequenceKey].correct++;
            
            feedbackText.textContent = `¡Correcto! 🎉 "${this.currentSequence.title}"`;
            feedbackElement.className = 'feedback correct show';
            this.audioManager.speak('¡Correcto! Excelente trabajo');
        } else {
            this.consecutiveWrong++;
            this.consecutiveCorrect = 0;
            this.sequenceStats[sequenceKey].mistakesPattern.push(this.selectedSequence);
            
            if (!this.confusingImages.includes(this.currentSequence.title)) {
                this.confusingImages.push(this.currentSequence.title);
            }
            
            feedbackText.textContent = `No es correcto. Intenta de nuevo 😊`;
            feedbackElement.className = 'feedback incorrect show';
            this.audioManager.speak('No es correcto. Intenta de nuevo');
        }
        
        document.getElementById('score').textContent = this.score + ' ' + gs('points', 'puntos');
        document.getElementById('score-display').textContent = this.score + ' ' + gs('points', 'puntos');
        
        this.adjustDifficulty();
        this.showAIAnalysis();
        
        setTimeout(() => {
            if (this.currentRound + 1 >= this.totalQuestions) {
                this.endGame();
            } else {
                this.currentRound++;
                this.loadSequence();
            }
        }, 2500);
    }
    
    showAIAnalysis() {
        const analysisEl = document.getElementById('ai-analysis');
        const analysisText = document.getElementById('analysis-text');
        
        let analysis = '';
        
        if (this.reactionTime < 5) {
            analysis += '⚡ Secuenciación rápida. ';
        } else if (this.reactionTime > 15) {
            analysis += '🤔 Necesitas más tiempo para procesar. ';
        }
        
        if (this.consecutiveCorrect > 0) {
            analysis += `✅ ${this.consecutiveCorrect} acierto(s) seguido(s). `;
        }
        if (this.consecutiveWrong > 0) {
            analysis += `❌ ${this.consecutiveWrong} error(es) seguido(s). `;
        }
        
        if (this.difficulty === 'hard') {
            analysis += '📈 Nivel: DIFÍCIL. ';
        } else if (this.difficulty === 'easy') {
            analysis += '📉 Nivel: FÁCIL. ';
        } else {
            analysis += '➡️ Nivel: MEDIO. ';
        }
        
        analysisText.textContent = analysis || 'Secuenciación en desarrollo...';
        analysisEl.classList.add('show');
    }
    
    async endGame() {
        const gameCard = document.querySelector('.game-card');
        const avgAccuracy = ((this.score / (this.totalQuestions * 20)) * 100).toFixed(1);
        const finalScore = this.narrativeScore.toFixed(0);
    // --- INTEGRACIÓN BLUEMINDS ---
        // Mapeo de dificultad para el servidor
        const levelNum = this.difficulty === 'hard' ? 3 : (this.difficulty === 'medium' ? 2 : 1);

        const gameData = {
            gameId: "ordena-historia", 
            style: "visual", 
            level: levelNum,
            score: this.score,
            accuracy: Math.round(parseFloat(avgAccuracy)),
            // Calculamos el tiempo promedio de respuesta de las rondas jugadas
            responseTime: this.reactionTimes.length > 0 
                ? Math.round(this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length) 
                : Math.round(this.reactionTime) 
        };

        try {
            await api.saveGameResults(gameData);
            console.log('✅ Progreso guardado exitosamente');
        } catch (error) {
            console.error('❌ Error al conectar con el servidor:', error);
        }
        // ----------------------------
        
        let performanceMessage = '¡Excelente secuenciación narrativa! 🏆';
        let audioMessage = 'Excelente secuenciación narrativa';
        
        if (avgAccuracy < 60) {
            performanceMessage = '¡Sigue practicando! La narrativa mejorará. 💪';
            audioMessage = 'Sigue practicando, la narrativa mejorará';
        } else if (avgAccuracy < 80) {
            performanceMessage = '¡Muy buen trabajo! Tu secuenciación mejora. 🌟';
            audioMessage = 'Muy buen trabajo, tu secuenciación mejora';
        }
        
        this.audioManager.speak(audioMessage);
        
        gameCard.innerHTML = `
            <h2>¡Juego Completado!</h2>
            <div style="font-size: 80px; margin: 30px 0;">🎉</div>
            
            <div style="background: linear-gradient(135deg, #0066CC 0%, #0099FF 100%); color: white; padding: 20px; border-radius: 12px; margin: 20px 0;">
                <div style="font-size: 24px; font-weight: 700; margin-bottom: 10px;">Tu puntaje final: ${this.score} puntos</div>
                <div style="font-size: 18px; opacity: 0.9;">Precisión: ${avgAccuracy}%</div>
            </div>

            <div style="background: rgba(0, 102, 204, 0.1); border-left: 4px solid #0066CC; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left; color: #1F2937; font-size: 14px;">
                <strong>📊 Análisis Final de IA - Secuenciación Narrativa:</strong>
                <div style="margin-top: 10px; line-height: 1.8;">
                    <div>✓ Puntuación de secuenciación: ${finalScore}%</div>
                    <div>✓ Tiempo promedio de respuesta: ${(this.reactionTime.toFixed(2))}s</div>
                    <div>✓ Secuencias confusas: ${this.confusingImages.length > 0 ? this.confusingImages.slice(0, 2).join(', ') : 'Ninguna'}</div>
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
    const game = new AISequenceGame();
    
    // Hacer checkSequence, resetSequence y goToMainPage globales
    window.checkSequence = () => game.checkSequence();
    window.resetSequence = () => game.resetSequence();
    window.goToMainPage = () => game.goToMainPage();
});
