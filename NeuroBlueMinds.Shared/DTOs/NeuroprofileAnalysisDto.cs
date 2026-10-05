// NeuroBlueMinds.Shared/DTOs/NeuroprofileAnalysisDto.cs
// Replace DeepAnalysisResult with this richer DTO

namespace NeuroBlueMinds.Shared.DTOs;

/// <summary>
/// Full neuro-profile analysis returned by the AI engine.
/// Combines child quiz, parent quiz, and game data into an actionable roadmap.
/// </summary>
public class NeuroprofileAnalysisDto
{
    // ── Summary ───────────────────────────────────────────────────────────────
    public string ChildName           { get; set; } = "";
    public string DominantStyle       { get; set; } = "indefinido";   // visual|auditivo|kinestesico|lectoescritura
    public string SecondaryStyle      { get; set; } = "";
    public int    SuggestedLevel      { get; set; } = 1;
    public int    OverallScore        { get; set; } = 0;              // 0–100
    public string ProgressTrend       { get; set; } = "stable";      // improving|stable|needs_attention

    // ── Per-style performance (from child quiz + games) ───────────────────────
    public List<StylePerformance> StyleBreakdown { get; set; } = new();

    // ── Parent quiz insights ──────────────────────────────────────────────────
    public ParentInsights ParentProfile { get; set; } = new();

    // ── Game analytics ────────────────────────────────────────────────────────
    public List<GameAnalytic> GameStats { get; set; } = new();

    // ── Longitudinal trend (last N sessions) ─────────────────────────────────
    public List<TrendPoint> LongitudinalTrend { get; set; } = new();

    // ── AI-generated roadmap ──────────────────────────────────────────────────
    public string  BlueBotSummary     { get; set; } = "";    // 3–4 sentence overall narrative
    public List<RoadmapMilestone> Roadmap        { get; set; } = new();
    public List<string>           Strengths      { get; set; } = new();
    public List<string>           Challenges     { get; set; } = new();
    public List<WeeklyActivity>   WeeklyPlan     { get; set; } = new();
    public List<string>           ParentTips     { get; set; } = new();
    public List<string>           GameRecommendations { get; set; } = new();
}

public class StylePerformance
{
    public string Style         { get; set; } = "";
    public double QuizAccuracy  { get; set; } = 0;   // % correct in quiz (0–100)
    public double GameAccuracy  { get; set; } = 0;   // avg accuracy in games (0–100)
    public int    GamesPlayed   { get; set; } = 0;
    public double AvgResponseMs { get; set; } = 0;   // avg response time in quiz
    public int    Level         { get; set; } = 1;   // 1–3
}

public class ParentInsights
{
    public string CommunicationStyle   { get; set; } = "";   // dominant section from parent quiz
    public int    CommunicationScore   { get; set; } = 0;
    public string LearningStyleMatch   { get; set; } = "";   // parent's perception of child's style
    public bool   ParentQuizCompleted  { get; set; } = false;
    public List<string> KeyObservations { get; set; } = new();
}

public class GameAnalytic
{
    public string Style        { get; set; } = "";
    public string GameId       { get; set; } = "";
    public int    TimesPlayed  { get; set; } = 0;
    public int    BestScore    { get; set; } = 0;
    public double AvgAccuracy  { get; set; } = 0;
    public string Trend        { get; set; } = "stable";   // improving|stable|declining
}

public class TrendPoint
{
    public DateTime Date       { get; set; }
    public double   Score      { get; set; }
    public string   Style      { get; set; } = "";
    public string   Source     { get; set; } = "";   // "quiz"|"game"
}

public class RoadmapMilestone
{
    public int    Week        { get; set; }           // 1–4 (month roadmap)
    public string Title       { get; set; } = "";
    public string Description { get; set; } = "";
    public string Style       { get; set; } = "";
    public string Difficulty  { get; set; } = "";     // easy|medium|hard
    public bool   Completed   { get; set; } = false;
}

public class WeeklyActivity
{
    public string Day         { get; set; } = "";     // Lunes|Martes|...
    public string Activity    { get; set; } = "";
    public string Style       { get; set; } = "";
    public int    DurationMin { get; set; } = 15;
}
