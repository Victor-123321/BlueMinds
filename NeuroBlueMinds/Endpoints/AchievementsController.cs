// NeuroBlueMinds/Endpoints/AchievementsController.cs
// Manages achievement badges for child profiles.
// GET  /api/achievements/{childProfileId}       — list all badges
// POST /api/achievements/{childProfileId}/evaluate — trigger evaluation + award
// DELETE /api/achievements/{id}                 — admin remove badge

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NeuroBlueMinds.Data;
using NeuroBlueMinds.Server.Services;
using NeuroBlueMinds.Shared.DbModels;
using System.Security.Claims;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AchievementsController : ControllerBase
{
    private readonly NeuroBlueMindsDbContext  _db;
    private readonly DashboardService         _dashboard;
    private readonly ILogger<AchievementsController> _logger;

    public AchievementsController(
        NeuroBlueMindsDbContext db,
        DashboardService dashboard,
        ILogger<AchievementsController> logger)
    {
        _db        = db;
        _dashboard = dashboard;
        _logger    = logger;
    }

    // ── GET badges for a child profile ───────────────────────────────────────
    // Accessible by: the child themselves, their parent, a specialist with access, or admin.
    [HttpGet("{childProfileId:int}")]
    public async Task<IActionResult> GetBadges(int childProfileId)
    {
        if (!await CanAccessProfile(childProfileId)) return Forbid();

        var badges = await _dashboard.GetBadgesAsync(childProfileId);
        return Ok(badges.Select(b => new
        {
            b.Id,
            b.BadgeType,
            b.Title,
            b.Emoji,
            b.Description,
            b.XpAwarded,
            b.EarnedAt,
        }));
    }

    // ── POST evaluate & award new badges ─────────────────────────────────────
    // Called automatically after game/quiz completions via server events.
    // Can also be triggered manually by the child or parent.
    [HttpPost("{childProfileId:int}/evaluate")]
    public async Task<IActionResult> EvaluateBadges(int childProfileId)
    {
        if (!await CanAccessProfile(childProfileId)) return Forbid();

        var newBadges = await _dashboard.EvaluateAndAwardBadgesAsync(childProfileId);

        return Ok(new
        {
            newBadgesCount = newBadges.Count,
            newBadges = newBadges.Select(b => new
            {
                b.BadgeType,
                b.Title,
                b.Emoji,
                b.Description,
                b.XpAwarded,
            })
        });
    }

    // ── DELETE badge (admin only) ─────────────────────────────────────────────
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteBadge(int id)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "admin") return Forbid();

        var badge = await _db.AchievementBadges.FindAsync(id);
        if (badge == null) return NotFound();

        _db.AchievementBadges.Remove(badge);
        await _db.SaveChangesAsync();
        return Ok(new { message = $"Badge {id} deleted." });
    }

    // ── Access control helper ─────────────────────────────────────────────────
    private async Task<bool> CanAccessProfile(int childProfileId)
    {
        var userId = int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : 0;
        var role   = User.FindFirst(ClaimTypes.Role)?.Value;

        if (role == "admin") return true;

        var profile = await _db.ChildProfiles.FindAsync(childProfileId);
        if (profile == null) return false;

        // Child accessing their own profile (ChildUserId matches)
        if (role == "child" && profile.ChildUserId == userId) return true;

        // Parent accessing their child's profile
        if (role == "parent" && profile.ParentUserId == userId) return true;

        // Specialist with active access
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
