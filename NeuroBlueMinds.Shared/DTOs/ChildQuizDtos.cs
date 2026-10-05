// Shared/DTOs/ChildQuizDtos.cs

namespace NeuroBlueMinds.Shared.DTOs;

public class SaveQuizResponseDto
{
  public long QuizSessionId { get; set; }
  public int QuestionIndex { get; set; }
  public string? QuestionType { get; set; }
  public string LearningStyle { get; set; } = string.Empty;
  public int Nivel { get; set; }
  public object Answer { get; set; } = null!;           // puede ser string, object, etc. (se serializa a jsonb)
  public bool IsCorrect { get; set; }
  public int? ResponseTimeMs { get; set; }
}

public class QuizProgressDto
{
  public long Id { get; set; }
  public int CurrentQuestionIndex { get; set; }
  public bool IsCompleted { get; set; }
}

public class QuizCompleteRequestDto
{
  public object[] Answers { get; set; } = Array.Empty<object>();   // 20 respuestas con { correct, responseTimeMs, learningStyle, nivel, ... }
}

public class QuizCompleteResponseDto
{
  public int Score { get; set; }
  public int TotalTimeSeconds { get; set; }
  public string BestStyle { get; set; } = string.Empty;
  public int SuggestedLevel { get; set; }
  public LearningStatsDto LearningStats { get; set; } = null!;
  public string AiSummary { get; set; } = string.Empty;
  public string[] Recommendations { get; set; } = Array.Empty<string>();
}

public class LearningStatsDto
{
  public StyleStat Visual { get; set; } = new();
  public StyleStat Auditivo { get; set; } = new();
  public StyleStat Kinestesico { get; set; } = new();
  public StyleStat Lectoescritura { get; set; } = new();
}

public class StyleStat
{
  public int Correct { get; set; }
  public int Total { get; set; }
}
