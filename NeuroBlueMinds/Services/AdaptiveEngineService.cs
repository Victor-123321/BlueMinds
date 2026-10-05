// NeuroBlueMinds/Services/AdaptiveEngineService.cs
// Core Adaptive Engine — updated to match actual game IDs in the Juegos pages,
// with level-aware selection, trend computation, and session-streak tracking.

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NeuroBlueMinds.Data;
using NeuroBlueMinds.Shared.DbModels;
using NeuroBlueMinds.Shared.DTOs;
using System.Text.Json;

namespace NeuroBlueMinds.Server.Services;

public interface IAdaptiveEngineService
{
    Task UpdateStateAfterQuiz(int childUserId);
    Task UpdateStateAfterGame(int childUserId, string style, double accuracy, int responseTimeMs, bool abandoned);
    Task<AdaptiveRecommendationsDto> GetRecommendations(int childUserId);
}

public class AdaptiveEngineService : IAdaptiveEngineService
{
    private readonly NeuroBlueMindsDbContext _db;
    private readonly ILogger<AdaptiveEngineService> _logger;

    // ── Game catalog — MUST match IDs in Juegos*.razor exactly ──────────────────
    // Organized as style → level → [gameIds…]
    // Multiple games per level gives the engine variety to avoid repetition.
    private static readonly Dictionary<string, Dictionary<int, List<string>>> GameCatalogByLevel = new()
    {
        ["visual"] = new()
        {
            [1] = new() { "memory-1", "memoriza-1", "detective-1" },
            [2] = new() { "escena-2", "historia-2", "profesiones-2" },
            [3] = new() { "asocia-3", "grupos-3", "patrones-3" },
        },
        ["auditivo"] = new()
        {
            [1] = new() { "cadena-1", "eco-1" },
            [2] = new() { "cadena-2", "completa-2" },
            [3] = new() { "eco-3" },
        },
        ["kinestesico"] = new()
        {
            [1] = new() { "atencion-1", "emocion-1", "lider-1" },
            [2] = new() { "grito-2", "ritmo-2" },
            [3] = new() { "ritmo-3", "emocion-3", "lider-3" },
        },
        ["lectoescritura"] = new()
        {
            [1] = new() { "error-1", "lee-1", "colores-1" },
            [2] = new() { "completa-2", "escribe-2" },
            [3] = new() { "lee-3" },
        },
    };

    // Titles shown in the "Para ti hoy" recommendation cards
    private static readonly Dictionary<string, string> GameTitles = new()
    {
        // Visual
        ["memory-1"]      = "Juego de Memoria",
        ["memoriza-1"]    = "Memoriza y Encuentra",
        ["detective-1"]   = "Detective de Errores",
        ["escena-2"]      = "Completa la Escena",
        ["historia-2"]    = "Ordena la Historia",
        ["profesiones-2"] = "Explora Profesiones",
        ["asocia-3"]      = "Asocia la Imagen",
        ["grupos-3"]      = "Clasificación de Grupos",
        ["patrones-3"]    = "Juego de Patrones",
        // Auditivo
        ["cadena-1"]   = "Cadena de Palabras",
        ["eco-1"]      = "Eco de Palabras",
        ["cadena-2"]   = "Cadena de Palabras 2",
        ["completa-2"] = "Completa la Oración",
        ["eco-3"]      = "Eco de Palabras 2",
        // Kinestésico
        ["atencion-1"] = "Atención Conjunta",
        ["emocion-1"]  = "Reconoce Emociones",
        ["lider-1"]    = "Sigue al Líder",
        ["grito-2"]    = "Regulando el Grito",
        ["ritmo-2"]    = "Ritmo de Sílabas",
        ["ritmo-3"]    = "Ritmo de Sílabas 2",
        ["emocion-3"]  = "Emociones Pro",
        ["lider-3"]    = "Sigue al Líder 2",
        // Lectoescritura
        ["error-1"]   = "Encuentra el Error",
        ["lee-1"]     = "Lee y Asocia",
        ["colores-1"] = "Oración de Colores",
        ["escribe-2"] = "Escribe la Palabra",
        ["lee-3"]     = "Lee y Asocia 2",
    };

    // Recent mastery history per style (last 5 values) for trend detection
    private const int TrendWindowSize = 5;

    public AdaptiveEngineService(NeuroBlueMindsDbContext db, ILogger<AdaptiveEngineService> logger)
    {
        _db     = db;
        _logger = logger;
    }

