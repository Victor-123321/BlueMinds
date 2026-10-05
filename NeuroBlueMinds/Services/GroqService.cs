// NeuroBlueMinds/Services/GroqService.cs
// Neuroeducational AI analysis (non-diagnostic).
// Uses Groq llama-3.3-70b-versatile with exponential-backoff retry.
// Privacy: the child's name never leaves the server — the prompt uses NamePlaceholder
// and the name is substituted locally. Set Groq:Enabled=false to keep all data on
// the server (e.g. the research instance, protocol C&W-NM §10.3).

using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using NeuroBlueMinds.Shared.DTOs;
using NeuroBlueMinds.Shared.DbModels;

public interface IGroqService
{
  Task<string> GetBlueBotAnalysis(string userName, List<StyleSummary> stats, string dominantStyle);
  Task<NeuroprofileAnalysisDto> GetNeuroprofileAnalysis(NeuroprofileInputData input);
}

/// <summary>All raw data we pass to the AI. Built by DashboardService from the DB.</summary>
public class NeuroprofileInputData
{
  public string ChildName              { get; set; } = "";
  public int    UserId                 { get; set; }

  // Child quiz
  public List<QuizResponseSummary> ChildQuizResponses { get; set; } = new();
  public int    ChildQuizScore         { get; set; }
  public string ChildDominantStyle     { get; set; } = "";
  public int    ChildSuggestedLevel    { get; set; } = 1;

  // Parent quiz
  public bool   ParentQuizCompleted    { get; set; }
  public int    CommunicationScore     { get; set; }
  public string ParentPerceivedStyle   { get; set; } = "";
  public List<ParentResponseSummary> ParentResponses { get; set; } = new();

  // Games
  public List<GameStatSummary> GameStats { get; set; } = new();

  // Longitudinal
  public List<TrendPoint> LongitudinalTrend { get; set; } = new();
}

public class QuizResponseSummary
{
  public int    QuestionIndex  { get; set; }
  public string LearningStyle  { get; set; } = "";
  public int    Nivel          { get; set; }
  public string QuestionType   { get; set; } = "";
  public bool   IsCorrect      { get; set; }
  public int?   ResponseTimeMs { get; set; }
}

public class ParentResponseSummary
{
  public string Section { get; set; } = "";
  public string Answer  { get; set; } = "";
}

public class GameStatSummary
{
  public string Style       { get; set; } = "";
  public string GameId      { get; set; } = "";
  public int    TimesPlayed { get; set; }
  public double AvgAccuracy { get; set; }
  public int    BestScore   { get; set; }
  public string Trend       { get; set; } = "stable";
}

/// <summary>Internal record replacing the anonymous type for per-style quiz stats.</summary>
public record QuizStyleStat(int Correct, int Total, double AvgTime);

public class GroqService : IGroqService
{
  private readonly HttpClient              _http;
  private readonly string                 _apiKey;
  private readonly bool                   _enabled;
  private readonly ILogger<GroqService>   _logger;

  private const string NamePlaceholder = "[NOMBRE]";

  // Retry settings
  private const int    MaxRetries        = 3;
  private const double BaseDelaySeconds  = 1.5;

  public GroqService(HttpClient http, IConfiguration config, ILogger<GroqService> logger)
  {
    _http   = http;
    _apiKey = config["Groq:ApiKey"] ?? "";
    _enabled = config.GetValue("Groq:Enabled", true);
    _logger = logger;
  }

  // ── Legacy stub (kept for backward compat) ────────────────────────────────
  public async Task<string> GetBlueBotAnalysis(
      string userName, List<StyleSummary> stats, string dominantStyle)
  {
    var input = new NeuroprofileInputData
    {
      ChildName          = userName,
      ChildDominantStyle = dominantStyle,
      GameStats          = stats.Select(s => new GameStatSummary
      {
        Style       = s.LearningStyle,
        AvgAccuracy = s.AvgAccuracy,
        TimesPlayed = s.GameCount
      }).ToList()
    };
    var result = await GetNeuroprofileAnalysis(input);
    return result.BlueBotSummary;
  }

