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

// Variables globales
let currentRound = 0;
let score = 0;
let currentExercise = null;
let selectedOption = null;
let difficulty = 'normal';
let wrongAttempts = 0;
let hintUsed = false;
let errorFrequency = {}; // Rastrear errores recurrentes

const exercises = {
    easy: [
        {
            sentence: "El gato son bonito.",
            errorWord: "son",
            correctWord: "es",
            options: ["es", "somos", "eres"],
            errorType: "verbo",
            explanation: "El sujeto 'el gato' es singular, por eso el verbo debe ser 'ES' (singular), no 'SON' (plural).",
            hint: "¿Es el gato uno solo o varios? Busca la palabra que sea singular."
        },
        {
            sentence: "Los niño corren rápido.",
            errorWord: "niño",
            correctWord: "niños",
            options: ["niños", "niña", "niñas"],
            errorType: "número",
            explanation: "'Los' es plural, así que debe ir con 'NIÑOS' (plural), no 'NIÑO' (singular).",
            hint: "La palabra antes dice 'LOS' (plural), entonces la siguiente debe ser plural también."
        },
        {
            sentence: "La gata es blanca y grande.",
            errorWord: "grandon",
            correctWord: "grande",
            options: ["grandes", "grande", "grandas"],
            errorType: "género/número",
            explanation: "Bien hecho. 'GRANDE' es correcto porque funciona igual para singular y plural.",
            hint: "Los adjetivos deben coincidir en número con el sustantivo."
        }
    ],
    normal: [
        {
            sentence: "Los carros es muy rápidos.",
            errorWord: "es",
            correctWord: "son",
            options: ["son", "es", "eres"],
            errorType: "verbo",
            explanation: "'Los carros' (plural) necesita el verbo 'SON' (plural). 'ES' es solo para singular como 'El carro ES'.",
            hint: "¿Hay uno o varios carros? El verbo debe ser plural como el sustantivo."
        },
        {
            sentence: "Ella tiene unos libros rojo.",
            errorWord: "rojo",
            correctWord: "rojos",
            options: ["rojos", "roja", "rojas"],
            errorType: "número",
            explanation: "'Unos libros' es plural masculino, así que el adjetivo debe ser 'ROJOS' (plural), no 'ROJO' (singular).",
            hint: "Si hay varios libros, el color también debe estar en plural."
        },
        {
            sentence: "El profesor dijo a los estudiantes que trabajien duro.",
            errorWord: "trabajien",
            correctWord: "trabajen",
            options: ["trabajen", "trabajan", "trabajar"],
            errorType: "modo verbal",
            explanation: "Correcto. 'TRABAJEN' es subjuntivo y es lo adecuado después de 'que'.",
            hint: "Después de 'que' suele ir subjuntivo cuando es una orden o deseo."
        }
    ],
    hard: [
        {
            sentence: "Si yo taria rico, viajaría al mundo.",
            errorWord: "taria",
            correctWord: "fuera",
            options: ["fuera", "soñara", "tuviera"],
            errorType: "tiempo verbal",
            explanation: "En condicionales, la prótasis (primera parte) debe ir en imperfecto de subjuntivo 'FUERA', no en condicional 'SERÍA'.",
            hint: "En 'Si...' las estructuras condicionales tienen reglas especiales de conjugación."
        },
        {
            sentence: "A pesar de sus errores, el estudiante anduvo con sus estudios.",
            errorWord: "anduvo",
            correctWord: "continuó",
            options: ["continuó", "continúa", "continuar"],
            errorType: "tiempo verbal",
            explanation: "Correcto. 'CONTINUÓ' (pretérito) es el tiempo adecuado para narrar una acción pasada.",
            hint: "Busca consistencia temporal en toda la oración."
        },
        {
            sentence: "Aunque allia sido difícil, nosotros lograremos éxito.",
            errorWord: "allia",
            correctWord: "haya",
            options: ["haya", "ha", "había"],
            errorType: "modo verbal",
            explanation: "Correcto. 'HAYA' (presente de subjuntivo) es obligatorio después de 'aunque'.",
            hint: "Expresiones de concesión como 'aunque' requieren subjuntivo."
        }
    ]
};

const totalRounds = 5;

// Inicializar el juego
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    startNewRound();
});

