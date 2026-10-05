// NeuroBlueMinds/Endpoints/PiiController.cs
// Individual Intervention Plans (Plan de Intervención Individualizada)
// GET    /api/pii/{childProfileId}          — list all goals
// POST   /api/pii/{childProfileId}          — create goal
// PATCH  /api/pii/{goalId}                  — update goal (status, target date, description)
// DELETE /api/pii/{goalId}                  — delete goal (specialist or admin only)

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NeuroBlueMinds.Data;
using NeuroBlueMinds.Shared.DbModels;
using System.Security.Claims;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PiiController : ControllerBase
{
    private readonly NeuroBlueMindsDbContext _db;
    private readonly ILogger<PiiController>  _logger;

    public PiiController(NeuroBlueMindsDbContext db, ILogger<PiiController> logger)
    {
        _db     = db;
        _logger = logger;
    }

    // ── LIST goals for a child ────────────────────────────────────────────────
    [HttpGet("{childProfileId:int}")]
    public async Task<IActionResult> GetGoals(int childProfileId)
    {
        if (!await CanAccessProfile(childProfileId, writeAccess: false)) return Forbid();

        var goals = await _db.IndividualInterventionPlans
            .Where(p => p.ChildProfileId == childProfileId)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new PiiGoalDto
            {
                Id              = p.Id,
                ChildProfileId  = p.ChildProfileId,
                SpecialistUserId= p.SpecialistUserId,
                GoalTitle       = p.GoalTitle,
                GoalDescription = p.GoalDescription,
                Category        = p.Category,
                Status          = p.Status,
                TargetDate      = p.TargetDate,
                AchievedAt      = p.AchievedAt,
                CreatedAt       = p.CreatedAt,
                UpdatedAt       = p.UpdatedAt,
            })
            .ToListAsync();

        return Ok(goals);
    }

    // ── CREATE goal ───────────────────────────────────────────────────────────
    [HttpPost("{childProfileId:int}")]
    public async Task<IActionResult> CreateGoal(int childProfileId, [FromBody] CreatePiiGoalDto dto)
    {
        if (!await CanAccessProfile(childProfileId, writeAccess: true)) return Forbid();

        var userId = int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : (int?)null;
        var role   = User.FindFirst(ClaimTypes.Role)?.Value;

        var goal = new IndividualInterventionPlan
        {
            ChildProfileId   = childProfileId,
            SpecialistUserId = (role == "specialist" || role == "admin") ? userId : null,
            GoalTitle        = dto.GoalTitle,
            GoalDescription  = dto.GoalDescription,
            Category         = dto.Category,
            Status           = "active",
            TargetDate       = dto.TargetDate,
            CreatedAt        = DateTime.UtcNow,
            UpdatedAt        = DateTime.UtcNow,
        };

        _db.IndividualInterventionPlans.Add(goal);
        await _db.SaveChangesAsync();

        _logger.LogInformation("[PII] Goal created for child {ChildProfileId} by user {UserId}: '{Title}'",
            childProfileId, userId, dto.GoalTitle);

        return CreatedAtAction(nameof(GetGoals), new { childProfileId }, new { goal.Id, goal.GoalTitle });
    }

    // ── UPDATE goal ───────────────────────────────────────────────────────────
    [HttpPatch("{goalId:int}")]
    public async Task<IActionResult> UpdateGoal(int goalId, [FromBody] UpdatePiiGoalDto dto)
    {
        var goal = await _db.IndividualInterventionPlans.FindAsync(goalId);
        if (goal == null) return NotFound();

        if (!await CanAccessProfile(goal.ChildProfileId, writeAccess: true)) return Forbid();

        var validStatuses = new[] { "active", "achieved", "paused", "cancelled" };
        if (!string.IsNullOrEmpty(dto.Status) && !validStatuses.Contains(dto.Status))
            return BadRequest(new { error = "invalid_status", validStatuses });

        if (!string.IsNullOrEmpty(dto.GoalTitle))       goal.GoalTitle       = dto.GoalTitle;
        if (dto.GoalDescription != null)                goal.GoalDescription = dto.GoalDescription;
        if (!string.IsNullOrEmpty(dto.Category))        goal.Category        = dto.Category;
        if (!string.IsNullOrEmpty(dto.Status))
        {
            goal.Status = dto.Status;
            if (dto.Status == "achieved" && !goal.AchievedAt.HasValue)
                goal.AchievedAt = DateTime.UtcNow;
        }
        if (dto.TargetDate.HasValue) goal.TargetDate = dto.TargetDate;
        goal.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Goal updated.", goalId });
    }

    // ── DELETE goal ───────────────────────────────────────────────────────────
    [HttpDelete("{goalId:int}")]
    public async Task<IActionResult> DeleteGoal(int goalId)
    {
        var goal = await _db.IndividualInterventionPlans.FindAsync(goalId);
        if (goal == null) return NotFound();

        if (!await CanAccessProfile(goal.ChildProfileId, writeAccess: true)) return Forbid();

        _db.IndividualInterventionPlans.Remove(goal);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Goal deleted." });
    }

    // ── Access control ────────────────────────────────────────────────────────
    private async Task<bool> CanAccessProfile(int childProfileId, bool writeAccess)
    {
        var userId = int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : 0;
        var role   = User.FindFirst(ClaimTypes.Role)?.Value;

        if (role == "admin") return true;

        var profile = await _db.ChildProfiles.FindAsync(childProfileId);
        if (profile == null) return false;

        // Parents can read; specialists can read+write
        if (!writeAccess && role == "parent" && profile.ParentUserId == userId) return true;

        if (role == "specialist")
        {
            return await _db.ProfessionalAccesses.AnyAsync(a =>
                a.ChildProfileId == childProfileId &&
                a.SpecialistUserId == userId &&
                a.Status == "active");
        }

        return false;
    }
}

// ── DTOs ─────────────────────────────────────────────────────────────────────
public class PiiGoalDto
{
    public int       Id               { get; set; }
    public int       ChildProfileId   { get; set; }
    public int?      SpecialistUserId { get; set; }
    public string    GoalTitle        { get; set; } = "";
    public string?   GoalDescription  { get; set; }
    public string?   Category         { get; set; }
    public string    Status           { get; set; } = "active";
    public DateTime? TargetDate       { get; set; }
    public DateTime? AchievedAt       { get; set; }
    public DateTime  CreatedAt        { get; set; }
    public DateTime  UpdatedAt        { get; set; }
}

public class CreatePiiGoalDto
{
    public string    GoalTitle        { get; set; } = "";
    public string?   GoalDescription  { get; set; }
    public string?   Category         { get; set; }
    public DateTime? TargetDate       { get; set; }
}

public class UpdatePiiGoalDto
{
    public string?   GoalTitle        { get; set; }
    public string?   GoalDescription  { get; set; }
    public string?   Category         { get; set; }
    public string?   Status           { get; set; }
    public DateTime? TargetDate       { get; set; }
}