  // ── Main method ───────────────────────────────────────────────────────────
  public async Task<NeuroprofileAnalysisDto> GetNeuroprofileAnalysis(NeuroprofileInputData input)
  {
    if (!_enabled)
      return BuildFallbackAnalysis(input);

    if (string.IsNullOrWhiteSpace(_apiKey))
    {
      _logger.LogWarning("[GroqService] API key not configured — returning fallback analysis.");
      return BuildFallbackAnalysis(input);
    }

    // ── Compute derived stats to feed the prompt ──────────────────────────
    var styleCorrect = input.ChildQuizResponses
        .GroupBy(r => r.LearningStyle)
        .ToDictionary(
            g => g.Key,
            g => new QuizStyleStat(
                g.Count(r => r.IsCorrect),
                g.Count(),
                g.Where(r => r.ResponseTimeMs.HasValue)
                 .Select(r => (double)r.ResponseTimeMs!.Value)
                 .DefaultIfEmpty(0).Average()));

    var parentSectionCounts = input.ParentResponses
        .GroupBy(r => r.Section)
        .ToDictionary(g => g.Key, g => g.Count());

    // Accuracy per style (0–100)
    double StyleAcc(string s) => styleCorrect.TryGetValue(s, out var v) && v.Total > 0
        ? Math.Round((double)v.Correct / v.Total * 100, 1) : 0;

    // Average response time per style in seconds
    double StyleAvgSec(string s) => styleCorrect.TryGetValue(s, out var v)
        ? Math.Round(v.AvgTime / 1000.0, 2) : 0;

    // Identify struggling styles (quiz accuracy < 50 %)
    var struggleStyles = new[] { "visual", "auditivo", "kinestesico", "lectoescritura" }
        .Where(s => StyleAcc(s) > 0 && StyleAcc(s) < 50)
        .ToList();

    // Session frequency signal
    int totalSessions = input.GameStats.Sum(g => g.TimesPlayed);

    var dataPayload = new
    {
      child = new
      {
        dominantStyle     = input.ChildDominantStyle,
        suggestedLevel    = input.ChildSuggestedLevel,
        quizScore         = input.ChildQuizScore,
        quizAccByStyle    = new
        {
          visual        = StyleAcc("visual"),
          auditivo      = StyleAcc("auditivo"),
          kinestesico   = StyleAcc("kinestesico"),
          lectoescritura = StyleAcc("lectoescritura")
        },
        avgResponseSecByStyle = new
        {
          visual        = StyleAvgSec("visual"),
          auditivo      = StyleAvgSec("auditivo"),
          kinestesico   = StyleAvgSec("kinestesico"),
          lectoescritura = StyleAvgSec("lectoescritura")
        },
        struggleStyles    = struggleStyles,
        totalGameSessions = totalSessions,
      },
      games = input.GameStats.Select(g => new
      {
        style       = g.Style,
        gameId      = g.GameId,
        timesPlayed = g.TimesPlayed,
        avgAccuracy = Math.Round(g.AvgAccuracy, 1),
        bestScore   = g.BestScore,
        trend       = g.Trend
      }),
      parent = new
      {
        completed        = input.ParentQuizCompleted,
        communicationScore = input.CommunicationScore,
        perceivedStyle   = input.ParentPerceivedStyle,
        sectionFrequency = parentSectionCounts
      },
      longitudinalTrend = input.LongitudinalTrend.TakeLast(8)
    };

    var dataJson = JsonSerializer.Serialize(dataPayload,
        new JsonSerializerOptions { WriteIndented = false });

    // ── System prompt: clinical role + output schema ──────────────────────
    const string systemPrompt = """
      Eres BlueBot, el asistente neuroeducativo de NeuroBlueMinds. Describes cómo aprende un niño en las
      actividades de la plataforma usando el modelo VARK (Visual, Auditivo, Kinestésico, Lectoescritura)
      y propones apoyos educativos. NO eres una herramienta clínica.

      LÍMITES (obligatorios):
      - No diagnostiques, no sugieras ni nombres condiciones (TDAH, TEA, dislexia u otras) y no
        interpretes los datos como evidencia neurológica o médica.
      - Describe solo el desempeño observado en las actividades; usa lenguaje respetuoso, no centrado
        en el déficit.
      - Refiérete al niño únicamente como [NOMBRE]; no inventes otro nombre.

      CONTEXTO DE LOS DATOS:
      - Incluyen precisión por estilo, velocidad de respuesta, tendencia longitudinal y respuestas del
        cuidador.
      - Una precisión <50 % en un estilo indica que ese tipo de actividad hoy le resulta más difícil y
        conviene darle más apoyo.
      - Tiempos de respuesta altos (>8 s) con baja precisión pueden indicar que la actividad le exige
        demasiado en este momento.
      - Si el estilo que percibe el cuidador difiere del observado, coméntalo como información útil para
        la familia, sin dramatizarlo.
      - El nivel sugerido (1–3): 1=básico, 2=intermedio, 3=avanzado.

      REGLAS:
      1. Responde ÚNICAMENTE con un objeto JSON válido. Sin bloques ```json, sin texto antes o después.
      2. Usa el esquema EXACTO especificado abajo.
      3. Redacta en español, tono cálido y esperanzador, apropiado para padres.
      4. Basa CADA observación en los datos reales. No inventes datos que no estén en el payload.
      5. Las Fortalezas y Desafíos deben ser concretos y accionables, no genéricos.
      6. El Roadmap mensual debe progresar en dificultad y alternar estilos para estimulación cruzada.
      7. El WeeklyPlan debe tener actividades de 10–25 min, realizables en casa sin equipo especial.
      8. Si hay estilos de dificultad (struggleStyles), al menos 1 semana del Roadmap debe abordarlos
         con estrategia de andamiaje (soporte gradual).
      9. ParentTips puede sugerir conversar con su docente o con un profesional si la familia tiene dudas,
         sin anticipar ningún resultado ni diagnóstico.
      """;

    // $$""" means: { and } are literal, {{var}} is interpolation
    var userPrompt = $$"""
      Datos de evaluación:
      {{dataJson}}

      Genera el JSON con exactamente esta estructura (sin omitir ningún campo):
      {
        "BlueBotSummary": "Narrativa de 3-5 oraciones sobre el perfil unico del nino. Menciona al nino como [NOMBRE], su estilo dominante, nivel actual, y un mensaje de motivacion especifico para su patron de datos.",
        "DominantStyle": "visual|auditivo|kinestesico|lectoescritura",
        "SecondaryStyle": "el segundo estilo mas fuerte segun los datos",
        "ProgressTrend": "improving|stable|needs_attention",
        "OverallScore": 0,
        "Strengths": [
          "Fortaleza concreta basada en datos (ej: Precision visual del 82 pct - procesa informacion grafica con gran eficiencia)",
          "Segunda fortaleza con evidencia numerica",
          "Tercera fortaleza o patron positivo observado"
        ],
        "Challenges": [
          "Desafio concreto con estrategia de apoyo (ej: Procesamiento auditivo en 34 pct - usar instrucciones visuales paralelas)",
          "Segundo desafio con recomendacion especifica"
        ],
        "Roadmap": [
          {"Week": 1, "Title": "Consolidacion del estilo dominante", "Description": "Descripcion de 2-3 actividades especificas aprovechando el estilo mas fuerte del nino", "Style": "dominante", "Difficulty": "easy", "Completed": false},
          {"Week": 2, "Title": "Puentes cross-modal", "Description": "Actividades que conectan el estilo dominante con el estilo secundario para reforzar redes neuronales", "Style": "secundario", "Difficulty": "medium", "Completed": false},
          {"Week": 3, "Title": "Andamiaje en areas de dificultad", "Description": "Aborda el estilo de mayor dificultad con soporte visual/auditivo/kinestesico simultaneo", "Style": "estilo dificil", "Difficulty": "medium", "Completed": false},
          {"Week": 4, "Title": "Sintesis y evaluacion", "Description": "Actividades integradoras multi-modal + autoevaluacion para preparar siguiente ciclo", "Style": "multimodal", "Difficulty": "hard", "Completed": false}
        ],
        "WeeklyPlan": [
          {"Day": "Lunes",    "Activity": "Actividad especifica (10-20 min) en casa sin equipo especial", "Style": "estilo", "DurationMin": 15},
          {"Day": "Martes",   "Activity": "...", "Style": "...", "DurationMin": 10},
          {"Day": "Miercoles","Activity": "...", "Style": "...", "DurationMin": 20},
          {"Day": "Jueves",   "Activity": "...", "Style": "...", "DurationMin": 15},
          {"Day": "Viernes",  "Activity": "...", "Style": "...", "DurationMin": 15}
        ],
        "ParentTips": [
          "Consejo 1 especifico al perfil",
          "Consejo 2 sobre comunicacion padre-hijo basado en el score de comunicacion",
          "Consejo 3: como acompanar en casa y a quien acudir si tienen dudas"
        ],
        "GameRecommendations": [
          "Recomendacion de juego/actividad con explicacion del beneficio para este perfil especifico",
          "Recomendacion 2",
          "Recomendacion 3"
        ]
      }
      """;

    // ── Call API with exponential-backoff retry ────────────────────────────
    for (int attempt = 1; attempt <= MaxRetries; attempt++)
    {
      try
      {
        using var request = new HttpRequestMessage(
            HttpMethod.Post, "https://api.groq.com/openai/v1/chat/completions");
        request.Headers.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _apiKey);

        var body = new
        {
          model           = "llama-3.3-70b-versatile",
          messages        = new[]
          {
            new { role = "system", content = systemPrompt.Trim() },
            new { role = "user",   content = userPrompt.Trim() }
          },
          temperature     = 0.35,   // Low temperature → deterministic output
          max_tokens      = 2500,
          response_format = new { type = "json_object" }
        };

        request.Content = JsonContent.Create(body);

        var response = await _http.SendAsync(request);

        if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
        {
          var retryAfter = response.Headers.RetryAfter?.Delta ?? TimeSpan.FromSeconds(BaseDelaySeconds * attempt);
          _logger.LogWarning(
              "[GroqService] Rate limited on attempt {Attempt}/{Max}. Retrying in {Delay}s.",
              attempt, MaxRetries, retryAfter.TotalSeconds);
          await Task.Delay(retryAfter);
          continue;
        }

        if (!response.IsSuccessStatusCode)
        {
          var errorBody = await response.Content.ReadAsStringAsync();
          _logger.LogError(
              "[GroqService] API error {Status} on attempt {Attempt}: {Body}",
              (int)response.StatusCode, attempt, errorBody[..Math.Min(300, errorBody.Length)]);

          if (attempt < MaxRetries)
          {
            await Task.Delay(TimeSpan.FromSeconds(BaseDelaySeconds * attempt));
            continue;
          }
          return BuildFallbackAnalysis(input);
        }

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var raw  = json.GetProperty("choices")[0]
                       .GetProperty("message")
                       .GetProperty("content").GetString() ?? "{}";

        _logger.LogInformation(
            "[GroqService] Analysis completed for user {UserId} (attempt {Attempt}). " +
            "Response length: {Len} chars.",
            input.UserId, attempt, raw.Length);

        // Substitute the name locally; JSON-escape it because raw is a JSON document.
        raw = raw.Replace(NamePlaceholder,
            JsonEncodedText.Encode(input.ChildName, System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping).ToString());

        var parsed = JsonSerializer.Deserialize<NeuroprofileAnalysisDto>(raw,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        if (parsed == null)
        {
          _logger.LogWarning("[GroqService] Deserialization returned null — using fallback.");
          return BuildFallbackAnalysis(input);
        }

        // Attach computed fields that AI doesn't generate
        parsed.ChildName       = input.ChildName;
        parsed.StyleBreakdown  = BuildStyleBreakdown(input, styleCorrect);
        parsed.GameStats       = BuildGameAnalytics(input.GameStats);
        parsed.LongitudinalTrend = input.LongitudinalTrend;
        parsed.ParentProfile   = BuildParentProfile(input, parentSectionCounts);
        if (parsed.SuggestedLevel == 0) parsed.SuggestedLevel = input.ChildSuggestedLevel;
        if (parsed.OverallScore == 0)   parsed.OverallScore   = ComputeOverallScore(input, styleCorrect);

        return parsed;
      }
      catch (TaskCanceledException)
      {
        _logger.LogWarning("[GroqService] Request timeout on attempt {Attempt}/{Max}.", attempt, MaxRetries);
        if (attempt < MaxRetries) await Task.Delay(TimeSpan.FromSeconds(BaseDelaySeconds * attempt));
      }
      catch (Exception ex)
      {
        _logger.LogError(ex, "[GroqService] Unexpected exception on attempt {Attempt}/{Max}.", attempt, MaxRetries);
        if (attempt < MaxRetries) await Task.Delay(TimeSpan.FromSeconds(BaseDelaySeconds * attempt));
      }
    }

    _logger.LogError("[GroqService] All {Max} attempts failed — returning fallback analysis.", MaxRetries);
    return BuildFallbackAnalysis(input);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /// <summary>
  /// Composite score: 60 % quiz accuracy (weighted by style performance) +
  /// 30 % game accuracy + 10 % engagement (session count signal).
  /// </summary>
  private static int ComputeOverallScore(
      NeuroprofileInputData input, Dictionary<string, QuizStyleStat> styleCorrect)
  {
    double totalCorrect = styleCorrect.Values.Sum(v => v.Correct);
    double totalItems   = styleCorrect.Values.Sum(v => v.Total);
    double quizAcc      = totalItems > 0 ? totalCorrect / totalItems : 0;

    double gameAcc = input.GameStats.Count > 0
        ? input.GameStats.Average(g => g.AvgAccuracy / 100.0) : 0;

    int sessions    = input.GameStats.Sum(g => g.TimesPlayed);
    double engage   = Math.Min(sessions / 20.0, 1.0); // 20+ sessions = full engagement

    return (int)Math.Round((quizAcc * 0.6 + gameAcc * 0.3 + engage * 0.1) * 100);
  }

  private static List<StylePerformance> BuildStyleBreakdown(
      NeuroprofileInputData input,
      Dictionary<string, QuizStyleStat> styleCorrect)
  {
    var styles = new[] { "visual", "auditivo", "kinestesico", "lectoescritura" };
    return styles.Select(style =>
    {
      styleCorrect.TryGetValue(style, out var quiz);
      var game = input.GameStats.FirstOrDefault(g =>
              g.Style.Contains(style, StringComparison.OrdinalIgnoreCase));

      double quizAcc = quiz != null && quiz.Total > 0
              ? Math.Round((double)quiz.Correct / quiz.Total * 100, 1) : 0;

      return new StylePerformance
      {
        Style        = style,
        QuizAccuracy = quizAcc,
        GameAccuracy = game?.AvgAccuracy ?? 0,
        GamesPlayed  = game?.TimesPlayed ?? 0,
        AvgResponseMs = quiz?.AvgTime ?? 0,
        Level        = input.ChildSuggestedLevel
      };
    }).ToList();
  }

  private static List<GameAnalytic> BuildGameAnalytics(List<GameStatSummary> stats)
      => stats.Select(s => new GameAnalytic
      {
        Style       = s.Style,
        GameId      = s.GameId,
        TimesPlayed = s.TimesPlayed,
        BestScore   = s.BestScore,
        AvgAccuracy = s.AvgAccuracy,
        Trend       = s.Trend
      }).ToList();

  private static ParentInsights BuildParentProfile(
      NeuroprofileInputData input,
      Dictionary<string, int> sectionCounts)
  {
    var dominantSection = sectionCounts.OrderByDescending(kv => kv.Value)
                                       .FirstOrDefault().Key ?? "";
    return new ParentInsights
    {
      CommunicationStyle  = dominantSection,
      CommunicationScore  = input.CommunicationScore,
      LearningStyleMatch  = input.ParentPerceivedStyle,
      ParentQuizCompleted = input.ParentQuizCompleted,
      KeyObservations     = input.ParentResponses
            .Where(r => r.Answer?.Length > 3)
            .Take(3)
            .Select(r => $"{r.Section}: {r.Answer}")
            .ToList()
    };
  }

  private static NeuroprofileAnalysisDto BuildFallbackAnalysis(NeuroprofileInputData input)
  {
    var style = string.IsNullOrEmpty(input.ChildDominantStyle) ? "visual" : input.ChildDominantStyle;
    return new()
    {
      ChildName      = input.ChildName,
      DominantStyle  = style,
      SuggestedLevel = input.ChildSuggestedLevel,
      OverallScore   = 0,
      BlueBotSummary =
          $"{input.ChildName} está dando sus primeros pasos en su aventura de aprendizaje. " +
          "Con más sesiones de práctica, BlueBot podrá generar un análisis detallado y personalizado " +
          "de su estilo único. ¡Cada actividad completada nos acerca más a entender su perfil!",
      Strengths = new()
      {
        "Disposición activa para aprender y explorar nuevas actividades",
        "Participación consistente en la plataforma"
      },
      Challenges = new()
      {
        "Completa al menos 3 sesiones por estilo de aprendizaje para identificar áreas de oportunidad específicas"
      },
      Roadmap = new()
      {
        new() { Week=1, Title="Exploración inicial",        Description="Familiarízate con todos los tipos de actividades disponibles",           Style=style,        Difficulty="easy"   },
        new() { Week=2, Title="Refuerzo del estilo dominante", Description="Enfócate en actividades de tu estilo de aprendizaje más fuerte",       Style=style,        Difficulty="medium" },
        new() { Week=3, Title="Desafío progresivo",         Description="Incrementa la dificultad gradualmente con ejercicios de nivel 2",        Style=style,        Difficulty="medium" },
        new() { Week=4, Title="Evaluación y ajuste",        Description="Repasa lo aprendido y prepárate para desafíos del siguiente ciclo",      Style="multimodal", Difficulty="hard"   }
      },
      ParentTips = new()
      {
        "Practica con tu hijo 15–20 minutos al día para mejores resultados de aprendizaje",
        "Celebra cada logro por pequeño que sea — el refuerzo positivo ayuda a sostener la motivación",
        "Si notas frustración frecuente con alguna actividad, baja el nivel o haz pausas; si tienes dudas sobre su aprendizaje, conversa con su docente o con un profesional de confianza"
      },
      GameRecommendations = new()
      {
        "Comienza por los juegos de nivel 1 del estilo dominante para construir confianza",
        "Alterna entre estilos para estimular diferentes redes neuronales",
        "Integra pausas activas de 2–3 minutos entre actividades para optimizar la consolidación de memoria"
      }
    };
  }
}

internal static class StringEx
{
  internal static bool IsNullOrEmpty(this string? s) => string.IsNullOrEmpty(s);
}