// Configurar event listeners
function setupEventListeners() {
    document.getElementById('check-button').addEventListener('click', checkAnswer);
    document.getElementById('reset-button').addEventListener('click', resetRound);
    document.getElementById('hint-button').addEventListener('click', showHint);
}

// Iniciar una nueva ronda
function startNewRound() {
    // Seleccionar dificultad según desempeño
    const difficultyPool = selectDifficultyPool();
    const randomIndex = Math.floor(Math.random() * difficultyPool.length);
    
    currentExercise = difficultyPool[randomIndex];
    selectedOption = null;
    wrongAttempts = 0;
    hintUsed = false;

    updateUI();
    updateDifficulty();
}

// Seleccionar pool de dificultad según desempeño
function selectDifficultyPool() {
    if (wrongAttempts >= 3) {
        difficulty = 'easy';
        return exercises.easy;
    } else if (score >= 80 && currentRound > 2) {
        difficulty = 'hard';
        return exercises.hard;
    } else {
        difficulty = 'normal';
        return exercises.normal;
    }
}

// Actualizar interfaz
function updateUI() {
    document.getElementById('current-round').textContent = currentRound + 1;
    document.getElementById('total-rounds').textContent = totalRounds;
    document.getElementById('score').textContent = score + ' ' + gs('points', 'puntos');
    document.getElementById('score-display').textContent = score + ' ' + gs('points', 'puntos');

    const progress = ((currentRound + 1) / totalRounds) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';

    // Mostrar oración con error resaltado
    const sentenceText = document.getElementById('sentence-text');
    const parts = currentExercise.sentence.split(currentExercise.errorWord);
    sentenceText.innerHTML = parts[0] + 
        `<span class="error-word">${currentExercise.errorWord}</span>` + 
        parts[1];

    // Mostrar tipo de error
    const badges = {
        'verbo': '🔤 Error: Verbo',
        'número': '📊 Error: Número',
        'género': '♀️♂️ Error: Género',
        'tiempo verbal': '⏰ Error: Tiempo Verbal',
        'modo verbal': '📝 Error: Modo Verbal',
        'género/número': '📊 Error: Género/Número'
    };
    document.getElementById('word-type-badge').textContent = badges[currentExercise.errorType] || 'Error Gramatical';

    // Generar opciones
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    
    currentExercise.options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'option-button';
        button.textContent = option;
        button.addEventListener('click', () => selectOption(option, button));
        container.appendChild(button);
    });

    // Limpiar feedback
    document.getElementById('feedback').classList.add('hidden');
    document.getElementById('explanation').classList.add('hidden');
    document.getElementById('error-hint').classList.add('hidden');
}