    // ── Called after quiz completion ─────────────────────────────────────────────
    public async Task UpdateStateAfterQuiz(int childUserId)
    {
        var responses = await _db.QuizResponses
            .Where(r => r.UserId == childUserId)
            .OrderByDescending(r => r.CreatedAt)
            .Take(80)   // last ~4 quizzes
            .ToListAsync();

        if (!responses.Any()) return;

        var state  = await LoadState(childUserId);
        var styles = new[] { "visual", "auditivo", "kinestesico", "lectoescritura" };

        // Snapshot mastery before this update for trend comparison
        var prevMastery = state.MasteryScores.ToDictionary(kv => kv.Key, kv => kv.Value);

        foreach (var style in styles)
        {
            var styleResponses = responses
                .Where(r => r.LearningStyle?.ToLower().Contains(StyleKey(style)) == true)
                .ToList();

            if (!styleResponses.Any()) continue;

            var accuracy = styleResponses.Count(r => r.IsCorrect) / (double)styleResponses.Count;
            var avgTime  = styleResponses
                .Where(r => r.ResponseTimeMs.HasValue)
                .Select(r => (double)r.ResponseTimeMs!.Value)
                .DefaultIfEmpty(3000)
                .Average();

            // Mastery = accuracy weighted by response speed
            var speedFactor = Math.Max(0.3, Math.Min(1.0, 1000.0 / avgTime));
            var mastery     = Math.Round(accuracy * 0.7 + accuracy * speedFactor * 0.3, 3);

            state.MasteryScores[style]     = mastery;
            state.AvgResponseTimeMs[style] = avgTime;

            // Level promotion / demotion
            if (mastery >= 0.85 && state.CurrentLevel[style] < 3)
            {
                state.CurrentLevel[style]++;
                _logger.LogInformation("[ADE] Child {Id} promoted to level {L} in {Style}", childUserId, state.CurrentLevel[style], style);
            }
            else if (mastery < 0.40 && state.CurrentLevel[style] > 1)
            {
                state.CurrentLevel[style]--;
                _logger.LogInformation("[ADE] Child {Id} demoted to level {L} in {Style}", childUserId, state.CurrentLevel[style], style);
            }

            // Track struggling / mastered areas
            var areaKey = $"{style}_nivel_{state.CurrentLevel[style]}";
            if (mastery < 0.50 && !state.StrugglingAreas.Contains(areaKey))
                state.StrugglingAreas.Add(areaKey);
            else if (mastery >= 0.70)
                state.StrugglingAreas.RemoveAll(a => a.StartsWith(style));

            if (mastery >= 0.85 && !state.MasteredAreas.Contains(areaKey))
                state.MasteredAreas.Add(areaKey);
        }

        // ── Dominant / secondary / weakest styles ────────────────────────────────
        var ranked = state.MasteryScores.OrderByDescending(kv => kv.Value).ToList();
        state.DominantStyle  = ranked[0].Key;
        state.SecondaryStyle = ranked.Count > 1 ? ranked[1].Key : ranked[0].Key;
        state.WeakestStyle   = ranked.Last().Key;

        // ── Trend: compare new dominant mastery vs previous ──────────────────────
        var domPrev = prevMastery.GetValueOrDefault(state.DominantStyle, 0);
        var domNow  = state.MasteryScores.GetValueOrDefault(state.DominantStyle, 0);
        var delta   = domNow - domPrev;

        state.RecentTrend = delta > 0.05  ? "improving"
                          : delta < -0.05 ? "declining"
                          :                 "stable";

        // ── Session streak (consecutive days) ────────────────────────────────────
        var today     = DateTime.UtcNow.Date;
        var lastDate  = state.LastSessionDate.Date;
        if (lastDate == today.AddDays(-1))
            state.SessionStreak++;          // continued streak
        else if (lastDate < today.AddDays(-1))
            state.SessionStreak = 1;        // streak broken — reset to 1

        state.TotalSessions++;
        state.LastSessionDate = DateTime.UtcNow;
        state.LastUpdated     = DateTime.UtcNow;

        await SaveState(childUserId, state);

        // Cache dominant style + level in child_profiles for quick reads
        await _db.ChildProfiles
            .Where(c => c.ChildUserId == childUserId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(c => c.DominantStyle,  state.DominantStyle)
                .SetProperty(c => c.SuggestedLevel, state.CurrentLevel[state.DominantStyle])
                .SetProperty(c => c.UpdatedAt,      DateTime.UtcNow));

        _logger.LogInformation("[ADE] Quiz state updated for child {Id}: dominant={Style}, trend={Trend}, streak={Streak}",
            childUserId, state.DominantStyle, state.RecentTrend, state.SessionStreak);
    }

