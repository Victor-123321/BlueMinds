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

// ===== SISTEMA DE IA ADAPTATIVO PARA RECONOCIMIENTO DE PROFESIONES =====
class AIProfessionsGame {
    constructor() {
        this.currentQuestion = 0;
        this.score = 0;
        this.selectedOption = null;
        this.answered = false;
        
        // Parámetros de IA
        this.professionScore = 0;
        this.difficulty = 'easy';
        this.consecutiveCorrect = 0;
        this.consecutiveWrong = 0;
        this.totalQuestions = 5;
        
        // Análisis de errores
        this.professionStats = {};
        this.masteredProfessions = [];
        this.problematicProfessions = [];
        
        // Base de profesiones expandida por dificultad
        this.allQuestions = {
            easy: [
                {
                    image: "https://i.pinimg.com/originals/dd/5f/5d/dd5f5d4cbe0531cd5dc4d5b7204b38a4.png",
                    options: ["Médico", "Ingeniero", "Cocinero"],
                    correctAnswer: 0,
                    profession: "Médico",
                    category: "salud",
                    complexity: 1
                },
                {
                    image: "https://tse1.mm.bing.net/th/id/OIP.msPDaNRRUyVPXdHj-pV-pwHaHa?rs=1&pid=ImgDetMain",
                    options: ["Abogado", "Profesor", "Piloto"],
                    correctAnswer: 1,
                    profession: "Profesor",
                    category: "educacion",
                    complexity: 1
                },
                {
                    image: "https://static.vecteezy.com/system/resources/previews/002/084/042/original/cute-fire-fighter-holding-wooden-stairs-character-cartoon-icon-illustration-free-vector.jpg",
                    options: ["Bombero", "Electricista", "Músico"],
                    correctAnswer: 0,
                    profession: "Bombero",
                    category: "seguridad",
                    complexity: 1
                },
                {
                    image: "https://img.freepik.com/vector-premium/ilustracion-vectorial-dibujos-animados-chef-cocinando-plato-arroz-frito_1263357-24820.jpg?w=2000",
                    options: ["Cocinero", "Mesero", "piloto"],
                    correctAnswer: 0,
                    profession: "Cocinero",
                    category: "gastronomia",
                    complexity: 1
                },
                {
                    image: "https://img.freepik.com/vector-premium/profesion-constructor-hombre-estilo-dibujos-animados-plana_180868-418.jpg",
                    options: ["Constructor", "Plomero", "Carpintero"],
                    correctAnswer: 0,
                    profession: "Constructor",
                    category: "construccion",
                    complexity: 1
                }
            ],
            medium: [
                {
                    image: "https://image.freepik.com/vector-gratis/enfermera-personaje-dibujos-animados-lindo_78094-108.jpg",
                    options: ["Abogada", "Doctora", "Enfermera"],
                    correctAnswer: 2,
                    profession: "Enfermera",
                    category: "salud",
                    complexity: 2
                },
                {
                    image: "https://static.vecteezy.com/system/resources/previews/049/166/524/original/cute-girl-photographer-with-camera-illustration-cartoon-style-free-vector.jpg",
                    options: ["Fotógrafo", "Camarógrafo", "Artista"],
                    correctAnswer: 0,
                    profession: "Fotógrafo",
                    category: "artes",
                    complexity: 2
                },
                {
                    image: "https://tse3.mm.bing.net/th/id/OIP.v0OHHvrgQAR3Py8Yn7kxPQHaHa?rs=1&pid=ImgDetMain&o=7&rm=3",
                    options: ["Veterinario", "Dentista", "Oftalmólogo"],
                    correctAnswer: 1,
                    profession: "Dentista",
                    category: "salud",
                    complexity: 2
                },
                {
                    image: "https://tse3.mm.bing.net/th/id/OIP.gVeGGYgBXKC50q1hUWjCIQHaHa?rs=1&pid=ImgDetMain&o=7&rm=3",
                    options: ["Jardinero", "Granjero", "Paisajista"],
                    correctAnswer: 0,
                    profession: "Jardinero",
                    category: "naturaleza",
                    complexity: 2
                },
                {
                    image: "https://tse3.mm.bing.net/th/id/OIP.iWlnUosfG4X9bSz_-DkuwAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3",
                    options: ["Mecánico", "Ingeniero", "Técnico"],
                    correctAnswer: 0,
                    profession: "Mecánico",
                    category: "mecanica",
                    complexity: 2
                }
            ],
            hard: [
                {
                    image: "https://tse3.mm.bing.net/th/id/OIP.MdwKTsCeC81Mt6HWsT8NHQHaHa?rs=1&pid=ImgDetMain&o=7&rm=3",
                    options: ["Piloto", "Comandante", "Aeromoza"],
                    correctAnswer: 0,
                    profession: "Piloto",
                    category: "aviacion",
                    complexity: 3
                },
                {
                    image: "https://tse4.mm.bing.net/th/id/OIP.PeivQAgqUPUvKdKGxZDsDAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3",
                    options: ["Científico", "Investigador", "Químico"],
                    correctAnswer: 0,
                    profession: "Científico",
                    category: "ciencia",
                    complexity: 3
                },
                {
                    image: "https://static.vecteezy.com/system/resources/previews/034/344/816/non_2x/rear-view-of-cartoon-man-architect-working-on-construction-project-illustration-vector.jpg",
                    options: ["Arquitecto", "Ingeniero", "Dibujante"],
                    correctAnswer: 0,
                    profession: "Arquitecto",
                    category: "diseno",
                    complexity: 3
                },
                {
                    image: "https://tse2.mm.bing.net/th/id/OIP.ACOKrk7PUAT4z7HPG3bLFwHaGe?rs=1&pid=ImgDetMain&o=7&rm=3",
                    options: ["Actor", "Cantante", "Comediante"],
                    correctAnswer: 0,
                    profession: "Actor",
                    category: "espectaculos",
                    complexity: 3
                },
                {
                    image: "https://img.freepik.com/vector-premium/chibi-contable-personaje-dibujos-animados-hombre-calculadora-mano_161819-1130.jpg",
                    options: ["Contador", "Auditor", "Economista"],
                    correctAnswer: 0,
                    profession: "Contador",
                    category: "finanzas",
                    complexity: 3
                }
            ]
        };
        
        // Inicializar estadísticas
        Object.values(this.allQuestions).forEach(questions => {
            questions.forEach(q => {
                this.professionStats[q.profession] = {
                    attempts: 0,
                    correct: 0,
                    category: q.category
                };
            });
        });
        
        this.initializeEventListeners();
        this.loadQuestion();
    }
    
