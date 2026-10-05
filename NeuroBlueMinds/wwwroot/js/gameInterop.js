// gameInterop.js  –  loaded by the SERVER page (App.razor), runs in the outer window

// ── Google Sign-In ──────────────────────────────────────────────────────────
var _gsiInitialized = false;
var _gsiRef = null;

window.initializeGoogleSignIn = function (dotNetRef) {
    _gsiRef = dotNetRef;

    if (typeof google === 'undefined' || !google.accounts) {
        setTimeout(() => window.initializeGoogleSignIn(dotNetRef), 500);
        return;
    }

    const clientId = document.querySelector('meta[name="google-client-id"]')?.content;
    if (!clientId) { console.warn('[GSI] google-client-id meta tag missing'); return; }

    // Always re-initialize with the latest dotNetRef (handles re-renders)
    google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
            if (_gsiRef) {
                _gsiRef.invokeMethodAsync('HandleGoogleCallback', response.credential)
                    .catch(e => console.error('[GSI] HandleGoogleCallback error:', e));
            }
        }
    });

    // Render button — use px width, not %
    const btn = document.getElementById('googleBtn');
    if (btn) {
        btn.innerHTML = ''; // clear any previous render
        google.accounts.id.renderButton(btn, {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'continue_with'
        });
    }
};

window.googleAuthBridge = { init: (ref) => window.initializeGoogleSignIn(ref) };

// Render Google button on a specific element (for register page)
window.initializeGoogleSignInOnElement = function(dotNetRef, elementId) {
    _gsiRef = dotNetRef;
    if (typeof google === 'undefined' || !google.accounts) {
        setTimeout(() => window.initializeGoogleSignInOnElement(dotNetRef, elementId), 500);
        return;
    }
    const clientId = document.querySelector('meta[name="google-client-id"]')?.content;
    if (!clientId) return;
    google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
            if (_gsiRef) {
                _gsiRef.invokeMethodAsync('HandleGoogleCallback', response.credential)
                    .catch(e => console.error('[GSI] HandleGoogleCallback error:', e));
            }
        }
    });
    const btn = document.getElementById(elementId);
    if (btn) {
        btn.innerHTML = '';
        google.accounts.id.renderButton(btn, { theme: 'outline', size: 'large', width: 320, text: 'signup_with' });
    }
};

// ── Parent quiz bridge ──────────────────────────────────────────────────────
window.setupQuizBridge = function (dotNetRef) {
    console.log('[gameInterop] Parent quiz bridge established.');
    window.dotNetHelper = dotNetRef;
};

// ── Child quiz bridge ───────────────────────────────────────────────────────
window.setupChildQuizBridge = function (dotNetRef) {
    console.log('[gameInterop] Child quiz bridge established.');
    window.childDotNetHelper = dotNetRef;
};

// ── Unified postMessage listener ────────────────────────────────────────────
window.addEventListener('message', function (event) {
    // B-12 FIX: Validate origin before processing any message
    if (event.origin !== window.location.origin) {
        console.warn('[gameInterop] Blocked message from untrusted origin:', event.origin);
        return;
    }

    if (!event.data || !event.data.type) return;

    try {
        switch (event.data.type) {

            // ── Parent quiz ──
            case 'QUIZ_PARENT_RESPONSE':
                if (window.dotNetHelper) {
                    window.dotNetHelper
                        .invokeMethodAsync('SaveResponseFromIframe',
                            event.data.questionIndex, event.data.section, event.data.answer)
                        .catch(e => console.error('[gameInterop] Parent SaveResponse error:', e));
                }
                break;

            case 'QUIZ_PARENT_COMPLETE':
                if (window.dotNetHelper) {
                    window.dotNetHelper
                        .invokeMethodAsync('CompleteQuizFromIframe',
                            event.data.communicationScore, event.data.learningStyle)
                        .catch(e => console.error('[gameInterop] Parent CompleteQuiz error:', e));
                }
                break;

            // ── Child quiz ──
            case 'QUIZ_CHILD_RESPONSE':
                if (window.childDotNetHelper) {
                    const d = event.data;
                    window.childDotNetHelper
                        .invokeMethodAsync('SaveChildResponseFromIframe',
                            d.sessionId, d.questionIndex, d.questionType,
                            d.learningStyle, d.nivel, d.answerJson, d.isCorrect, d.responseTimeMs)
                        .catch(e => console.error('[gameInterop] Child SaveResponse error:', e));
                }
                break;

            case 'QUIZ_CHILD_COMPLETE':
                if (window.childDotNetHelper) {
                    window.childDotNetHelper
                        .invokeMethodAsync('CompleteChildQuizFromIframe',
                            event.data.answersJson, event.data.totalTimeSeconds)
                        .then(resultJson => {
                            // B-12 FIX: Forward result using specific origin, not '*'
                            event.source?.postMessage(
                                { type: 'QUIZ_CHILD_COMPLETE_RESULT', resultJson },
                                window.location.origin
                            );
                        })
                        .catch(e => console.error('[gameInterop] Child CompleteQuiz error:', e));
                }
                break;

            // ── Game result ──
            case 'GAME_RESULT':
                if (window._gameResultHandler) {
                    window._gameResultHandler
                        .invokeMethodAsync('OnGameCompleted', JSON.stringify(event.data))
                        .catch(e => console.error('[gameInterop] GameResult error:', e));
                }
                break;
        }
    } catch (e) {
        // B-12 FIX: Catch parsing/processing errors to prevent unexpected behavior
        console.error('[gameInterop] Error processing message:', e);
    }
});

// ── Game iframe helpers ─────────────────────────────────────────────────────
window.registerGameResultHandler   = (ref) => { window._gameResultHandler = ref; };
window.unregisterGameResultHandler = ()    => { window._gameResultHandler = null; };

// ── Game i18n bridge ──────────────────────────────────────────────────────────
window.sendLocaleToGameById = function(iframeId, locale) {
  const iframe = document.getElementById(iframeId);
  if (!iframe) return;
  const strings = (window.GAME_STRINGS || {})[locale] || {};
  const send = () => {
    try {
      // B-12 FIX: Use specific origin instead of '*' for same-origin game iframes
      iframe.contentWindow.postMessage({ type: 'SET_LOCALE', locale, strings }, window.location.origin);
    }
    catch(e) { console.warn('[gameInterop] locale send:', e.message); }
  };
  send();
  iframe.addEventListener('load', send, { once: true });
};
