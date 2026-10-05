// Shared/DTOs/GeneralDtos.cs (para endpoints mixtos)

namespace NeuroBlueMinds.Shared.DTOs;

public class LastQuizResultDto
{
  public string Type { get; set; } = string.Empty;   // "Niños" o "Padres"
  public int? Score { get; set; }
  public string? BestStyle { get; set; }
  public int? SuggestedLevel { get; set; }
  public DateTime CreatedAt { get; set; }
}

public class QuizRecommendationsDto
{
  public string Title { get; set; } = string.Empty;
  public string Analysis { get; set; } = string.Empty;
  public string[] Recommendations { get; set; } = Array.Empty<string>();
}
public class DeepAnalysisDto
{
  public string DominantStyle { get; set; } = string.Empty;
  public int SuggestedLevel { get; set; }
  public string Reasoning { get; set; } = string.Empty;
  public NeuroBlueMinds.Shared.DTOs.NeuroprofileAnalysisDto? FullProfile { get; set; }
  public StyleAverageDto[] AveragesByStyle { get; set; } = Array.Empty<StyleAverageDto>();
}

public class StyleAverageDto
{
  public string LearningStyle { get; set; } = string.Empty;
  public double AvgAccuracy { get; set; }
  public int GameCount { get; set; }
}