    initializeEventListeners() {
        document.getElementById('checkAnswerBtn').addEventListener('click', () => this.checkAnswer());
        document.getElementById('nextQuestionBtn').addEventListener('click', () => this.nextQuestion());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('backBtn').addEventListener('click', () => this.goToMainPage());
        document.getElementById('backToMenuBtn').addEventListener('click', () => this.goToMainPage());
    }
    
    selectNextQuestion() {
        const questionsForDifficulty = this.allQuestions[this.difficulty];
        
        const problematicQuestions = questionsForDifficulty.filter(q => {
            const stats = this.professionStats[q.profession];
            return stats && stats.attempts > 0 && stats.correct === 0;
        });
        
        if (problematicQuestions.length > 0 && Math.random() > 0.5) {
            return problematicQuestions[Math.floor(Math.random() * problematicQuestions.length)];
        }
        
        return questionsForDifficulty[Math.floor(Math.random() * questionsForDifficulty.length)];
    }
    
    adjustDifficulty() {
        this.professionScore = (this.score / (this.totalQuestions * 10)) * 100;
        
        if (this.consecutiveCorrect >= 3 && this.professionScore >= 80) {
            if (this.difficulty === 'easy') {
                this.difficulty = 'medium';
                audioManager.speak('Aumentando dificultad a nivel medio', 0.9);
            } else if (this.difficulty === 'medium') {
                this.difficulty = 'hard';
                audioManager.speak('Aumentando dificultad a nivel difícil', 0.9);
            }
        }
        else if (this.consecutiveWrong >= 2 || this.professionScore < 50) {
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
            easy: '⭐ Dificultad: FÁCIL (profesiones básicas)',
            medium: '⭐⭐ Dificultad: MEDIO (profesiones complejas)',
            hard: '⭐⭐⭐ Dificultad: DIFÍCIL (profesiones especializadas)'
        };
        
        indicator.textContent = levels[this.difficulty];
        indicator.style.display = 'block';
    }
    
