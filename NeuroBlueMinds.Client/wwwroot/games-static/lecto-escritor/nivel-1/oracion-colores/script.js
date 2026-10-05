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
let currentSentence = null;
let words = [];
let droppedWords = [];
let draggedElement = null;
let difficulty = 'normal';
let wrongAttempts = 0;
let hintUsed = false;
let hintLevel = 0; // 0 = sin pista, 1 = pista visual, 2 = primera palabra marcada

const sentences = [
    {
        words: [
            { text: "El", color: "blue" },
            { text: "perro", color: "red" },
            { text: "corre", color: "green" }
        ],
        image: "https://img.freepik.com/vector-premium/lindo-perrito-corriendo-ilustracion-dibujos-animados-vector_2699-745.jpg"
    },
    {
        words: [
            { text: "La", color: "blue" },
            { text: "niña", color: "red" },
            { text: "salta", color: "green" }
        ],
        image: "https://img.freepik.com/vector-premium/nina-saltando-aislado-blanco_253263-210.jpg?w=2000"
    },
    {
        words: [
            { text: "El", color: "blue" },
            { text: "gato", color: "red" },
            { text: "duerme", color: "green" }
        ],
        image: "https://img.freepik.com/vector-premium/dibujo-dibujos-animados-gato-durmiendo_29937-9676.jpg?w=2000"
    },
    {
        words: [
            { text: "El", color: "blue" },
            { text: "pájaro", color: "red" },
            { text: "vuela", color: "green" }
        ],
        image: "https://th.bing.com/th/id/R.ce83d3472f6439efaade884fc47b6f1e?rik=L55fb4CfQuAcOQ&riu=http%3a%2f%2fst.depositphotos.com%2f1199300%2f1509%2fv%2f950%2fdepositphotos_15093187-stock-illustration-flying-bird-cartoon-isolated-on.jpg&ehk=8pgE4ap73POBZLUYjAbuQHk4wtZjcI0d%2bviTP29cANQ%3d&risl=&pid=ImgRaw&r=0"
    },
    {
        words: [
            { text: "El", color: "blue" },
            { text: "sol", color: "red" },
            { text: "brilla", color: "green" }
        ],
        image: "https://png.pngtree.com/background/20230519/original/pngtree-cartoon-sun-in-a-sunny-landscape-picture-image_2666701.jpg"
    }
];

const totalRounds = 5;

// Inicializar el juego
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    startNewRound();
});

// Configurar event listeners
function setupEventListeners() {
    document.getElementById('check-button').addEventListener('click', checkSentence);
    document.getElementById('reset-button').addEventListener('click', resetSentence);
    document.getElementById('hint-button').addEventListener('click', showHint);

    // Prevenir comportamiento por defecto para permitir drag and drop
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    document.addEventListener('drop', (e) => {
        e.preventDefault();
    });
}

// Iniciar una nueva ronda
function startNewRound() {
    const randomSentence = sentences[Math.floor(Math.random() * sentences.length)];
    currentSentence = randomSentence;

    // Mezclar las palabras
    words = [...randomSentence.words].sort(() => Math.random() - 0.5);
    droppedWords = [];
    wrongAttempts = 0;
    hintUsed = false;
    hintLevel = 0;

    // Actualizar la interfaz
    updateUI();
    updateDifficulty();
}

// Actualizar la interfaz de usuario
function updateUI() {
    // Actualizar progreso
    document.getElementById('current-round').textContent = currentRound + 1;
    document.getElementById('total-rounds').textContent = totalRounds;
    document.getElementById('score').textContent = score + ' ' + gs('points', 'puntos');
    document.getElementById('score-display').textContent = score + ' ' + gs('points', 'puntos');

    // Actualizar barra de progreso
    const progress = ((currentRound + 1) / totalRounds) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';

    // Actualizar imagen
    document.getElementById('sentence-image').src = currentSentence.image;

    // Actualizar banco de palabras
    const wordsBank = document.getElementById('words-bank');
    wordsBank.innerHTML = '';

    words.forEach((word, index) => {
        const wordElement = createWordElement(word, index);
        wordsBank.appendChild(wordElement);
    });

    // Crear slots para las palabras
    const dropZone = document.getElementById('sentence-drop-zone');
    dropZone.innerHTML = '';

    for (let i = 0; i < currentSentence.words.length; i++) {
        const slot = document.createElement('div');
        slot.className = 'word-slot';
        slot.id = `slot-${i}`;
        slot.dataset.slotIndex = i;
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('drop', (e) => handleDrop(e, i));
        dropZone.appendChild(slot);
    }

    // Ocultar feedback
    document.getElementById('feedback').classList.add('hidden');
    document.getElementById('order-hint').classList.add('hidden');
}

