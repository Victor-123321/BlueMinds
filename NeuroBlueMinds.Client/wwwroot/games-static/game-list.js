// Lista de minijuegos existentes en el proyecto

// Lista de minijuegos organizada por Estilo y Nivel
const existingGames = [
    // --- AUDITIVO ---
    { id: 'cadena-palabras', title: 'Cadena de Palabras', description: 'Crea cadenas de palabras sonoras', icon: 'fa-link', category: 'lenguaje', style: 'auditivo', level: 1, path: '../games/auditivo/nivel-1/Cadena-Palabras/index.html' },
    { id: 'eco-palabras', title: 'Eco de Palabras', description: 'Repite lo que escuchas', icon: 'fa-volume-up', category: 'lenguaje', style: 'auditivo', level: 1, path: '../games/auditivo/nivel-1/eco-palabras/index.html' },
    { id: 'cadena-palabras-2', title: 'Cadena de Palabras 2', description: 'Nivel avanzado de cadenas', icon: 'fa-link', category: 'lenguaje', style: 'auditivo', level: 2, path: '../games/auditivo/nivel-2/Cadena-Palabras2/index.html' },
    { id: 'completa-auditiva', title: 'Completa la Oración', description: 'Escucha y completa la frase', icon: 'fa-headphones', category: 'lenguaje', style: 'auditivo', level: 2, path: '../games/auditivo/nivel-2/Completa-Oracion-Auditiva/index.html' },
    { id: 'eco-palabras-2', title: 'Eco de Palabras 2', description: 'Repetición de frases complejas', icon: 'fa-microphone', category: 'lenguaje', style: 'auditivo', level: 3, path: '../games/auditivo/nivel-3/eco-palabras-2/index.html' },

    // --- KINESTÉSICO ---
    { id: 'atencion-conjunta', title: 'Atención Conjunta', description: 'Sigue el foco de atención', icon: 'fa-eye', category: 'conducta', style: 'kinestesico', level: 1, path: '../games/kinestesico/nivel-1/Atencion-Conjunta/index.html' },
    { id: 'emotion-game', title: 'Reconoce Emociones', description: 'Identifica gestos y sentimientos', icon: 'fa-smile', category: 'conducta', style: 'kinestesico', level: 1, path: '../games/kinestesico/nivel-1/emotion-game/index.html' },
    { id: 'sigue-lider', title: 'Sigue al Líder', description: 'Imita movimientos en tiempo real', icon: 'fa-running', category: 'conducta', style: 'kinestesico', level: 1, path: '../games/kinestesico/nivel-1/sigue-lider/index.html' },
    { id: 'regulando-grito', title: 'Regulando el Grito', description: 'Control de volumen y voz', icon: 'fa-volume-mute', category: 'conducta', style: 'kinestesico', level: 2, path: '../games/kinestesico/nivel-2/Regulando-Grito/index.html' },
    { id: 'ritmo-silabas', title: 'Ritmo de Sílabas', description: 'Mueve tu cuerpo al ritmo', icon: 'fa-music', category: 'lenguaje', style: 'kinestesico', level: 2, path: '../games/kinestesico/nivel-2/Ritmo-Silabas/index.html' },
    { id: 'ritmo-silabas-2', title: 'Ritmo de Sílabas 2', description: 'Coordinación avanzada', icon: 'fa-drum', category: 'lenguaje', style: 'kinestesico', level: 3, path: '../games/kinestesico/nivel-3/Ritmo-Silabas-2/index.html' },
    { id: 'emotion-game-2', title: 'Emociones Pro', description: 'Situaciones sociales complejas', icon: 'fa-theater-masks', category: 'conducta', style: 'kinestesico', level: 3, path: '../games/kinestesico/nivel-3/emotion-game-2/index.html' },
    { id: 'sigue-lider-2', title: 'Sigue al Líder 2', description: 'Coreografías de aprendizaje', icon: 'fa-user-friends', category: 'conducta', style: 'kinestesico', level: 3, path: '../games/kinestesico/nivel-3/sigue-lider-2/index.html' },

    // --- LECTO-ESCRITOR ---
    { id: 'encuentra-error', title: 'Encuentra el Error', description: 'Detecta fallas en el texto', icon: 'fa-search', category: 'lenguaje', style: 'lecto-escritor', level: 1, path: '../games/lecto-escritor/nivel-1/encuentra-error/index.html' },
    { id: 'leeyasocia', title: 'Lee y Asocia', description: 'Une palabras con su significado', icon: 'fa-book-reader', category: 'lenguaje', style: 'lecto-escritor', level: 1, path: '../games/lecto-escritor/nivel-1/leeyasocia/index.html' },
    { id: 'oracion-colores', title: 'Oración de Colores', description: 'Estructura frases visualmente', icon: 'fa-palette', category: 'lenguaje', style: 'lecto-escritor', level: 1, path: '../games/lecto-escritor/nivel-1/oracion-colores/index.html' },
    { id: 'completa-oracion', title: 'Completa la Oración', description: 'Escribe la palabra que falta', icon: 'fa-pen-nib', category: 'lenguaje', style: 'lecto-escritor', level: 2, path: '../games/lecto-escritor/nivel-2/completa-oracion/index.html' },
    { id: 'escribe-palabra', title: 'Escribe la Palabra', description: 'Ortografía y vocabulario', icon: 'fa-keyboard', category: 'lenguaje', style: 'lecto-escritor', level: 2, path: '../games/lecto-escritor/nivel-2/escribe-palabra/index.html' },
    { id: 'leeyasocia-2', title: 'Lee y Asocia 2', description: 'Lectura comprensiva nivel 3', icon: 'fa-spell-check', category: 'lenguaje', style: 'lecto-escritor', level: 3, path: '../games/lecto-escritor/nivel-3/leeyasocia2/index.html' },

    // --- VISUAL ---
    { id: 'detective-errores', title: 'Detective de Errores', description: 'Busca diferencias visuales', icon: 'fa-user-secret', category: 'lenguaje', style: 'visual', level: 1, path: '../games/visual/nivel-1/detective-errores/index.html' },
    { id: 'memoriza-imagen', title: 'Memoriza la Imagen', description: 'Retención visual a corto plazo', icon: 'fa-eye', category: 'lenguaje', style: 'visual', level: 1, path: '../games/visual/nivel-1/memoriza-imagen/index.html' },
    { id: 'memory-game', title: 'Juego de Memoria', description: 'El clásico juego de pares', icon: 'fa-clone', category: 'lenguaje', style: 'visual', level: 1, path: '../games/visual/nivel-1/memory-game/index.html' },
    { id: 'completa-escena', title: 'Completa la Escena', description: 'Organización espacial visual', icon: 'fa-puzzle-piece', category: 'ocupacional', style: 'visual', level: 2, path: '../games/visual/nivel-2/completa-escena/index.html' },
    { id: 'explora-profesiones', title: 'Explora Profesiones', description: 'Asociación visual de trabajos', icon: 'fa-briefcase', category: 'ocupacional', style: 'visual', level: 2, path: '../games/visual/nivel-2/explora-profesiones/index.html' },
    { id: 'ordena-historia', title: 'Ordena la Historia', description: 'Secuenciación visual', icon: 'fa-sort-numeric-down', category: 'lenguaje', style: 'visual', level: 2, path: '../games/visual/nivel-2/ordena-historia/index.html' },
    { id: 'asocia-imagen', title: 'Asocia la Imagen', description: 'Relación imagen-concepto', icon: 'fa-images', category: 'lenguaje', style: 'visual', level: 3, path: '../games/visual/nivel-3/asocia-imagen/index.html' },
    { id: 'clasificacion-grupos', title: 'Clasifica Grupos', description: 'Categorización visual', icon: 'fa-layer-group', category: 'lenguaje', style: 'visual', level: 3, path: '../games/visual/nivel-3/clasificacion-grupos/index.html' },
    { id: 'patterns-game', title: 'Juego de Patrones', description: 'Lógica y patrones visuales', icon: 'fa-shapes', category: 'lenguaje', style: 'visual', level: 3, path: '../games/visual/nivel-3/patterns-game/index.html' }
];
// Función para obtener la lista de juegos
function getGamesList() {
    return existingGames;
}

