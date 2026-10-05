// NeuroBlueMinds.Shared/DTOs/DashboardModels.cs
// COMPLETE REPLACEMENT
// All types now live in NeuroBlueMinds.Shared.DTOs ONLY.
// BlueMinds.Shared no longer re-declares them — callers must update their usings.

namespace NeuroBlueMinds.Shared.DTOs
{
    public class DeepAnalysisResult
    {
        public string DominantStyle  { get; set; } = "indefinido";
        public int    SuggestedLevel { get; set; } = 1;
        public string Reasoning      { get; set; } = "";
        public List<StyleSummary>      AveragesByStyle { get; set; } = new();
        public NeuroprofileAnalysisDto? FullProfile    { get; set; }
    }

    public class StyleSummary
    {
        public string LearningStyle { get; set; } = "";
        public int    GameCount     { get; set; }
        public double AvgAccuracy   { get; set; }
    }

    public class SessionHistory
    {
        public string   Type             { get; set; } = "";   // "Niños" | "Padres"
        public int?     Score            { get; set; }
        public string   BestStyle        { get; set; } = "";
        public int?     SuggestedLevel   { get; set; }
        public int?     TotalTimeSeconds { get; set; }
        public DateTime CreatedAt        { get; set; }
    }

    public class UserSummaryDTO
    {
        public int    GamesPlayed { get; set; }
        public double AvgAccuracy { get; set; }
        public int    BestScore   { get; set; }
        public int    Improvement { get; set; }
        public string AiInsight   { get; set; } = "¡Sigue practicando para obtener un análisis detallado!";
    }
}
