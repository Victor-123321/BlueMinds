// Shared/DTOs/GameDtos.cs

namespace NeuroBlueMinds.Shared.DTOs;

public class GameSummaryDto
{
  public int GamesPlayed { get; set; }
  public int AvgAccuracy { get; set; }
  public int BestScore { get; set; }
  public string Improvement { get; set; } = string.Empty;
  public string AiInsight { get; set; } = string.Empty;
}

public class SaveGameResultDto
{
  public string GameId { get; set; } = string.Empty;
  public string Style { get; set; } = string.Empty;
  public int? Level { get; set; }
  public int Score { get; set; }
  public double? Accuracy { get; set; }
  public int? ResponseTime { get; set; }   // en ms
}

public class GameBestScoreDto
{
  public string GameId { get; set; } = string.Empty;
  public int BestScore { get; set; }
}

public class GameProgressUpdateDto
{
  public int UserId { get; set; }
  public string GameId { get; set; } = string.Empty;
  public string GameTitle { get; set; } = string.Empty;
  public int Score { get; set; }
  public int Level { get; set; }
  public int MaxLevel { get; set; }
  public float CompletionPercentage { get; set; }
  public int TimePlayed { get; set; }   // segundos en esta sesión
}