// Función para obtener juegos por categoría
function getGamesByCategory(category) {
    return existingGames.filter(game => game.category === category);
}

// Función para obtener un juego específico por ID
function getGameById(id) {
    return existingGames.find(game => game.id === id);
}

// Función para renderizar la lista de juegos en un contenedor
function renderGamesList(containerId, category = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const games = category ? getGamesByCategory(category) : existingGames;
    
    let gamesHTML = '';
    
    games.forEach(game => {
        gamesHTML += `
            <div class="game-card">
                <div class="game-thumbnail">
                    <i class="fas ${game.icon}"></i>
                </div>
                <div class="game-info">
                    <h3 class="game-title">${game.title}</h3>
                    <p class="game-description">${game.description}</p>
                    <a href="${game.path}" class="game-button">Jugar</a>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = gamesHTML;
}

// Función para mostrar juegos por categoría
function showCategoryGames(category) {
    // Ocultar todas las secciones
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('mainScreen').style.display = 'none';
    
    // Obtener los juegos de la categoría
    const games = getGamesByCategory(category);
    const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
    
    // Construir el HTML de la sección
    const sectionHTML = `
        <div class="category-games-screen" id="categoryGamesScreen">
            <header>
                <div class="container">
                    <div class="header-content">
                        <div class="logo">
                            <i class="fas fa-graduation-cap"></i>
                            <span>BlueMinds</span>
                        </div>
                        <div class="user-info">
                            <span id="userName">Hola, Usuario!</span>
                            <div class="user-avatar">U</div>
                        </div>
                    </div>
                </div>
            </header>
            
            <main>
                <div class="container">
                    <section class="category-header">
                        <div class="back-button">
                            <button onclick="backToMain()">
                                <i class="fas fa-arrow-left"></i> Volver
                            </button>
                        </div>
                        <div class="category-info">
                            <div class="category-icon">
                                <i class="fas ${getCategoryIcon(category)}"></i>
                            </div>
                            <h1 class="category-title">${categoryTitle}</h1>
                            <p class="category-description">${getCategoryDescription(category)}</p>
                        </div>
                    </section>
                    
                    <section class="games-section">
                        <h2 class="section-title">Juegos de ${categoryTitle}</h2>
                        <div class="games-grid" id="category-games-container">
                            <!-- Los juegos se cargarán dinámicamente -->
                        </div>
                    </section>
                </div>
            </main>
            
            <footer>
                <div class="container">
                    <div class="footer-content">
                        <p>&copy; BlueMinds - Neuro Play World</p>
                        <div class="footer-links">
                            <a href="../index.html">Inicio</a>
                            <a href="#">Acerca de</a>
                            <a href="#">Para Padres</a>
                            <a href="#">Ayuda</a>
                            <a href="#">Términos</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    `;
    
    // Insertar la sección en el body
    document.body.insertAdjacentHTML('beforeend', sectionHTML);
    
    // Cargar los juegos en el contenedor
    renderGamesList('category-games-container', category);
    
    // Aplicar animaciones
    setTimeout(() => {
        animateCategoryGames();
    }, 100);
}

// Función para obtener el icono de una categoría
function getCategoryIcon(category) {
    const icons = {
        'lenguaje': 'fa-language',
        'conducta': 'fa-smile',
        'ocupacional': 'fa-briefcase'
    };
    return icons[category] || 'fa-gamepad';
}

// Función para obtener la descripción de una categoría
function getCategoryDescription(category) {
    const descriptions = {
        'lenguaje': 'Aprende nuevas palabras y mejora tu comunicación',
        'conducta': 'Desarrolla habilidades sociales y emocionales',
        'ocupacional': 'Explora diferentes profesiones y actividades'
    };
    return descriptions[category] || 'Juegos educativos para niños';
}

// Función para volver a la página principal
function backToMain() {
    const categoryScreen = document.getElementById('categoryGamesScreen');
    if (categoryScreen) {
        categoryScreen.remove();
    }
    document.getElementById('mainScreen').style.display = 'block';
}

// Función para animar la sección de juegos por categoría
function animateCategoryGames() {
    const gameCards = document.querySelectorAll('#category-games-container .game-card');
    gameCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}
