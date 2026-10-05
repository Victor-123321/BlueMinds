// NeuroBlueMinds.Shared/DTOs/AdaptiveDtos.cs — NEW FILE
// Sprint 1: Child State Model and adaptive recommendation DTOs

namespace NeuroBlueMinds.Shared.DTOs;

/// <summary>
/// The Child State Model (CSM) — a per-child snapshot of learning state.
/// Stored as JSONB in child_profiles.adaptive_state.
/// Updated by AdaptiveEngineService after every session.
/// </summary>
public class AdaptiveStateDto
{
    // ── Style profiling ───────────────────────────────────────────────────────
    public string DominantStyle    { get; set; } = "visual";
    public string SecondaryStyle   { get; set; } = "auditivo";
    public string WeakestStyle     { get; set; } = "lectoescritura";

    // Current recommended level per style (1-3)
    public Dictionary<string, int>    CurrentLevel    { get; set; } = new()
    {
        ["visual"] = 1, ["auditivo"] = 1, ["kinestesico"] = 1, ["lectoescritura"] = 1
    };

    // Mastery score 0.0–1.0 per style (accuracy × speed composite)
    public Dictionary<string, double> MasteryScores   { get; set; } = new()
    {
        ["visual"] = 0, ["auditivo"] = 0, ["kinestesico"] = 0, ["lectoescritura"] = 0
    };

    // Average response time in ms per style
    public Dictionary<string, double> AvgResponseTimeMs { get; set; } = new();

    // ── Session patterns ──────────────────────────────────────────────────────
    public string  RecentTrend            { get; set; } = "stable";  // improving|stable|declining
    public int     SessionStreak          { get; set; } = 0;
    public int     TotalSessionMinutes    { get; set; } = 0;
    public int     PreferredSessionLength { get; set; } = 15;  // minutes
    public int     FatigueThreshold       { get; set; } = 10;  // questions before accuracy drops
    public bool    NeedsConfidenceRestore { get; set; } = false;  // poor last session

    // ── Areas needing attention ───────────────────────────────────────────────
    public List<string> StrugglingAreas  { get; set; } = new();
    public List<string> MasteredAreas    { get; set; } = new();

    // ── Metadata ──────────────────────────────────────────────────────────────
    public DateTime LastUpdated      { get; set; } = DateTime.UtcNow;
    public DateTime LastSessionDate  { get; set; } = DateTime.UtcNow;
    public int      TotalSessions    { get; set; } = 0;
}

/// <summary>
/// A ranked activity recommendation from the ADE.
/// </summary>
public class ActivityRecommendationDto
{
    public string GameId          { get; set; } = "";
    public string GameTitle       { get; set; } = "";
    public string Style           { get; set; } = "";
    public int    Level           { get; set; } = 1;
    public string Reason          { get; set; } = "";  // human-readable explanation
    public string ReasonType      { get; set; } = "";  // "strengthen"|"challenge"|"confidence"|"variety"
    public int    EstimatedMinutes { get; set; } = 10;
    public double RelevanceScore  { get; set; } = 0;   // 0–1
    public bool   IsConfidenceGame { get; set; } = false;
}

/// <summary>
/// Response from GET /api/adaptive/next-activities/{childId}
/// </summary>
public class AdaptiveRecommendationsDto
{
    public int                            ChildId         { get; set; }
    public string                         ChildName       { get; set; } = "";
    public AdaptiveStateDto               State           { get; set; } = new();
    public List<ActivityRecommendationDto> Recommendations { get; set; } = new();
    public string                         SessionMessage  { get; set; } = "";
}

/// <summary>
/// Extended game result with adaptive signals.
/// Add these fields to SaveGameResultDto.
/// </summary>
public class AdaptiveGameSignals
{
    public int  HesitationCount { get; set; } = 0;   // times user changed answer
    public bool Abandoned       { get; set; } = false;
    public int? DifficultySelfReport { get; set; }   // 1=easy, 2=ok, 3=hard (optional)
    public int  SessionPositionIndex { get; set; } = 0;  // which game in the session (fatigue tracking)
}
