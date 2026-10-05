// Shared/DTOs/TherapyDtos.cs

namespace NeuroBlueMinds.Shared.DTOs;

public class CreateTherapySessionDto
{
  public int ChildProfileId { get; set; }
  public DateTime SessionDate { get; set; }
  public int DurationMinutes { get; set; }
  public string? Objectives { get; set; }
  public string? Notes { get; set; }
  public string? Outcomes { get; set; }
}

public class UpdateTherapySessionDto
{
  public string? Objectives { get; set; }
  public string? Notes { get; set; }
  public string? Outcomes { get; set; }
  public DateTime? SessionDate { get; set; }
  public int? DurationMinutes { get; set; }
}

public class TherapySessionDto
{
  public int Id { get; set; }
  public int ChildProfileId { get; set; }
  public int? SpecialistUserId { get; set; }
  public DateTime SessionDate { get; set; }
  public int DurationMinutes { get; set; }
  public string? Objectives { get; set; }
  public string? Notes { get; set; }
  public string? Outcomes { get; set; }
  public DateTime CreatedAt { get; set; }
  public DateTime UpdatedAt { get; set; }
  public bool IsDeleted { get; set; } = false;
}
