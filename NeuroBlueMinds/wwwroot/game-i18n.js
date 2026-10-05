/**
 * game-i18n.js — Shared i18n bridge for all NeuroBlueMinds static HTML games.
 * Loaded in App.razor or index.html so it's available in the outer window.
 * Games inside iframes listen for SET_LOCALE postMessage.
 */

window.GAME_STRINGS = {
  'es-MX': {
    'back':'Volver','points':'{0} puntos','level':'Nivel {0} de {1}',
    'sequence_watch':'👀 ¡Mira la secuencia!','your_turn':'🎮 ¡Tu turno! Repite la secuencia',
    'correct':'¡Excelente! 🎉','wrong':'¡Ups! Intenta de nuevo 😊',
    'completed':'¡Juego completado!','keep_practicing':'Sigue practicando para mejorar.',
    'loading':'Cargando...','start':'Comenzar','restart':'Volver a intentar',
    'next_level':'Siguiente nivel','score':'Puntuación','accuracy':'Precisión',
    'time':'Tiempo','round':'Ronda {0} de {1}',
    'listen':'👂 Escucha','repeat':'🎤 Repite','watch':'👁️ Observa',
    'touch':'✋ Toca','drag':'Arrastra','drop':'Suelta aquí',
    'select':'Selecciona','write':'Escribe',
    'correct_answer':'Respuesta correcta: {0}','great_job':'¡Buen trabajo!',
    'try_again':'Intenta de nuevo','well_done':'¡Lo lograste!',
    'almost':'¡Casi! Sigue intentando.','difficulty':'Dificultad',
    'easy':'Fácil','medium':'Medio','hard':'Difícil',
    'sequence':'Secuencia','of':'de',
    'memory_developing':'Memoria en desarrollo...',
    'record':'Grabar','stop':'Detener','listen_again':'Escuchar de nuevo',
    'words':'palabras','similarity':'Similitud',
    'order_images':'Ordena las imágenes','find_error':'Encuentra el error',
    'complete_sentence':'Completa la oración',
    'associate':'Asocia imagen y palabra','classify':'Clasifica en grupos',
    'congratulations':'¡Felicitaciones!','your_score':'Tu puntuación',
    'emotion_correct':'¡Correcto! 🎉 Excelente imitación emocional',
    'emotion_wrong':'No es correcto. Era: {0}',
    'move_more':'¡Muévete un poco más! Trata de imitar los movimientos.',
    'complex_emotion':'La emoción es compleja. Aquí una versión más simple...',
  },
  'en-US': {
    'back':'Back','points':'{0} points','level':'Level {0} of {1}',
    'sequence_watch':'👀 Watch the sequence!','your_turn':'🎮 Your turn! Repeat the sequence',
    'correct':'Excellent! 🎉','wrong':'Oops! Try again 😊',
    'completed':'Game completed!','keep_practicing':'Keep practicing to improve.',
    'loading':'Loading...','start':'Start','restart':'Try again',
    'next_level':'Next level','score':'Score','accuracy':'Accuracy',
    'time':'Time','round':'Round {0} of {1}',
    'listen':'👂 Listen','repeat':'🎤 Repeat','watch':'👁️ Watch',
    'touch':'✋ Touch','drag':'Drag','drop':'Drop here',
    'select':'Select','write':'Write',
    'correct_answer':'Correct answer: {0}','great_job':'Great job!',
    'try_again':'Try again','well_done':'Well done!',
    'almost':'Almost! Keep trying.','difficulty':'Difficulty',
    'easy':'Easy','medium':'Medium','hard':'Hard',
    'sequence':'Sequence','of':'of',
    'memory_developing':'Memory developing...',
    'record':'Record','stop':'Stop','listen_again':'Listen again',
    'words':'words','similarity':'Similarity',
    'order_images':'Order the images','find_error':'Find the error',
    'complete_sentence':'Complete the sentence',
    'associate':'Match image and word','classify':'Classify in groups',
    'congratulations':'Congratulations!','your_score':'Your score',
    'emotion_correct':'Correct! 🎉 Excellent emotional imitation',
    'emotion_wrong':'Not correct. It was: {0}',
    'move_more':'Move a bit more! Try to imitate the movements.',
    'complex_emotion':'The emotion is complex. Here is a simpler version...',
  }
};

// Send locale strings to a game iframe
window.sendLocaleToGame = function(iframeEl, locale) {
  const strings = window.GAME_STRINGS[locale] || window.GAME_STRINGS['es-MX'];
  const send = () => {
    try { iframeEl.contentWindow.postMessage({ type: 'SET_LOCALE', locale, strings }, '*'); }
    catch(e) { console.warn('[game-i18n]', e.message); }
  };
  // Try immediately, then retry after load
  send();
  iframeEl.addEventListener('load', send, { once: true });
};

// Format helper: gsFormat('Level {0} of {1}', 2, 5) → 'Level 2 of 5'
window.gsFormat = function(template, ...args) {
  return args.reduce((s, v, i) => s.replace('{' + i + '}', v), template);
};
