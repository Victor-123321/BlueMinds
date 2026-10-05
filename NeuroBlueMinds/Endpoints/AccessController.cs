// NeuroBlueMinds/Endpoints/AccessController.cs
// Professional access management: parent invites specialist, specialist accepts,
// parent revokes. Also: specialist gets their patient list.

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
public class AccessController : ControllerBase
{
    private readonly NeuroBlueMindsDbContext _db;
    private readonly IConfiguration         _config;
    private readonly IEmailService           _email;
    private readonly ILogger<AccessController> _logger;

    public AccessController(
        NeuroBlueMindsDbContext db,
        IConfiguration config,
        IEmailService email,
        ILogger<AccessController> logger)
    {
        _db     = db;
        _config = config;
        _email  = email;
        _logger = logger;
    }

    // ── LIST: parent sees all access grants for their children ────────────────
    [HttpGet("my-grants")]
    public async Task<IActionResult> GetMyGrants()
    {
        var parentId = GetUserId();
        if (parentId == null) return Unauthorized();

        var grants = await _db.ProfessionalAccesses
            .Include(g => g.ChildProfile)
            .Include(g => g.Specialist)
            .Where(g => g.ParentUserId == parentId.Value)
            .OrderByDescending(g => g.CreatedAt)
            .Select(g => new AccessGrantDto
            {
                Id              = g.Id,
                ChildProfileId  = g.ChildProfileId,
                ChildName       = g.ChildProfile.Name,
                SpecialistEmail = g.SpecialistEmail,
                SpecialistName  = g.SpecialistName ?? g.Specialist!.Name,
                Status          = g.Status,
                AccessLevel     = g.AccessLevel,
                CreatedAt       = g.CreatedAt,
                AcceptedAt      = g.AcceptedAt,
            })
            .ToListAsync();

        return Ok(grants);
    }

    // ── INVITE: parent invites a specialist to see a child ────────────────────
    [HttpPost("invite")]
    public async Task<IActionResult> InviteSpecialist([FromBody] InviteSpecialistDto dto)
    {
        var parentId = GetUserId();
        if (parentId == null) return Unauthorized();

        // Verify parent owns this child profile
        var childProfile = await _db.ChildProfiles
            .Include(c => c.Parent)
            .FirstOrDefaultAsync(c => c.Id == dto.ChildProfileId && c.ParentUserId == parentId.Value);

        if (childProfile == null)
            return BadRequest(new { error = "child_not_found", message = "Child profile not found or not yours." });

        // Check for existing active/pending invite to same email
        var existing = await _db.ProfessionalAccesses
            .FirstOrDefaultAsync(a =>
                a.ChildProfileId == dto.ChildProfileId &&
                a.SpecialistEmail.ToLower() == dto.SpecialistEmail.ToLower() &&
                (a.Status == "pending" || a.Status == "active"));

        if (existing != null)
            return BadRequest(new { error = "already_invited", message = "This specialist already has access or a pending invite." });

        // Check if specialist already exists in system
        var specialist = await _db.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == dto.SpecialistEmail.ToLower()
                                   && u.Role == "specialist");

        var token     = Guid.NewGuid().ToString("N");
        var expiresAt = DateTime.UtcNow.AddDays(7);

        var access = new ProfessionalAccess
        {
            ChildProfileId  = dto.ChildProfileId,
            ParentUserId    = parentId.Value,
            SpecialistUserId = specialist?.Id,
            SpecialistEmail = dto.SpecialistEmail.Trim().ToLower(),
            SpecialistName  = dto.SpecialistName?.Trim(),
            Status          = specialist != null ? "pending" : "pending",
            AccessLevel     = dto.AccessLevel ?? "full",
            InviteToken     = token,
            InviteExpiresAt = expiresAt,
            CreatedAt       = DateTime.UtcNow,
            UpdatedAt       = DateTime.UtcNow,
        };

        _db.ProfessionalAccesses.Add(access);
        await _db.SaveChangesAsync();

        // Build accept URL
        var baseUrl   = _config["App:BaseUrl"]
            ?? throw new InvalidOperationException(
                "App:BaseUrl is not configured. Set it in web.config <environmentVariables>.");
        var acceptUrl = $"{baseUrl}/accept-invite?token={token}";

