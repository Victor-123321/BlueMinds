// NeuroBlueMinds.Shared/DTOs/FamilyDtos.cs — COMPLETE FILE

namespace NeuroBlueMinds.Shared.DTOs;

public class ChildProfileDto
{
    public int      Id             { get; set; }
    public int      ChildUserId    { get; set; }   // the child's User.Id
    public string   Name           { get; set; } = "";
    public string   Avatar         { get; set; } = "🦕";
    public DateOnly? Birth         { get; set; }
    public string?  DominantStyle  { get; set; }
    public int      SuggestedLevel { get; set; } = 1;
    public int      Age            => Birth.HasValue
        ? (int)((DateTime.Today - Birth.Value.ToDateTime(TimeOnly.MinValue)).TotalDays / 365.25)
        : 0;
}

public class CreateChildDto
{
    public string    Name   { get; set; } = "";
    public string    Avatar { get; set; } = "🦕";
    public DateOnly? Birth  { get; set; }
}

public class UpdateChildDto
{
    public string?   Name   { get; set; }
    public string?   Avatar { get; set; }
    public DateOnly? Birth  { get; set; }
}

public class SelectChildResponseDto
{
    public int             ChildId    { get; set; }
    public string          ChildToken { get; set; } = "";  // child-scoped JWT
    public ChildProfileDto Child      { get; set; } = null!;
}