// Crear elemento de palabra
function createWordElement(word, index) {
    const wordElement = document.createElement('div');
    wordElement.className = `word-item word-${word.color}`;
    wordElement.textContent = word.text;
    wordElement.draggable = true;
    wordElement.dataset.index = index;

    // Event listeners para drag and drop
    wordElement.addEventListener('dragstart', (e) => {
        draggedElement = e.target;
        e.target.style.opacity = '0.6';
    });

    wordElement.addEventListener('dragend', (e) => {
        e.target.style.opacity = '1';
    });

    return wordElement;
}

// Manejar dragover
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.style.backgroundColor = 'rgba(0, 102, 204, 0.1)';
}

// Manejar drop
function handleDrop(e, slotIndex) {
    e.preventDefault();
    e.currentTarget.style.backgroundColor = '';

    if (!draggedElement) return;

    const index = parseInt(draggedElement.dataset.index);
    const word = words[index];
    const slot = document.getElementById(`slot-${slotIndex}`);

    // Si el slot ya tiene una palabra, devolverla al banco
    if (slot.innerHTML) {
        const existingWord = slot.querySelector('.word-item');
        if (existingWord) {
            existingWord.style.display = '';
            document.getElementById('words-bank').appendChild(existingWord);
        }
    }

    // Crear nueva palabra en el slot
    const newWordElement = document.createElement('div');
    newWordElement.className = `word-item word-${word.color}`;
    newWordElement.textContent = word.text;
    newWordElement.style.cursor = 'pointer';

    // Permitir eliminar la palabra del slot
    newWordElement.addEventListener('click', () => {
        newWordElement.remove();
        draggedElement.style.display = '';
        const idx = droppedWords.findIndex(w => w.slotIndex === slotIndex);
        if (idx !== -1) droppedWords.splice(idx, 1);
        slot.classList.remove('filled');
    });

    slot.innerHTML = '';
    slot.appendChild(newWordElement);
    slot.classList.add('filled');

    draggedElement.style.display = 'none';

    // Actualizar lista de palabras arrastradas
    droppedWords = droppedWords.filter(w => w.slotIndex !== slotIndex);
    droppedWords.push({ index, word, slotIndex });
}

// Reiniciar oración
function resetSentence() {
    // Devolver todas las palabras al banco
    droppedWords.forEach(item => {
        const slot = document.getElementById(`slot-${item.slotIndex}`);
        slot.innerHTML = '';
        slot.classList.remove('filled');
    });

    // Mostrar todas las palabras
    const wordItems = document.querySelectorAll('.word-item');
    wordItems.forEach(item => item.style.display = '');

    // Limpiar lista de palabras arrastradas
    droppedWords = [];
    document.getElementById('feedback').classList.add('hidden');
    document.getElementById('order-hint').classList.add('hidden');
}

// Mostrar pista progresiva
function showHint() {
    if (hintLevel >= 2) {
        showFeedback("Ya usaste todas las pistas disponibles", false);
        return;
    }

    hintLevel++;
    hintUsed = true;
    const hintDiv = document.getElementById('order-hint');
    hintDiv.innerHTML = '';

    if (hintLevel === 1) {
        // Pista 1: Mostrar la estructura de colores
        hintDiv.classList.remove('hidden');
        hintDiv.className = 'order-hint visible';
        
        currentSentence.words.forEach((word, idx) => {
            const hint = document.createElement('div');
            hint.className = `hint-item hint-color word-${word.color}`;
            hint.innerHTML = `<span class="hint-position">${idx + 1}</span><span class="hint-word hidden-hint">${word.text}</span>`;
            hintDiv.appendChild(hint);
        });
        
        showFeedback("💡 Pista 1: Los colores indican el orden. Mira qué color va primero, segundo, tercero.", true);
    } else if (hintLevel === 2) {
        // Pista 2: Mostrar la primera palabra
        hintDiv.classList.remove('hidden');
        hintDiv.className = 'order-hint visible';
        
        currentSentence.words.forEach((word, idx) => {
            const hint = document.createElement('div');
            hint.className = `hint-item word-${word.color}`;
            
            if (idx === 0) {
                hint.innerHTML = `<span class="hint-word">${word.text}</span> <span class="hint-label">1ª palabra</span>`;
            } else {
                hint.innerHTML = `<span class="hint-position">${idx + 1}</span>`;
            }
            hintDiv.appendChild(hint);
        });
        
        showFeedback("💡 Pista 2: La primera palabra es: <strong>" + currentSentence.words[0].text + "</strong>", true);
    }
}

