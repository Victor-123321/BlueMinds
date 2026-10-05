// Shared/DTOs/ParentQuizDtos.cs

namespace NeuroBlueMinds.Shared.DTOs;

public class SaveParentResponseDto
{
  public int QuestionIndex { get; set; }
  public string Section { get; set; } = string.Empty;
  public string Answer { get; set; } = string.Empty;   // "A", "B", "C", "D"
}

public class CompleteParentQuizRequest
{
  public int CommunicationScore { get; set; }
  public string? LearningStyle { get; set; }
}

public class ParentQuizProgressDto
{
  public int CurrentQuestionIndex { get; set; }
  public bool IsCompleted { get; set; }
}

public class ParentQuizCompleteRequestDto
{
  public string[] Answers { get; set; } = Array.Empty<string>();   // exactamente 19 respuestas
}

public class ParentQuizAnalysisDto
{
  public LearningStyleDto LearningStyle { get; set; } = null!;
  public CommunicationDto Communication { get; set; } = null!;
  public string[] Recommendations { get; set; } = Array.Empty<string>();
}

public class LearningStyleDto
{
  public string Name { get; set; } = string.Empty;          // ej: "👁️ Visual"
  public Dictionary<string, int> Distribution { get; set; } = new();
  public string? AiInsight { get; set; }
}

public class CommunicationDto
{
  public int Score { get; set; }
  public string Level { get; set; } = string.Empty;
  public string Description { get; set; } = string.Empty;
}

public class ParentQuizCompleteResponseDto
{
  public string Message { get; set; } = string.Empty;
  public ParentQuizAnalysisDto Analysis { get; set; } = null!;
  public long? SessionId { get; set; }
}

public class ParentQuizSessionSummaryDto
{
  public long Id { get; set; }
  public int? CommunicationScore { get; set; }
  public string? LearningStyle { get; set; }
  public bool IsCompleted { get; set; }
  public DateTime CreatedAt { get; set; }
  public DateTime UpdatedAt { get; set; }
}

public class ParentQuizLastCompletedDto
{
  public ParentQuizAnalysisDto Analysis { get; set; } = null!;
  public DateTime CreatedAt { get; set; }
}