    // ── Called after each game result ────────────────────────────────────────────
    public async Task UpdateStateAfterGame(int childUserId, string style, double accuracy,
        int responseTimeMs, bool abandoned)
    {
        var state = await LoadState(childUserId);
        style = style.ToLower().Trim();

        if (abandoned)
        {
            state.NeedsConfidenceRestore = true;
            await SaveState(childUserId, state);
            _logger.LogInformation("[ADE] Child {Id} abandoned a {Style} game — confidence restore flagged.", childUserId, style);
            return;
        }

        // Exponential moving average (α=0.3) — reacts to recent performance
        // without completely overwriting quiz-based mastery
        const double alpha        = 0.3;
        var          clampedAcc   = Math.Max(0, Math.Min(1, accuracy / 100.0));

        if (state.MasteryScores.ContainsKey(style))
            state.MasteryScores[style] = Math.Round(
                alpha * clampedAcc + (1 - alpha) * state.MasteryScores[style], 3);
        else
            state.MasteryScores[style] = Math.Round(clampedAcc, 3);

        if (state.AvgResponseTimeMs.ContainsKey(style))
            state.AvgResponseTimeMs[style] = Math.Round(
                alpha * responseTimeMs + (1 - alpha) * state.AvgResponseTimeMs[style]);
        else
            state.AvgResponseTimeMs[style] = responseTimeMs;

        state.NeedsConfidenceRestore = false;
        state.LastUpdated            = DateTime.UtcNow;

        // Session streak (same logic as after-quiz)
        var today    = DateTime.UtcNow.Date;
        var lastDate = state.LastSessionDate.Date;
        if (lastDate == today.AddDays(-1))
            state.SessionStreak++;
        else if (lastDate < today.AddDays(-1))
            state.SessionStreak = 1;
        state.LastSessionDate = DateTime.UtcNow;

        await SaveState(childUserId, state);
    }