// Verificar oración
function checkSentence() {
    if (droppedWords.length !== currentSentence.words.length) {
        showFeedback("Debes usar todas las palabras (" + currentSentence.words.length + ")", false);
        wrongAttempts++;
        updateDifficulty();
        return;
    }

    // Ordenar palabras por slot
    droppedWords.sort((a, b) => a.slotIndex - b.slotIndex);

    // Verificar orden correcto
    let isCorrect = true;
    let errorDetails = [];

    for (let i = 0; i < droppedWords.length; i++) {
        if (droppedWords[i].word.text !== currentSentence.words[i].text) {
            isCorrect = false;
            errorDetails.push(`Posición ${i + 1}: encontré "${droppedWords[i].word.text}", esperaba "${currentSentence.words[i].text}"`);
        }
    }

    if (isCorrect) {
        let points = 20;
        if (hintLevel === 1) points = 15;
        if (hintLevel === 2) points = 10;
        
        score += points;
        showFeedback(`¡Oración correcta! +${points} puntos 🎉`, true);

        // Colorear la imagen para indicar éxito
        const imageDisplay = document.getElementById('image-display');
        imageDisplay.classList.add('success');

        // Deshabilitar botones
        document.getElementById('check-button').disabled = true;
        document.getElementById('reset-button').disabled = true;
        document.getElementById('hint-button').disabled = true;

        // Avanzar a la siguiente ronda o finalizar el juego
        setTimeout(() => {
            if (currentRound + 1 >= totalRounds) {
                completeGame();
            } else {
                currentRound++;
                startNewRound();

                // Rehabilitar botones
                document.getElementById('check-button').disabled = false;
                document.getElementById('reset-button').disabled = false;
                document.getElementById('hint-button').disabled = false;

                // Quitar clase de éxito
                imageDisplay.classList.remove('success');
            }
        }, 2000);
    } else {
        wrongAttempts++;
        updateDifficulty();
        let message = "La oración no es correcta.
" + errorDetails.join("
");
        showFeedback(message, false);
    }

    // Actualizar puntaje
    document.getElementById('score').textContent = score + ' ' + gs('points', 'puntos');
    document.getElementById('score-display').textContent = score + ' ' + gs('points', 'puntos');
}

// Mostrar feedback
function showFeedback(message, isCorrect) {
    const feedbackElement = document.getElementById('feedback');

    if (message.includes('
')) {
        feedbackElement.innerHTML = `<div>${message.split('
')[0]}</div><div class="error-details">${message.split('
').slice(1).join('<br>')}</div>`;
    } else {
        feedbackElement.innerHTML = message;
    }

    feedbackElement.className = isCorrect ? 'feedback correct' : 'feedback incorrect';
    feedbackElement.classList.remove('hidden');
}

// Actualizar dificultad según intentos fallidos
function updateDifficulty() {
    if (wrongAttempts === 0) {
        difficulty = 'normal';
    } else if (wrongAttempts >= 2) {
        difficulty = 'easy';
    }

    const badge = document.getElementById('difficulty-badge');
    badge.textContent = difficulty === 'easy' ? '🎯 Fácil' : difficulty === 'hard' ? '⭐ Avanzado' : 'Normal';
}

// Completar el juego
async function completeGame() {
  // --- INTEGRACIÓN BLUEMINDS ---
    // Determinamos el nivel numérico basado en la dificultad del juego
    const levelNum = difficulty === 'hard' ? 3 : (difficulty === 'normal' ? 2 : 1);
    
    // El puntaje máximo teórico es 100 (5 rondas x 20 puntos)
    const maxScore = totalRounds * 20;
    const calculatedAccuracy = Math.min((score / maxScore) * 100, 100);

    const gameData = {
        gameId: "oracion-colores", // ID para identificarlo en el Dashboard
        style: "visual",           // Basado en el uso de códigos de colores
        level: levelNum,
        score: score,
        accuracy: calculatedAccuracy,
        responseTime: 60000        // Tiempo estimado de sesión
    };

    // Envío de datos al servidor de Arch Linux vía Blazor
        try {
            await api.saveGameResults(gameData);
            console.log('✅ Progreso guardado exitosamente');
        } catch (error) {
            console.error('❌ Error al conectar con el servidor:', error);
        }
    // ----------------------------
    // Mostrar mensaje de finalización
    const sentenceCard = document.querySelector('.sentence-card');
    sentenceCard.innerHTML = `
        <h2>¡Juego Completado! 🏆</h2>
        <div class="image-display">
            <img src="dino-feliz.jpeg" alt="Juego completado">
        </div>
        <div class="feedback correct">
            <p><strong>Tu puntaje final:</strong> ${score} puntos</p>
        </div>
        <div class="action-controls">
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