    loadQuestion() {
        this.selectedOption = null;
        this.answered = false;
        
        const currentQuestion = this.selectNextQuestion();
        this.currentQuestionData = currentQuestion;
        
        document.getElementById('questionNumber').textContent = `Pregunta ${this.currentQuestion + 1} de ${this.totalQuestions}`;
        document.getElementById('progressText').textContent = `${this.currentQuestion + 1}/${this.totalQuestions}`;
        document.getElementById('progressFill').style.width = `${((this.currentQuestion + 1) / this.totalQuestions) * 100}%`;
        
        document.getElementById('professionImage').src = currentQuestion.image;
        
        const optionsContainer = document.getElementById('optionsContainer');
        optionsContainer.innerHTML = '';
        
        const shuffledOptions = [...currentQuestion.options].sort(() => Math.random() - 0.5);
        const correctIndex = shuffledOptions.indexOf(currentQuestion.options[currentQuestion.correctAnswer]);
        
        shuffledOptions.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            optionElement.textContent = option;
            optionElement.dataset.correct = (index === correctIndex) ? 'true' : 'false';
            optionElement.addEventListener('click', () => this.selectOption(index));
            optionsContainer.appendChild(optionElement);
        });
        
        const feedback = document.getElementById('feedback');
        feedback.classList.remove('show', 'correct', 'incorrect');
        document.getElementById('ai-analysis').classList.remove('show');
        
        document.getElementById('checkAnswerBtn').style.display = 'inline-flex';
        document.getElementById('checkAnswerBtn').disabled = false;
        document.getElementById('nextQuestionBtn').style.display = 'none';
        
        this.adjustDifficulty();
        
        // Audio: Anunciar la pregunta
        audioManager.speak(`Pregunta ${this.currentQuestion + 1}. ¿Cuál es la profesión que se muestra en la imagen?`, 1);
    }
    
    selectOption(index) {
        if (this.answered) return;
        
        document.querySelectorAll('.option').forEach(option => {
            option.classList.remove('selected');
        });
        
        document.querySelectorAll('.option')[index].classList.add('selected');
        this.selectedOption = index;
    }
    
    checkAnswer() {
        if (this.selectedOption === null) {
            this.showFeedback('Por favor, selecciona una opción', false);
            audioManager.speak('Debes seleccionar una opción', 0.9);
            return;
        }
        
        this.answered = true;
        
        const options = document.querySelectorAll('.option');
        const correctOptionIndex = Array.from(options).findIndex(o => o.dataset.correct === 'true');
        
        options[correctOptionIndex].classList.add('correct');
        
        const profession = this.currentQuestionData.profession;
        this.professionStats[profession].attempts++;
        
        let isCorrect = false;
        if (this.selectedOption === correctOptionIndex) {
            isCorrect = true;
            this.score += 10;
            this.consecutiveCorrect++;
            this.consecutiveWrong = 0;
            this.professionStats[profession].correct++;
            
            if (!this.masteredProfessions.includes(profession) && 
                this.professionStats[profession].correct >= 1) {
                this.masteredProfessions.push(profession);
            }
            
            this.showFeedback('¡Correcto! ¡Bien hecho!', true);
            audioManager.speak(`Correcto. La respuesta es ${profession}`, 0.95);
        } else {
            options[this.selectedOption].classList.add('incorrect');
            this.consecutiveWrong++;
            this.consecutiveCorrect = 0;
            
            if (!this.problematicProfessions.includes(profession)) {
                this.problematicProfessions.push(profession);
            }
            
            this.showFeedback('¡Incorrecto! Intenta con otra opción', false);
            audioManager.speak(`Incorrecto. La respuesta correcta es ${profession}`, 0.95);
        }
        
        document.getElementById('score').textContent = this.score;
        document.getElementById('checkAnswerBtn').disabled = true;
        
        this.showAIAnalysis();
        
        if (this.currentQuestion < this.totalQuestions - 1) {
            setTimeout(() => {
                document.getElementById('nextQuestionBtn').style.display = 'inline-flex';
            }, 1500);
        } else {
            setTimeout(() => this.endGame(), 2000);
        }
    }
    
    showAIAnalysis() {
        const analysisEl = document.getElementById('ai-analysis');
        const analysisText = document.getElementById('analysis-text');
        
        let analysis = '';
        
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
        
        analysisText.textContent = analysis || 'Reconocimiento en desarrollo...';
        analysisEl.classList.add('show');
    }
    
    showFeedback(message, isCorrect) {
        const feedback = document.getElementById('feedback');
        const feedbackText = document.getElementById('feedbackText');
        const feedbackIcon = document.getElementById('feedbackIcon');
        
        feedbackText.textContent = message;
        feedbackIcon.textContent = isCorrect ? '✓' : '✗';
        
        feedback.classList.remove('correct', 'incorrect');
        feedback.classList.add(isCorrect ? 'correct' : 'incorrect', 'show');
    }
    
    nextQuestion() {
        this.currentQuestion++;
        this.loadQuestion();
    }
    
    async endGame() {
        const modal = document.getElementById('gameOverModal');
        const finalScore = document.getElementById('finalScore');
        const resultMessage = document.getElementById('resultMessage');
        const starsContainer = document.getElementById('starsContainer');
        
        finalScore.textContent = this.score;
        
        const percentage = (this.score / (this.totalQuestions * 10)) * 100;


    // --- INTEGRACIÓN BLUEMINDS ---
        // Convertimos la dificultad actual en un valor numérico para el dashboard
        const levelNum = this.difficulty === 'hard' ? 3 : (this.difficulty === 'medium' ? 2 : 1);

        const gameData = {
            gameId: "explora-profesiones", 
            style: "visual", 
            level: levelNum,
            score: this.score,
            accuracy: Math.round(percentage),
            // Enviamos la cantidad de profesiones que el niño ya domina
            responseTime: this.masteredProfessions.length 
        };

        try {
            await api.saveGameResults(gameData);
            console.log('✅ Progreso guardado exitosamente');
        } catch (error) {
            console.error('❌ Error al conectar con el servidor:', error);
        }
        // ----------------------------

        let stars = 0;
        let message = '';
        let audioMessage = '';
        
        if (percentage === 100) {
            stars = 3;
            message = '¡Perfecto! ¡Eres un experto en profesiones! 🏆';
            audioMessage = 'Perfecto. Eres un experto en profesiones';
        } else if (percentage >= 70) {
            stars = 2;
            message = '¡Muy bien! ¡Tienes una buena comprensión de profesiones! 🌟';
            audioMessage = 'Muy bien. Tienes una buena comprensión de profesiones';
        } else if (percentage >= 50) {
            stars = 1;
            message = '¡Buen intento! ¡Sigue practicando! 💪';
            audioMessage = 'Buen intento. Sigue practicando';
        } else {
            stars = 0;
            message = '¡No te rindas! ¡La próxima vez será mejor! 📚';
            audioMessage = 'No te rindas. La próxima vez será mejor';
        }
        
        resultMessage.textContent = message;
        audioManager.speak(`Juego completado. Puntuación: ${this.score} puntos. Porcentaje: ${percentage.toFixed(0)} por ciento. ${audioMessage}`, 0.95);
        
        starsContainer.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const star = document.createElement('span');
            star.textContent = i < stars ? '⭐' : '☆';
            starsContainer.appendChild(star);
        }
        
        document.getElementById('reportScore').textContent = percentage.toFixed(0);
        document.getElementById('reportMastered').textContent = this.masteredProfessions.length;
        document.getElementById('reportImprove').textContent = this.problematicProfessions.length > 0 
            ? this.problematicProfessions.slice(0, 2).join(', ') 
            : 'Ninguna';
        document.getElementById('reportLevel').textContent = this.difficulty.toUpperCase();
        
        modal.classList.add('show');
    }
    
    restartGame() {
        this.currentQuestion = 0;
        this.score = 0;
        this.selectedOption = null;
        this.answered = false;
        this.difficulty = 'easy';
        this.consecutiveCorrect = 0;
        this.consecutiveWrong = 0;
        this.masteredProfessions = [];
        this.problematicProfessions = [];
        
        document.getElementById('score').textContent = this.score;
        document.getElementById('gameOverModal').classList.remove('show');
        
        this.loadQuestion();
    }
    
    goToMainPage() {
       window.location.href = 'https://plekdev.github.io/BlueMinds/selectores/selector-visual.html';
    }
}

// Iniciar el juego cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    new AIProfessionsGame();
});