    // ── Return ranked activity recommendations ────────────────────────────────────
    public async Task<AdaptiveRecommendationsDto> GetRecommendations(int childUserId)
    {
        var state     = await LoadState(childUserId);
        var child     = await _db.ChildProfiles.FirstOrDefaultAsync(c => c.ChildUserId == childUserId);
        var childName = child?.Name ?? "Explorador";

        var recs   = new List<ActivityRecommendationDto>();

        // 1. Confidence restore — start with an easy game one level below dominant
        if (state.NeedsConfidenceRestore)
        {
            var style = state.DominantStyle;
            var level = Math.Max(1, state.CurrentLevel.GetValueOrDefault(style, 1) - 1);
            recs.Add(MakeRec(style, level, "confidence",
                $"¡Empezamos suave hoy, {childName}! 💪 Un juego fácil para calentar.", true));
        }

        // 2. Primary — dominant style at current level (strengthen)
        recs.Add(MakeRec(
            state.DominantStyle,
            state.CurrentLevel.GetValueOrDefault(state.DominantStyle, 1),
            "strengthen",
            $"Tu punto fuerte: practica {StyleName(state.DominantStyle)} y sigue brillando ⭐"));

        // 3. Challenge — secondary style: jump a level if mastery is high enough
        var secStyle   = state.SecondaryStyle;
        var secMastery = state.MasteryScores.GetValueOrDefault(secStyle, 0);
        var secLevel   = state.CurrentLevel.GetValueOrDefault(secStyle, 1);

        if (secMastery >= 0.70 && secLevel < 3)
            recs.Add(MakeRec(secStyle, secLevel + 1, "challenge",
                $"¡Estás listo para subir de nivel en {StyleName(secStyle)}! 🚀"));
        else
            recs.Add(MakeRec(secStyle, secLevel, "strengthen",
                $"Refuerza {StyleName(secStyle)} — ya casi dominas este nivel"));

        // 4. Variety — weakest style, reduced level (every 3rd session to avoid fatigue)
        if (state.TotalSessions % 3 == 0)
        {
            var weakStyle = state.WeakestStyle;
            var weakLevel = Math.Max(1, state.CurrentLevel.GetValueOrDefault(weakStyle, 1) - 1);
            recs.Add(MakeRec(weakStyle, weakLevel, "variety",
                $"Un poco de {StyleName(weakStyle)} te hará más completo 🌟 ¡Sin presión!"));
        }

        // 5. Struggling areas — up to 2 more slots
        foreach (var area in state.StrugglingAreas.Take(2))
        {
            if (recs.Count >= 5) break;
            var parts = area.Split('_');
            // area format: "{style}_nivel_{level}"
            if (parts.Length >= 3 && int.TryParse(parts.Last(), out var lvl))
            {
                var aStyle = string.Join("_", parts[..^2]);
                recs.Add(MakeRec(aStyle, lvl, "struggling",
                    $"¡Trabajemos juntos en {StyleName(aStyle)}! Con práctica lo lograrás 💙"));
            }
        }

        // De-duplicate by GameId, sort by relevance, cap at 5
        recs = recs
            .DistinctBy(r => r.GameId)
            .OrderByDescending(r => r.RelevanceScore)
            .Take(5)
            .ToList();

        var sessionMsg = BuildSessionMessage(state, childName);

        _logger.LogInformation("[ADE] Returning {Count} recommendations for child {Id}", recs.Count, childUserId);

        return new AdaptiveRecommendationsDto
        {
            ChildId         = childUserId,
            ChildName       = childName,
            State           = state,
            Recommendations = recs,
            SessionMessage  = sessionMsg
        };
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    /// <summary>
    /// Picks a game ID for a given style + level.
    /// Uses a simple rotation based on TotalSessions to give variety across sessions.
    /// </summary>
    private ActivityRecommendationDto MakeRec(string style, int level, string reasonType,
        string reason, bool isConfidence = false)
    {
        style = style.ToLower().Trim();
        level = Math.Clamp(level, 1, 3);

        // Get games available for this style+level; fall back to level 1 if empty
        var levelGames = GameCatalogByLevel
            .GetValueOrDefault(style, new())
            .GetValueOrDefault(level, new());

        if (!levelGames.Any())
            levelGames = GameCatalogByLevel.GetValueOrDefault(style, new())
                .OrderBy(kv => kv.Key).FirstOrDefault().Value ?? new();

        // Rotate through games so the child doesn't always see the same one
        // (TotalSessions is loaded from state but we pass state to this call,
        //  so we use a simple hash-based approach instead)
        var gameId = levelGames.Any()
            ? levelGames[Math.Abs(reason.GetHashCode()) % levelGames.Count]
            : $"{style}-{level}";

        var relevance = reasonType switch
        {
            "confidence" => 1.0,
            "strengthen" => 0.9,
            "challenge"  => 0.8,
            "struggling" => 0.75,
            "variety"    => 0.6,
            _            => 0.5
        };

        return new ActivityRecommendationDto
        {
            GameId           = gameId,
            GameTitle        = GameTitles.GetValueOrDefault(gameId, gameId.Replace("-", " ")),
            Style            = style,
            Level            = level,
            Reason           = reason,
            ReasonType       = reasonType,
            EstimatedMinutes = 10,
            RelevanceScore   = relevance,
            IsConfidenceGame = isConfidence
        };
    }

    private static string BuildSessionMessage(AdaptiveStateDto state, string childName)
    {
        if (state.NeedsConfidenceRestore)
            return $"¡Hola {childName}! Empecemos con calma hoy 😊";

        if (state.SessionStreak >= 7)
            return $"¡{state.SessionStreak} días seguidos, {childName}! ¡Eres una máquina! 🔥🔥";

        if (state.SessionStreak >= 3)
            return $"¡{state.SessionStreak} días en racha, {childName}! ¡Sigue así! 🔥";

        if (state.RecentTrend == "improving")
            return $"¡Vas mejorando, {childName}! Tu esfuerzo está dando frutos 📈";

        if (state.RecentTrend == "declining")
            return $"Hoy practicamos juntos, {childName}. ¡Cada sesión cuenta! 💙";

        return $"¡Bienvenido, {childName}! ¿Qué aprendemos hoy? 🧠";
    }

    private static string StyleKey(string style) => style.ToLower() switch
    {
        "visual"         => "visual",
        "auditivo"       => "audit",
        "kinestesico"    => "kine",
        "lectoescritura" => "lecto",
        _                => style.ToLower()
    };

    private static string StyleName(string style) => style.ToLower() switch
    {
        "visual"         => "Visual",
        "auditivo"       => "Auditivo",
        "kinestesico"    => "Kinestésico",
        "lectoescritura" => "Lectoescritura",
        _                => style
    };

    private async Task<AdaptiveStateDto> LoadState(int childUserId)
    {
        var profile = await _db.ChildProfiles
            .FirstOrDefaultAsync(c => c.ChildUserId == childUserId);

        if (profile?.AdaptiveState == null)
            return new AdaptiveStateDto();

        try
        {
            return JsonSerializer.Deserialize<AdaptiveStateDto>(profile.AdaptiveState,
                       new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                   ?? new AdaptiveStateDto();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[ADE] Failed to deserialize AdaptiveState for child {Id} — resetting.", childUserId);
            return new AdaptiveStateDto();
        }
    }

    private async Task SaveState(int childUserId, AdaptiveStateDto state)
    {
        var json = JsonSerializer.Serialize(state);
        await _db.ChildProfiles
            .Where(c => c.ChildUserId == childUserId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(c => c.AdaptiveState, json)
                .SetProperty(c => c.UpdatedAt,     DateTime.UtcNow));
    }
}
