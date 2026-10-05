using NeuroBlueMinds.Shared.Interfaces;
using Microsoft.EntityFrameworkCore;
using NeuroBlueMinds.Data;
using NeuroBlueMinds.Shared.DbModels;
using NeuroBlueMinds.Shared.DTOs;
using System.Text.Json;

namespace NeuroBlueMinds.Server.Services;

public class DashboardService : IDashboardService
{
  private readonly NeuroBlueMindsDbContext    _context;
  private readonly IGroqService               _groq;
  private readonly IAdaptiveEngineService     _adaptive;
  private readonly ILogger<DashboardService>  _logger;

  public DashboardService(
      NeuroBlueMindsDbContext context,
      IGroqService groq,
      IAdaptiveEngineService adaptive,
      ILogger<DashboardService> logger)
  {
    _context  = context;
    _groq     = groq;
    _adaptive = adaptive;
    _logger   = logger;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD ANALYSIS  (GetDeepAnalysisAsync now powers the real roadmap)
  // ═══════════════════════════════════════════════════════════════════════════

  public async Task<DeepAnalysisResult> GetDeepAnalysisAsync(int userId, string userName)
  {
    var profile = await GetRoadmapAsync(userId, userName);

    // Map back to legacy shape so Dashboard.razor doesn't break
    return new DeepAnalysisResult
    {
      DominantStyle = profile.DominantStyle,
      SuggestedLevel = profile.SuggestedLevel,
      Reasoning = profile.BlueBotSummary,
      AveragesByStyle = profile.StyleBreakdown.Select(s => new StyleSummary
      {
        LearningStyle = s.Style,
        GameCount = s.GamesPlayed,
        AvgAccuracy = Math.Round((s.QuizAccuracy + s.GameAccuracy) / 2, 1)
      }).ToList(),
      FullProfile = profile
    };
  }

  // ── NEW: rich roadmap used by Progreso.razor ───────────────────────────────
  public async Task<NeuroprofileAnalysisDto> GetRoadmapAsync(int userId, string userName)
  {
    // 1. Latest completed child quiz session + all its responses
    var latestChild = await _context.QuizSessions
        .Where(s => s.UserId == userId && s.IsCompleted)
        .OrderByDescending(s => s.CreatedAt)
        .FirstOrDefaultAsync();

    var childResponses = latestChild != null
        ? await _context.QuizResponses
            .Where(r => r.QuizSessionId == latestChild.Id)
            .ToListAsync()
        : new List<QuizResponse>();

    // 2. Latest completed parent quiz session + responses
    var latestParent = await _context.ParentQuizSessions
        .Where(p => p.UserId == userId && p.IsCompleted)
        .OrderByDescending(p => p.CreatedAt)
        .FirstOrDefaultAsync();

    var parentResponses = latestParent != null
        ? await _context.ParentQuizResponses
            .Where(r => r.SessionId == latestParent.Id)
            .ToListAsync()
        : new List<ParentQuizResponse>();

    // 3. Game results — last 60 plays, grouped by game+style for trend calc
    var gameResults = await _context.GameResults
        .Where(g => g.UserId == userId)
        .OrderByDescending(g => g.PlayedAt)
        .Take(60)
        .ToListAsync();

    var gameStats = gameResults
        .GroupBy(g => new { g.GameId, g.LearningStyle })
        .Select(grp =>
        {
          var ordered = grp.OrderBy(r => r.PlayedAt).ToList();
          var half = Math.Max(1, ordered.Count / 2);
          var firstHalf = ordered.Take(half).Select(r => r.Accuracy ?? 0).DefaultIfEmpty(0).Average();
          var secondHalfItems = ordered.Skip(half).ToList();
          var secondHalf = secondHalfItems.Count > 0
                  ? secondHalfItems.Select(r => r.Accuracy ?? 0).DefaultIfEmpty(0).Average()
                  : firstHalf;
          var trend = secondHalf > firstHalf + 5 ? "improving"
                         : secondHalf < firstHalf - 5 ? "declining"
                         : "stable";
          return new GameStatSummary
          {
            GameId = grp.Key.GameId,
            Style = grp.Key.LearningStyle,
            TimesPlayed = grp.Count(),
            AvgAccuracy = Math.Round(grp.Average(r => Math.Min(r.Accuracy ?? 0, 100)), 1),
            BestScore = grp.Max(r => r.Score),
            Trend = trend
          };
        }).ToList();

    // 4. Longitudinal trend (last 10 events across quizzes + games)
    var trendPoints = await BuildTrend(userId);

    // 5. Parent's perceived learning style = most-answered section
    var parentPerceivedStyle = parentResponses
        .GroupBy(r => r.Section)
        .OrderByDescending(g => g.Count())
        .FirstOrDefault()?.Key ?? "";

    // 6. Build NeuroprofileInputData and call Groq
    var input = new NeuroprofileInputData
    {
      ChildName = userName,
      UserId = userId,
      ChildQuizScore = latestChild?.Score ?? 0,
      ChildDominantStyle = latestChild?.LearningStyle ?? "",
      ChildSuggestedLevel = latestChild?.SuggestedLevel ?? 1,
      ParentQuizCompleted = latestParent?.IsCompleted ?? false,
      CommunicationScore = latestParent?.CommunicationScore ?? 0,
      ParentPerceivedStyle = parentPerceivedStyle,
      GameStats = gameStats,
      LongitudinalTrend = trendPoints,
      ChildQuizResponses = childResponses.Select(r => new QuizResponseSummary
      {
        QuestionIndex = r.QuestionIndex,
        LearningStyle = r.LearningStyle,
        Nivel = r.Nivel,
        QuestionType = r.QuestionType,
        IsCorrect = r.IsCorrect,
        ResponseTimeMs = r.ResponseTimeMs
      }).ToList(),
      ParentResponses = parentResponses.Select(r => new ParentResponseSummary
      {
        Section = r.Section,
        Answer = r.Answer
      }).ToList()
    };

    return await _groq.GetNeuroprofileAnalysis(input);
  }

  private async Task<List<TrendPoint>> BuildTrend(int userId)
  {
    var quizPts = await _context.QuizSessions
        .Where(s => s.UserId == userId && s.IsCompleted)
        .OrderByDescending(s => s.CreatedAt)
        .Take(5)
        .Select(s => new TrendPoint
        {
          Date = s.CreatedAt,
          Score = s.Score,
          Style = s.LearningStyle ?? "",
          Source = "quiz"
        }).ToListAsync();

    var gamePts = await _context.GameResults
        .Where(g => g.UserId == userId)
        .OrderByDescending(g => g.PlayedAt)
        .Take(10)
        .Select(g => new TrendPoint
        {
          Date = g.PlayedAt,
          Score = g.Score,
          Style = g.LearningStyle,
          Source = "game"
        }).ToListAsync();

    return quizPts.Concat(gamePts).OrderBy(p => p.Date).ToList();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HISTORY & SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  public async Task<List<SessionHistory>> GetHistoryAsync(int userId)
  {
    var childSessions = await _context.QuizSessions
        .Where(q => q.UserId == userId && q.IsCompleted)
        .Select(s => new SessionHistory
        {
          Type = "Niños",
          Score = s.Score,
          BestStyle = s.LearningStyle ?? "",
          SuggestedLevel = s.SuggestedLevel,
          TotalTimeSeconds = s.TotalTimeSeconds,
          CreatedAt = s.CreatedAt
        }).ToListAsync();

    var parentSessions = await _context.ParentQuizSessions
        .Where(p => p.UserId == userId && p.IsCompleted)
        .Select(p => new SessionHistory
        {
          Type = "Padres",
          Score = p.CommunicationScore,
          BestStyle = p.LearningStyle ?? "",
          CreatedAt = p.CreatedAt
        }).ToListAsync();

    return childSessions.Concat(parentSessions)
        .OrderByDescending(x => x.CreatedAt)
        .Take(10)
        .ToList();
  }

  public async Task<UserSummaryDTO> GetUserSummaryAsync(int userId)
  {
    var games = await _context.GameResults
        .Where(g => g.UserId == userId)
        .OrderBy(g => g.PlayedAt)
        .ToListAsync();

    if (!games.Any())
      return new UserSummaryDTO
      {
        AiInsight = "¡Completa tu primer quiz para ver tu análisis personalizado!"
      };

    // Improvement: first half avg vs second half avg (needs at least 2 games)
    int improvement = 0;
    if (games.Count >= 2)
    {
      var half = Math.Max(1, games.Count / 2);
      var earlyAvg = games.Take(half).Average(g => Math.Min(g.Accuracy ?? 0, 100));
      var recentAvg = games.Skip(half).Average(g => Math.Min(g.Accuracy ?? 0, 100));
      improvement = (int)Math.Round(recentAvg - earlyAvg);
    }

    // Quick AI insight for the summary card (uses legacy stub)
    var dominantStyle = games
        .GroupBy(g => g.LearningStyle)
        .OrderByDescending(g => g.Count())
        .FirstOrDefault()?.Key ?? "visual";

    var summaryStats = games
        .GroupBy(g => g.LearningStyle)
        .Select(grp => new StyleSummary
        {
          LearningStyle = grp.Key,
          GameCount = grp.Count(),
          AvgAccuracy = Math.Round(grp.Average(g => g.Accuracy ?? 0), 1)
        }).ToList();

    // Cache-friendly: only call AI if we have meaningful data
    string aiInsight;
    try
    {
      aiInsight = games.Count >= 3
          ? await _groq.GetBlueBotAnalysis(
              await GetUserName(userId), summaryStats, dominantStyle)
          : "¡Sigue jugando para ver tu análisis personalizado!";
    }
    catch { aiInsight = "¡Sigue así, vas por muy buen camino!"; }

    return new UserSummaryDTO
    {
      GamesPlayed = games.Count,
      AvgAccuracy = Math.Round(games.Average(g => Math.Min(g.Accuracy ?? 0, 100)), 1),
      BestScore = games.Max(g => g.Score),
      Improvement = improvement,
      AiInsight = aiInsight
    };
  }

  private async Task<string> GetUserName(int userId)
  {
    var user = await _context.Users.FindAsync(userId);
    return user?.Name ?? user?.Email ?? "Explorador";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GAMES
  // ═══════════════════════════════════════════════════════════════════════════

  public async Task<bool> SaveGameResultAsync(SaveGameResultDto result, int userId)
  {
    try
    {
      var progress = await _context.GameProgresses
          .FirstOrDefaultAsync(p => p.UserId == userId && p.GameId == result.GameId);

      // Clamp accuracy to 0–100 (games occasionally send raw scores)
      var clampedAccuracy = result.Accuracy.HasValue
          ? Math.Max(0, Math.Min(100, result.Accuracy.Value))
          : (double?)null;

      if (progress == null)
      {
        _context.GameProgresses.Add(new GameProgress
        {
          UserId = userId,
          GameId = result.GameId,
          GameTitle = result.GameId.Replace("-", " "),
          Score = result.Score,
          Level = result.Level ?? 1,
          MaxLevel = 3,
          CompletionPercentage = (float)(clampedAccuracy ?? 0),
          TotalTime = (result.ResponseTime ?? 0) / 1000,
          TimesPlayed = 1,
          UpdatedAt = DateTime.UtcNow
        });
      }
      else
      {
        progress.Score = Math.Max(progress.Score, result.Score);
        progress.Level = Math.Max(progress.Level, result.Level ?? 1);
        progress.TotalTime += (result.ResponseTime ?? 0) / 1000;
        progress.TimesPlayed += 1;
        progress.UpdatedAt = DateTime.UtcNow;

        // Calculate CompletionPercentage as average of all game results for this game
        // This gives a more accurate measure of mastery over time
        var allGameResults = await _context.GameResults
            .Where(gr => gr.UserId == userId && gr.GameId == result.GameId)
            .Select(gr => gr.Accuracy)
            .ToListAsync();

        if (allGameResults.Any())
        {
          var avgAccuracy = allGameResults
              .Where(a => a.HasValue)
              .DefaultIfEmpty(0)
              .Average(a => a ?? 0);
          progress.CompletionPercentage = (float)Math.Min(avgAccuracy, 100);
        }
        else
        {
          progress.CompletionPercentage = (float)(clampedAccuracy ?? 0);
        }
      }

      _context.GameResults.Add(new GameResult
      {
        UserId = userId,
        GameId = result.GameId,
        Score = result.Score,
        Accuracy = clampedAccuracy,
        ResponseTimeMs = result.ResponseTime,
        LearningStyle = result.Style,
        PlayedAt = DateTime.UtcNow
      });

      await _adaptive.UpdateStateAfterGame(userId, result.Style,
       result.Accuracy ?? 0, result.ResponseTime ?? 3000, abandoned: false);
      return await _context.SaveChangesAsync() > 0;
    }
    catch (Exception ex)
    {
      _logger.LogError(ex, "[DashboardService] SaveGameResult error for game {GameId}.", result.GameId);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PARENT QUIZ
  // ═══════════════════════════════════════════════════════════════════════════

  public async Task<ParentQuizSession?> GetActiveParentSessionAsync(int userId)
      => await _context.ParentQuizSessions
          .Where(p => p.UserId == userId && !p.IsCompleted)
          .OrderByDescending(p => p.UpdatedAt)
          .FirstOrDefaultAsync();

  public async Task<bool> SaveParentResponseAsync(int userId, int index, string section, string answer)
  {
    var session = await _context.ParentQuizSessions
        .FirstOrDefaultAsync(s => s.UserId == userId && !s.IsCompleted);

    if (session == null)
    {
      session = new ParentQuizSession { UserId = userId, CreatedAt = DateTime.UtcNow };
      _context.ParentQuizSessions.Add(session);
      await _context.SaveChangesAsync();
    }

    var existing = await _context.ParentQuizResponses
        .FirstOrDefaultAsync(r => r.SessionId == session.Id && r.QuestionIndex == index);

    if (existing != null)
    {
      existing.Answer = answer;
      existing.Section = section;
    }
    else
    {
      _context.ParentQuizResponses.Add(new ParentQuizResponse
      {
        SessionId = session.Id,
        UserId = userId,
        QuestionIndex = index,
        Section = section,
        Answer = answer
      });
    }

    session.CurrentQuestionIndex = index;
    session.UpdatedAt = DateTime.UtcNow;
    return await _context.SaveChangesAsync() > 0;
  }

  public async Task<bool> CompleteParentSessionAsync(int userId, int communicationScore, string learningStyle)
  {
    try
    {
      var session = await _context.ParentQuizSessions
          .FirstOrDefaultAsync(s => s.UserId == userId && !s.IsCompleted);

      if (session == null)
      {
        session = new ParentQuizSession { UserId = userId, CreatedAt = DateTime.UtcNow };
        _context.ParentQuizSessions.Add(session);
        await _context.SaveChangesAsync();
      }

      session.IsCompleted = true;
      session.CommunicationScore = communicationScore;
      session.LearningStyle = learningStyle;
      session.CurrentQuestionIndex = 18;
      session.UpdatedAt = DateTime.UtcNow;
      return await _context.SaveChangesAsync() > 0;
    }
    catch (Exception ex)
    {
      _logger.LogError(ex, "[DashboardService] CompleteParentSession error for user {UserId}.", userId);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHILD QUIZ
  // ═══════════════════════════════════════════════════════════════════════════

  public async Task<QuizSession?> GetActiveChildSessionAsync(int userId)
      => await _context.QuizSessions
          .Include(s => s.Responses)
          .Where(s => s.UserId == userId && !s.IsCompleted)
          .OrderByDescending(s => s.UpdatedAt)
          .FirstOrDefaultAsync();

  public async Task<long> CreateChildSessionAsync(int userId)
  {
    var session = new QuizSession
    {
      UserId = userId,
      CreatedAt = DateTime.UtcNow,
      UpdatedAt = DateTime.UtcNow
    };
    _context.QuizSessions.Add(session);
    await _context.SaveChangesAsync();
    return session.Id;
  }

  public async Task<bool> SaveChildResponseAsync(
      int userId, long sessionId, int questionIndex,
      string questionType, string learningStyle, int nivel,
      string answerJson, bool isCorrect, int responseTimeMs)
  {
    try
    {
      var existing = await _context.QuizResponses
          .FirstOrDefaultAsync(r => r.QuizSessionId == sessionId && r.QuestionIndex == questionIndex);

      if (existing != null)
      {
        existing.Answer = answerJson;
        existing.IsCorrect = isCorrect;
        existing.ResponseTimeMs = responseTimeMs;
      }
      else
      {
        _context.QuizResponses.Add(new QuizResponse
        {
          UserId = userId,
          QuizSessionId = sessionId,
          QuestionIndex = questionIndex,
          QuestionType = questionType,
          LearningStyle = learningStyle,
          Nivel = nivel,
          Answer = answerJson,
          IsCorrect = isCorrect,
          ResponseTimeMs = responseTimeMs,
          CreatedAt = DateTime.UtcNow
        });
      }

      // Use ExecuteUpdateAsync to avoid EF change-tracking issues with index
      await _context.QuizSessions
          .Where(s => s.Id == sessionId && s.CurrentQuestionIndex <= questionIndex)
          .ExecuteUpdateAsync(s => s
              .SetProperty(x => x.CurrentQuestionIndex, questionIndex + 1)
              .SetProperty(x => x.UpdatedAt, DateTime.UtcNow));

      return await _context.SaveChangesAsync() > 0;
    }
    catch (Exception ex)
    {
      _logger.LogError(ex, "[DashboardService] SaveChildResponse error for user {UserId}, question {Index}.", userId, questionIndex);
      return false;
    }
  }

  public async Task<QuizCompleteResponseDto> CompleteChildSessionAsync(
      int userId, long sessionId, string answersJson, int totalTimeSeconds)
  {
    try
    {
      var responses = await _context.QuizResponses
          .Where(r => r.QuizSessionId == sessionId && r.UserId == userId)
          .ToListAsync();

      var styles = new[] { "visual", "auditivo", "kinestesico", "lectoescritura" };
      var stats = styles.ToDictionary(
          s => s,
          s => new
          {
            Correct = responses.Count(r => r.LearningStyle == s && r.IsCorrect),
            Total = responses.Count(r => r.LearningStyle == s)
          });

      var bestStyle = stats
          .Where(kv => kv.Value.Total > 0)
          .OrderByDescending(kv => (double)kv.Value.Correct / kv.Value.Total)
          .FirstOrDefault().Key ?? "visual";

      int suggestedLevel = 1;
      foreach (var kv in responses.GroupBy(r => r.Nivel)
          .OrderByDescending(g => g.Key))
      {
        if (kv.Count() > 0 && (double)kv.Count(r => r.IsCorrect) / kv.Count() >= 0.6)
        {
          suggestedLevel = kv.Key;
          break;
        }
      }

      int score = responses.Count(r => r.IsCorrect);

      var session = await _context.QuizSessions.FindAsync(sessionId);
      if (session != null)
      {
        session.IsCompleted = true;
        session.Score = score;
        session.LearningStyle = bestStyle;
        session.SuggestedLevel = suggestedLevel;
        session.TotalTimeSeconds = totalTimeSeconds;
        session.UpdatedAt = DateTime.UtcNow;
      }
      await _context.SaveChangesAsync();

      await _adaptive.UpdateStateAfterQuiz(userId);
      return new QuizCompleteResponseDto
      {
        Score = score,
        TotalTimeSeconds = totalTimeSeconds,
        BestStyle = bestStyle,
        SuggestedLevel = suggestedLevel,
        LearningStats = new LearningStatsDto
        {
          Visual = new StyleStat { Correct = stats["visual"].Correct, Total = stats["visual"].Total },
          Auditivo = new StyleStat { Correct = stats["auditivo"].Correct, Total = stats["auditivo"].Total },
          Kinestesico = new StyleStat { Correct = stats["kinestesico"].Correct, Total = stats["kinestesico"].Total },
          Lectoescritura = new StyleStat { Correct = stats["lectoescritura"].Correct, Total = stats["lectoescritura"].Total }
        },
        Recommendations = GetChildRecommendations(bestStyle, suggestedLevel)
      };
    }
    catch (Exception ex)
    {
      _logger.LogError(ex, "[DashboardService] CompleteChildSession error for user {UserId}, session {SessionId}.", userId, sessionId);
      return new QuizCompleteResponseDto();
    }
  }

  private static string[] GetChildRecommendations(string style, int level)
  {
    var base_ = style switch
    {
      "visual" => new[] { "Usa pictogramas y agendas visuales para las actividades diarias.",
                                        "Apoya las instrucciones con imágenes o videos cortos." },
      "auditivo" => new[] { "El refuerzo con instrucciones verbales claras facilita la retención.",
                                        "Usa canciones o historias sonoras para enseñar conceptos nuevos." },
      "kinestesico" => new[] { "Aprende mejor manipulando objetos reales y con actividades de movimiento.",
                                        "Incorpora juegos físicos y manualidades en el aprendizaje." },
      "lectoescritura" => new[] { "Usa tarjetas con palabras escritas y lectura en voz alta.",
                                        "Fomenta el uso de listas, diarios o cuadernos de notas." },
      _ => new[] { "Combina diferentes estilos de aprendizaje para mejores resultados." }
    };
    var levelRec = level switch
    {
      1 => "Continúa con actividades de Nivel 1 para afianzar las bases.",
      2 => "¡Listo para el Nivel 2! Introduce desafíos un poco más complejos.",
      3 => "¡Excelente! Puede trabajar con actividades avanzadas de Nivel 3.",
      _ => ""
    };
    return string.IsNullOrEmpty(levelRec) ? base_ : base_.Append(levelRec).ToArray();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACHIEVEMENT BADGE SYSTEM
  // Call EvaluateAndAwardBadgesAsync after any meaningful game/quiz event.
  // ═══════════════════════════════════════════════════════════════════════════

  private static readonly Dictionary<string, (string Title, string Emoji, string Description, int Xp)> BadgeCatalog = new()
  {
    ["first_game"]        = ("¡Primer Juego!",          "🎮", "Completaste tu primer juego. ¡El inicio de una gran aventura!",           50),
    ["streak_3"]          = ("Racha de 3 días",          "🔥", "Jugaste 3 días seguidos. ¡Vas muy bien!",                                100),
    ["streak_7"]          = ("Racha Semanal",            "🔥", "¡7 días seguidos! Eres increíble.",                                      250),
    ["streak_30"]         = ("Maestro de la Constancia", "🏆", "30 días seguidos. ¡Eres una leyenda!",                                   1000),
    ["accuracy_80"]       = ("Precisión Experta",        "🎯", "Alcanzaste 80% de precisión en un juego.",                              150),
    ["accuracy_95"]       = ("Precisión Perfecta",       "⭐", "¡95% de precisión! Casi sin errores.",                                  300),
    ["quiz_complete"]     = ("Quiz Completo",            "📝", "Terminaste tu primer quiz de aprendizaje.",                              75),
    ["vark_complete"]     = ("Estilo Descubierto",       "🧠", "Completaste la evaluación VARK. ¡Ya sabemos cómo aprendes mejor!",       100),
    ["games_10"]          = ("10 Juegos",                "🎯", "Completaste 10 juegos. ¡Cada vez mejor!",                               200),
    ["games_50"]          = ("50 Juegos",                "🎪", "¡50 juegos! Eres un campeón.",                                          500),
    ["milestone_1"]       = ("Primer Hito",              "🌟", "Completaste tu primer hito en el roadmap.",                             100),
    ["milestone_5"]       = ("Explorador",               "🗺️",  "5 hitos completados. Estás explorando todo.",                          300),
    ["level_adventurer"]  = ("Aventurero",               "⚔️",  "Subiste al nivel Aventurero.",                                         200),
    ["level_master"]      = ("Maestro",                  "👑", "¡Nivel Maestro desbloqueado! El máximo nivel.",                         500),
  };

  public async Task<List<AchievementBadge>> GetBadgesAsync(int childProfileId)
  {
    return await _context.AchievementBadges
        .Where(b => b.ChildProfileId == childProfileId)
        .OrderByDescending(b => b.EarnedAt)
        .ToListAsync();
  }

  public async Task<List<AchievementBadge>> EvaluateAndAwardBadgesAsync(int childProfileId)
  {
    var newBadges = new List<AchievementBadge>();

    try
    {
      var existing = await _context.AchievementBadges
          .Where(b => b.ChildProfileId == childProfileId)
          .Select(b => b.BadgeType)
          .ToHashSetAsync();

      var gameResults = await _context.GameResults
          .Where(g => g.UserId == childProfileId)
          .OrderBy(g => g.PlayedAt)
          .ToListAsync();

      var quizDone = await _context.QuizSessions
          .AnyAsync(q => q.UserId == childProfileId && q.IsCompleted);

      var varkDone = await _context.VarkResults
          .AnyAsync(v => v.ChildUserId == childProfileId);

      // ── first_game ──────────────────────────────
      if (!existing.Contains("first_game") && gameResults.Any())
        newBadges.Add(BuildBadge(childProfileId, "first_game"));

      // ── games_10 / games_50 ──────────────────────
      var totalGames = gameResults.Count;
      if (!existing.Contains("games_10") && totalGames >= 10)
        newBadges.Add(BuildBadge(childProfileId, "games_10"));
      if (!existing.Contains("games_50") && totalGames >= 50)
        newBadges.Add(BuildBadge(childProfileId, "games_50"));

      // ── accuracy_80 / accuracy_95 ────────────────
      var maxAccuracy = gameResults.Any() ? gameResults.Max(g => g.Accuracy) : 0;
      if (!existing.Contains("accuracy_80") && maxAccuracy >= 80)
        newBadges.Add(BuildBadge(childProfileId, "accuracy_80"));
      if (!existing.Contains("accuracy_95") && maxAccuracy >= 95)
        newBadges.Add(BuildBadge(childProfileId, "accuracy_95"));

      // ── streak_3 / streak_7 / streak_30 ─────────
      var playDates = gameResults
          .Select(g => g.PlayedAt.Date)
          .Distinct()
          .OrderBy(d => d)
          .ToList();

      var maxStreak = ComputeMaxStreak(playDates);
      if (!existing.Contains("streak_3")  && maxStreak >= 3)
        newBadges.Add(BuildBadge(childProfileId, "streak_3"));
      if (!existing.Contains("streak_7")  && maxStreak >= 7)
        newBadges.Add(BuildBadge(childProfileId, "streak_7"));
      if (!existing.Contains("streak_30") && maxStreak >= 30)
        newBadges.Add(BuildBadge(childProfileId, "streak_30"));

      // ── quiz_complete ────────────────────────────
      if (!existing.Contains("quiz_complete") && quizDone)
        newBadges.Add(BuildBadge(childProfileId, "quiz_complete"));

      // ── vark_complete ────────────────────────────
      if (!existing.Contains("vark_complete") && varkDone)
        newBadges.Add(BuildBadge(childProfileId, "vark_complete"));

      if (newBadges.Any())
      {
        _context.AchievementBadges.AddRange(newBadges);
        await _context.SaveChangesAsync();
        _logger.LogInformation(
            "[Achievements] Awarded {Count} badge(s) to child profile {Id}: {Badges}",
            newBadges.Count, childProfileId,
            string.Join(", ", newBadges.Select(b => b.BadgeType)));
      }
    }
    catch (Exception ex)
    {
      _logger.LogError(ex, "[Achievements] Error evaluating badges for child profile {Id}.", childProfileId);
    }

    return newBadges;
  }

  private static AchievementBadge BuildBadge(int childProfileId, string type)
  {
    var (title, emoji, description, xp) = BadgeCatalog.TryGetValue(type, out var info)
        ? info
        : ("Logro", "🏅", "", 50);

    return new AchievementBadge
    {
      ChildProfileId = childProfileId,
      BadgeType      = type,
      Title          = title,
      Emoji          = emoji,
      Description    = description,
      XpAwarded      = xp,
      EarnedAt       = DateTime.UtcNow,
    };
  }

  private static int ComputeMaxStreak(List<DateTime> sortedDates)
  {
    if (!sortedDates.Any()) return 0;
    int max = 1, current = 1;
    for (int i = 1; i < sortedDates.Count; i++)
    {
      if ((sortedDates[i] - sortedDates[i - 1]).Days == 1)
      {
        current++;
        if (current > max) max = current;
      }
      else current = 1;
    }
    return max;
  }
}