// Seleccionar opción
function selectOption(option, button) {
    // Remover selección anterior
    document.querySelectorAll('.option-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Marcar nueva selección
    button.classList.add('selected');
    selectedOption = option;
}

// Mostrar pista
function showHint() {
    if (hintUsed) {
        showFeedback("Ya usaste la pista", false);
        return;
    }

    hintUsed = true;
    document.getElementById('hint-text').textContent = currentExercise.hint;
    document.getElementById('error-hint').classList.remove('hidden');
    showFeedback("💡 Pista mostrada", true);
}

// Verificar respuesta
function checkAnswer() {
    if (!selectedOption) {
        showFeedback("Debes seleccionar una opción", false);
        return;
    }

    const isCorrect = selectedOption === currentExercise.correctWord;

    if (isCorrect) {
        let points = hintUsed ? 15 : 20;
        score += points;
        
        // Registrar error corregido
        const key = currentExercise.errorType;
        errorFrequency[key] = (errorFrequency[key] || 0) + 1;

        showFeedback(`¡Correcto! +${points} puntos 🎉`, true);
        
        // Marcar como correcto
        document.querySelectorAll('.option-button').forEach(btn => {
            if (btn.textContent === selectedOption) {
                btn.classList.add('correct');
            }
        });

        // Mostrar explicación
        setTimeout(() => {
            showExplanation();
        }, 500);

        // Avanzar
        document.getElementById('check-button').disabled = true;
        document.getElementById('reset-button').disabled = true;
        document.getElementById('hint-button').disabled = true;

        setTimeout(() => {
            if (currentRound + 1 >= totalRounds) {
                completeGame();
            } else {
                currentRound++;
                startNewRound();
                document.getElementById('check-button').disabled = false;
                document.getElementById('reset-button').disabled = false;
                document.getElementById('hint-button').disabled = false;
            }
        }, 3000);
    } else {
        wrongAttempts++;
        showFeedback("Incorrecto. Intenta de nuevo", false);
        
        // Marcar como incorrecto
        document.querySelectorAll('.option-button').forEach(btn => {
            if (btn.textContent === selectedOption) {
                btn.classList.add('incorrect');
            }
        });

        updateDifficulty();
    }

    document.getElementById('score').textContent = score + ' ' + gs('points', 'puntos');
    document.getElementById('score-display').textContent = score + ' ' + gs('points', 'puntos');
}

// Mostrar explicación
function showExplanation() {
    document.getElementById('explanation-text').textContent = currentExercise.explanation;
    document.getElementById('explanation').classList.remove('hidden');
}

// Reiniciar ronda
function resetRound() {
    selectedOption = null;
    document.querySelectorAll('.option-button').forEach(btn => {
        btn.classList.remove('selected', 'incorrect', 'correct');
    });
    document.getElementById('feedback').classList.add('hidden');
    document.getElementById('explanation').classList.add('hidden');
    document.getElementById('error-hint').classList.add('hidden');
    wrongAttempts = 0;
    hintUsed = false;
}

// Mostrar feedback
function showFeedback(message, isCorrect) {
    const feedbackElement = document.getElementById('feedback');
    feedbackElement.textContent = message;
    feedbackElement.className = isCorrect ? 'feedback correct' : 'feedback incorrect';
    feedbackElement.classList.remove('hidden');
}

// Actualizar dificultad
function updateDifficulty() {
    let newDifficulty = 'normal';
    
    if (wrongAttempts >= 3) {
        newDifficulty = 'easy';
    } else if (score >= 80 && currentRound > 2) {
        newDifficulty = 'hard';
    }

    const badge = document.getElementById('difficulty-badge');
    const badgeTexts = {
        'easy': '🎯 Fácil',
        'normal': 'Normal',
        'hard': '⭐ Avanzado'
    };
    badge.textContent = badgeTexts[newDifficulty];
}

// Completar juego
async function completeGame() {
    const gameData = {
        gameId: "encuentra-error", // Debe coincidir con el ID en tu GameSelector de Blazor
        style: "visual",           // Esta categoría es principalmente visual/lectura
        level: difficulty === 'hard' ? 3 : (difficulty === 'normal' ? 2 : 1),
        score: score,
        accuracy: (score / (totalRounds * 20)) * 100, // Cálculo estimado: 20 pts max por ronda
        responseTime: 30000 // Puedes implementar un timer real, o enviar un estimado por ahora
    };

    // Enviar al Bridge
        try {
            await api.saveGameResults(gameData);
            console.log('✅ Progreso guardado exitosamente');
        } catch (error) {
            console.error('❌ Error al conectar con el servidor:', error);
        }
    const errorSummary = Object.entries(errorFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([type, count]) => `${type} (${count})`)
        .join(', ');

    const errorCard = document.querySelector('.error-card');
    errorCard.innerHTML = `
        <h2>¡Juego Completado! 🏆</h2>
        <div class="feedback correct" style="margin-top: 20px;">
            <p><strong>Tu puntaje final:</strong> ${score} puntos</p>
        </div>
        <div class="explanation" style="margin-top: 20px;">
            <h3>Resumen de Errores Practicados</h3>
            <p>Trabajaste principalmente en: ${errorSummary || 'Varios tipos de errores'}</p>
            <p style="margin-top: 10px; font-size: 14px;">Continúa practicando estas estructuras para mejorar tu gramática.</p>
        </div>
        <div class="action-controls" style="margin-top: 30px;">
            <button class="action-button primary" onclick="location.reload()">
                <i class="fas fa-redo"></i> Jugar de Nuevo
            </button>
            <button class="action-button blue" onclick="goToMainPage()">
                <i class="fas fa-home"></i> Volver al Menú
            </button>
        </div>
    `;
}

// Función para volver a la página principal
function goToMainPage() {
    window.location.href = 'https://plekdev.github.io/BlueMinds/selectores/selector-lecto-escritor.html';
}