        // Send branded invitation email
        await _email.SendSpecialistInviteAsync(
            toEmail    : dto.SpecialistEmail.Trim(),
            toName     : dto.SpecialistName?.Trim() ?? "",
            parentName : childProfile.Parent.Name,
            childName  : childProfile.Name,
            acceptUrl  : acceptUrl,
            expiresAt  : expiresAt);

        _logger.LogInformation(
            "[AccessController] Specialist invite created for {Email}, child profile {ChildId}.",
            dto.SpecialistEmail, dto.ChildProfileId);

        return Ok(new
        {
            message          = "Invitation sent.",
            accessId         = access.Id,
            expiresAt,
            specialistExists = specialist != null
        });
    }

    // ── ACCEPT: specialist accepts via token (from email link) ────────────────
    [HttpPost("accept/{token}")]
    public async Task<IActionResult> AcceptInvite(string token)
    {
        var specialistId = GetUserId();
        if (specialistId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(new { error = "invalid_token", message = "Token is required." });

        var access = await _db.ProfessionalAccesses
            .Include(a => a.ChildProfile)
            .FirstOrDefaultAsync(a => a.InviteToken == token);

        if (access == null)
            return BadRequest(new { error = "invite_expired", message = "Este enlace de invitación ha expirado o ya fue usado." });

        if (access.Status == "revoked")
            return BadRequest(new { error = "revoked", message = "This invitation has been revoked." });

        if (access.Status == "active")
            return Ok(new { message = "Already accepted.", childProfileId = access.ChildProfileId });

        if (!access.InviteExpiresAt.HasValue)
            return BadRequest(new { error = "invite_expired", message = "Este enlace de invitación ha expirado o ya fue usado." });

        if (access.InviteExpiresAt.Value < DateTime.UtcNow)
            return BadRequest(new { error = "invite_expired", message = "Este enlace de invitación ha expirado o ya fue usado." });

        // Verify the accepting user is a specialist
        var specialist = await _db.Users.FindAsync(specialistId.Value);
        if (specialist == null || specialist.Role != "specialist")
            return BadRequest(new { error = "not_specialist", message = "Only specialists can accept invitations." });

        // Verify email matches if specialist already existed
        if (access.SpecialistUserId.HasValue && access.SpecialistUserId != specialistId)
            return BadRequest(new { error = "email_mismatch", message = "This invitation was sent to a different email." });

        access.SpecialistUserId = specialistId.Value;
        access.Status           = "active";
        access.AcceptedAt       = DateTime.UtcNow;
        access.UpdatedAt        = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message         = "Access granted.",
            childProfileId  = access.ChildProfileId,
            childName       = access.ChildProfile.Name,
            accessLevel     = access.AccessLevel
        });
    }

    // ── REVOKE: parent revokes a specialist's access ──────────────────────────
    [HttpDelete("{accessId:int}")]
    public async Task<IActionResult> RevokeAccess(int accessId)
    {
        var parentId = GetUserId();
        if (parentId == null) return Unauthorized();

        var access = await _db.ProfessionalAccesses
            .FirstOrDefaultAsync(a => a.Id == accessId && a.ParentUserId == parentId.Value);

        if (access == null)
            return NotFound(new { error = "not_found" });

        access.Status    = "revoked";
        access.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Access revoked." });
    }

    // ── SPECIALIST: get all patients (children they have access to) ───────────
    // Bug B fix: this is the missing endpoint the SpecialistDashboard needs
    [HttpGet("my-patients")]
    public async Task<IActionResult> GetMyPatients()
    {
        var specialistId = GetUserId();
        if (specialistId == null) return Unauthorized();

        var patients = await _db.ProfessionalAccesses
            .Include(a => a.ChildProfile)
                .ThenInclude(cp => cp.ChildUser)
            .Include(a => a.ChildProfile)
                .ThenInclude(cp => cp.Parent)
            .Where(a => a.SpecialistUserId == specialistId.Value && a.Status == "active")
            .OrderBy(a => a.ChildProfile.Name)
            .Select(a => new PatientSummaryDto
            {
                AccessId        = a.Id,
                ChildProfileId  = a.ChildProfileId,
                ChildUserId     = a.ChildProfile.ChildUserId,
                Name            = a.ChildProfile.Name,
                Avatar          = a.ChildProfile.Avatar ?? "🦕",
                DominantStyle   = a.ChildProfile.DominantStyle,
                SuggestedLevel  = a.ChildProfile.SuggestedLevel,
                ParentName      = a.ChildProfile.Parent.Name,
                AccessLevel     = a.AccessLevel,
                AgeYears        = a.ChildProfile.Birth.HasValue
                    ? (int)((DateTime.UtcNow - a.ChildProfile.Birth.Value.ToDateTime(TimeOnly.MinValue)).TotalDays / 365.25)
                    : null
            })
            .ToListAsync();

        return Ok(patients);
    }

    // ── PUBLIC: accept invite page (no auth needed — link from email) ─────────
    // Returns info about the invite so the UI can show context before accepting
    [HttpGet("invite-info/{token}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetInviteInfo(string token)
    {
        var access = await _db.ProfessionalAccesses
            .Include(a => a.ChildProfile)
            .Include(a => a.Parent)
            .FirstOrDefaultAsync(a => a.InviteToken == token);

        if (access == null) return NotFound(new { error = "token_not_found" });

        return Ok(new
        {
            valid           = access.Status != "revoked" && access.InviteExpiresAt > DateTime.UtcNow,
            status          = access.Status,
            childName       = access.ChildProfile.Name,
            parentName      = access.Parent.Name,
            specialistEmail = access.SpecialistEmail,
            accessLevel     = access.AccessLevel,
            expiresAt       = access.InviteExpiresAt
        });
    }

    // ── SPECIALIST: aggregate stats + per-patient enrichment ─────────────────
    // Returns sessions-this-week, completed-quizzes count, and per-child
    // progress/trend/lastSession derived from game_results + AdaptiveState JSONB.
    [HttpGet("specialist-stats")]
    public async Task<IActionResult> GetSpecialistStats()
    {
        var specialistId = GetUserId();
        if (specialistId == null) return Unauthorized();

        // 1. Resolve all active patient child-user IDs for this specialist
        var activeAccesses = await _db.ProfessionalAccesses
            .Include(a => a.ChildProfile)
            .Where(a => a.SpecialistUserId == specialistId.Value && a.Status == "active")
            .ToListAsync();

        var childUserIds = activeAccesses
            .Select(a => a.ChildProfile.ChildUserId)
            .Distinct()
            .ToList();

        if (!childUserIds.Any())
        {
            return Ok(new SpecialistStatsDto
            {
                SessionsThisWeek = 0,
                ReportsGenerated = 0,
                PatientStats     = new List<PatientStatDto>()
            });
        }

        // 2. Aggregate: sessions this week (game_results)
        var weekStart = DateTime.UtcNow.Date.AddDays(-(int)DateTime.UtcNow.DayOfWeek + 1); // Monday
        var sessionsThisWeek = await _db.GameResults
            .Where(g => childUserIds.Contains(g.UserId!.Value) && g.PlayedAt >= weekStart)
            .CountAsync();

        // 3. Aggregate: completed quiz sessions (child + parent combined)
        var completedQuizzes = await _db.QuizSessions
            .Where(q => childUserIds.Contains(q.UserId) && q.IsCompleted)
            .CountAsync();

        // 4. Per-patient enrichment
        //    a) Last game played + accuracy stats per child
        var recentGames = await _db.GameResults
            .Where(g => childUserIds.Contains(g.UserId!.Value))
            .GroupBy(g => g.UserId!.Value)
            .Select(g => new
            {
                ChildUserId  = g.Key,
                LastPlayedAt = g.Max(x => x.PlayedAt),
                AvgAccuracy  = g.OrderByDescending(x => x.PlayedAt).Take(10)
                                .Average(x => (double?)x.Accuracy) ?? 0.0
            })
            .ToListAsync();

        var recentGamesMap = recentGames.ToDictionary(x => x.ChildUserId);

        //    b) AdaptiveState JSONB — parse trend + mastery scores
        var patientStats = new List<PatientStatDto>();
        foreach (var access in activeAccesses)
        {
            var cp          = access.ChildProfile;
            var childUserId = cp.ChildUserId;

            // Parse trend + mastery from AdaptiveState JSON (if present)
            string trend    = "stable";
            int    progress = 0;

            if (!string.IsNullOrWhiteSpace(cp.AdaptiveState))
            {
                try
                {
                    var state = System.Text.Json.JsonSerializer.Deserialize<NeuroBlueMinds.Shared.DTOs.AdaptiveStateDto>(
                        cp.AdaptiveState,
                        new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                    if (state != null)
                    {
                        trend = state.RecentTrend ?? "stable";

                        // Average mastery across all 4 styles → percentage
                        if (state.MasteryScores.Any())
                            progress = (int)(state.MasteryScores.Values.Average() * 100);
                    }
                }
                catch { /* malformed JSON — ignore, keep defaults */ }
            }

            // Fall back to average accuracy from recent games if no adaptive state
            if (progress == 0 && recentGamesMap.TryGetValue(childUserId, out var gameStats))
                progress = (int)(gameStats.AvgAccuracy * 100);

            // Format last session as relative time (Spanish)
            string lastSession = "-";
            if (recentGamesMap.TryGetValue(childUserId, out var gs))
            {
                var diff = DateTime.UtcNow - gs.LastPlayedAt;
                lastSession = diff.TotalMinutes < 60   ? "hace menos de 1 hora"
                            : diff.TotalHours   < 24   ? $"hace {(int)diff.TotalHours} hora{((int)diff.TotalHours == 1 ? "" : "s")}"
                            : diff.TotalDays    < 2    ? "ayer"
                            : diff.TotalDays    < 7    ? $"hace {(int)diff.TotalDays} días"
                            : diff.TotalDays    < 30   ? $"hace {(int)(diff.TotalDays / 7)} semana{((int)(diff.TotalDays / 7) == 1 ? "" : "s")}"
                            :                            "hace más de un mes";
            }

            patientStats.Add(new PatientStatDto
            {
                ChildUserId  = childUserId,
                Progress     = Math.Clamp(progress, 0, 100),
                Trend        = trend,
                LastSession  = lastSession,
            });
        }

        return Ok(new SpecialistStatsDto
        {
            SessionsThisWeek = sessionsThisWeek,
            ReportsGenerated = completedQuizzes,
            PatientStats     = patientStats
        });
    }

    // ── Helper ────────────────────────────────────────────────────────────────
    private int? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }
}

// ── Stats DTOs ────────────────────────────────────────────────────────────────
public class SpecialistStatsDto
{
    public int                 SessionsThisWeek { get; set; }
    public int                 ReportsGenerated { get; set; }
    public List<PatientStatDto> PatientStats    { get; set; } = new();
}

public class PatientStatDto
{
    public int    ChildUserId  { get; set; }
    public int    Progress     { get; set; }   // 0–100
    public string Trend        { get; set; } = "stable";
    public string LastSession  { get; set; } = "-";
}

// ── DTOs ──────────────────────────────────────────────────────────────────────
public class InviteSpecialistDto
{
    public int     ChildProfileId  { get; set; }
    public string  SpecialistEmail { get; set; } = "";
    public string? SpecialistName  { get; set; }
    public string? AccessLevel     { get; set; } = "full";  // "view" | "full"
}

public class AccessGrantDto
{
    public int       Id              { get; set; }
    public int       ChildProfileId  { get; set; }
    public string    ChildName       { get; set; } = "";
    public string    SpecialistEmail { get; set; } = "";
    public string?   SpecialistName  { get; set; }
    public string    Status          { get; set; } = "";
    public string    AccessLevel     { get; set; } = "";
    public DateTime  CreatedAt       { get; set; }
    public DateTime? AcceptedAt      { get; set; }
}

public class PatientSummaryDto
{
    public int     AccessId       { get; set; }
    public int     ChildProfileId { get; set; }
    public int     ChildUserId    { get; set; }
    public string  Name           { get; set; } = "";
    public string  Avatar         { get; set; } = "🦕";
    public string? DominantStyle  { get; set; }
    public int     SuggestedLevel { get; set; }
    public string  ParentName     { get; set; } = "";
    public string  AccessLevel    { get; set; } = "";
    public int?    AgeYears       { get; set; }
}
