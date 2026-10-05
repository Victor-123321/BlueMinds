/**
 * BlueMinds Bridge – api.js  (v5.0)
 * Runs INSIDE the iframe. Reaches parent Blazor page via:
 *   window.parent.dotNetHelper       → QuizPadres
 *   window.parent.childDotNetHelper  → QuizNinos
 */

const api = {
    baseURL: window.parent ? window.parent.location.origin : window.location.origin,

    _getHeaders() {
        const token = localStorage.getItem('childToken') || localStorage.getItem('authToken');
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    },

    _parentHelper()  { return window.parent?.dotNetHelper      ?? window.dotNetHelper      ?? null; },
    _childHelper()   { return window.parent?.childDotNetHelper ?? window.childDotNetHelper  ?? null; },

    // ── Parent quiz progress ──────────────────────────────────────────────
    async getParentQuizProgress() {
        console.log('[api] Checking parent quiz progress...');
        const prog = window.parent?.parentQuizProgress ?? window.parentQuizProgress ?? null;
        if (prog) console.log('[api] Parent progress found:', prog);
        return prog ?? { progress: null };
    },

    async saveParentQuizResponse(questionIndex, section, answer) {
        console.log('[api] Saving parent response:', { questionIndex, section, answer });
        const h = this._parentHelper();
        if (h) {
            try { await h.invokeMethodAsync('SaveResponseFromIframe', questionIndex, section, answer); return { success: true }; }
            catch (e) { console.error('[api] Parent SaveResponse error:', e); }
        }
        // B-12 FIX: Use specific origin instead of '*'
        window.parent.postMessage({ type: 'QUIZ_PARENT_RESPONSE', questionIndex, section, answer }, window.parent.location.origin);
        return { success: true };
    },

    async completeParentQuiz(communicationScore, learningStyle) {
        console.log('[api] Completing parent quiz:', { communicationScore, learningStyle });
        const h = this._parentHelper();
        if (h) {
            try { await h.invokeMethodAsync('CompleteQuizFromIframe', communicationScore, learningStyle); return { success: true }; }
            catch (e) { console.error('[api] Parent CompleteQuiz error:', e); }
        }
        // B-12 FIX: Use specific origin instead of '*'
        window.parent.postMessage({ type: 'QUIZ_PARENT_COMPLETE', communicationScore, learningStyle }, window.parent.location.origin);
        return { success: true };
    },

    // ── Child quiz progress ───────────────────────────────────────────────
    async getChildQuizProgress() {
        console.log('[api] Checking child quiz progress...');
        const prog = window.parent?.childQuizProgress ?? window.childQuizProgress ?? null;
        if (prog) console.log('[api] Child progress found:', prog);
        return prog ?? { progress: null };
    },

    // Called after each verified answer
    async saveChildQuizResponse(sessionId, questionIndex, questionType, learningStyle, nivel, answer, isCorrect, responseTimeMs) {
        const answerJson = typeof answer === 'string' ? answer : JSON.stringify(answer);
        console.log('[api] Saving child response:', { questionIndex, learningStyle, isCorrect });

        const h = this._childHelper();
        if (h) {
            try {
                await h.invokeMethodAsync('SaveChildResponseFromIframe',
                    sessionId, questionIndex, questionType, learningStyle, nivel, answerJson, isCorrect, responseTimeMs);
                return { success: true };
            } catch (e) { console.error('[api] Child SaveResponse error:', e); }
        }
        // B-12 FIX: Use specific origin instead of '*'
        window.parent.postMessage({
            type: 'QUIZ_CHILD_RESPONSE',
            sessionId, questionIndex, questionType, learningStyle, nivel, answerJson, isCorrect, responseTimeMs
        }, window.parent.location.origin);
        return { success: true };
    },

    // Called when all 20 questions are done; returns server analysis result
    async completeChildQuiz(answers, totalTimeSeconds) {
        const answersJson = JSON.stringify(answers);
        console.log('[api] Completing child quiz, totalTime:', totalTimeSeconds);

        const h = this._childHelper();
        if (h) {
            try {
                const resultJson = await h.invokeMethodAsync('CompleteChildQuizFromIframe', answersJson, totalTimeSeconds);
                return JSON.parse(resultJson || '{}');
            } catch (e) { console.error('[api] Child CompleteQuiz error:', e); }
        }

        // Fallback: postMessage (result comes back as QUIZ_CHILD_COMPLETE_RESULT)
        return new Promise((resolve) => {
            const handler = (ev) => {
                // B-12 FIX: Validate origin before processing result
                if (ev.origin !== window.parent.location.origin) {
                    console.warn('[api] Blocked message from untrusted origin:', ev.origin);
                    return;
                }
                if (ev.data?.type === 'QUIZ_CHILD_COMPLETE_RESULT') {
                    window.removeEventListener('message', handler);
                    resolve(JSON.parse(ev.data.resultJson || '{}'));
                }
            };
            window.addEventListener('message', handler);
            // B-12 FIX: Use specific origin instead of '*'
            window.parent.postMessage({ type: 'QUIZ_CHILD_COMPLETE', answersJson, totalTimeSeconds }, window.parent.location.origin);
            setTimeout(() => { window.removeEventListener('message', handler); resolve({}); }, 8000);
        });
    },

    // ── Game results ──────────────────────────────────────────────────────
    async saveGameResults(gameData) {
        // B-12 FIX: Use specific origin instead of '*'
        window.parent.postMessage({ type: 'GAME_RESULT', ...gameData }, window.parent.location.origin);
        return { success: true };
    },

    // ── Legacy stubs (kept for backward compat) ───────────────────────────
    async getQuizProgress()                                { return { progress: null }; },
    async saveQuizResponse(data)                           { return { success: true }; },
    async saveQuizCompletion(score, totalTime, style, lvl) { return { success: true }; }
};

// Aliases for gameInterop.js bridge setup calls
window.setupQuizBridge      = (ref) => { window.dotNetHelper      = ref; };
window.setupChildQuizBridge = (ref) => { window.childDotNetHelper = ref; };

window.api = api;
