// NeuroBlueMinds/Endpoints/AdminController.cs
// Admin-only endpoints: list users, impersonate any role, view platform stats.
// Impersonation uses a short-lived JWT with an "impersonating" claim so we
// can always audit who the real admin is.

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NeuroBlueMinds.Data;
using NeuroBlueMinds.Shared.DbModels;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly NeuroBlueMindsDbContext    _db;
    private readonly IConfiguration             _config;
    private readonly ILogger<AdminController>   _logger;

    public AdminController(
        NeuroBlueMindsDbContext db,
        IConfiguration config,
        ILogger<AdminController> logger)
    {
        _db     = db;
        _config = config;
        _logger = logger;
    }

    // ── Guard: every endpoint verifies admin role ─────────────────────────────
    private bool IsAdmin()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        // Also allow impersonating admins to access these endpoints
        return role == "admin";
    }

    // ── LIST ALL USERS ────────────────────────────────────────────────────────
    [HttpGet("users")]
    public async Task<IActionResult> ListUsers([FromQuery] string? role, [FromQuery] string? search)
    {
        if (!IsAdmin()) return Forbid();

        var query = _db.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(role))
            query = query.Where(u => u.Role == role);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(u => u.Name.Contains(search) || u.Email.Contains(search));

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new AdminUserDto
            {
                Id        = u.Id,
                Name      = u.Name,
                Email     = u.Email,
                Role      = u.Role,
                Country   = u.Country,
                CreatedAt = u.CreatedAt,
                Picture   = u.Picture,
            })
            .Take(200)
            .ToListAsync();

        return Ok(users);
    }

    // ── PLATFORM STATS ────────────────────────────────────────────────────────
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        if (!IsAdmin()) return Forbid();

        var totalUsers      = await _db.Users.CountAsync();
        var parents         = await _db.Users.CountAsync(u => u.Role == "parent");
        var children        = await _db.Users.CountAsync(u => u.Role == "child");
        var specialists     = await _db.Users.CountAsync(u => u.Role == "specialist");
        var totalGames      = await _db.GameResults.CountAsync();
        var totalQuizzes    = await _db.QuizSessions.CountAsync(q => q.IsCompleted);
        var totalProfiles   = await _db.ChildProfiles.CountAsync();
        var activeAccesses  = await _db.ProfessionalAccesses.CountAsync(a => a.Status == "active");
        var varkResults     = await _db.VarkResults.CountAsync();

        var last7Days = DateTime.UtcNow.AddDays(-7);
        var newUsers7d = await _db.Users.CountAsync(u => u.CreatedAt >= last7Days);
        var games7d    = await _db.GameResults.CountAsync(g => g.PlayedAt >= last7Days);

        return Ok(new
        {
            totalUsers, parents, children, specialists,
            totalGames, totalQuizzes, totalProfiles,
            activeAccesses, varkResults,
            newUsers7d, games7d,
            generatedAt = DateTime.UtcNow
        });
    }

    // ── IMPERSONATE USER ──────────────────────────────────────────────────────
    // Issues a short-lived (2h) JWT scoped to the target user.
    // The token carries an "impersonating_admin" claim so logs can always
    // trace back to the real admin. The UI shows a banner when impersonating.
    [HttpPost("impersonate/{targetUserId:int}")]
    public async Task<IActionResult> Impersonate(int targetUserId)
    {
        if (!IsAdmin()) return Forbid();

        var adminId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        var target = await _db.Users.FindAsync(targetUserId);
        if (target == null) return NotFound(new { error = "user_not_found" });

        // Build impersonation JWT — same structure as normal JWT but adds admin audit claim
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, target.Id.ToString()),
            new(ClaimTypes.Email,          target.Email),
            new(ClaimTypes.Name,           target.Name ?? ""),
            new(ClaimTypes.Role,           target.Role ?? "child"),
            new("locale",                  target.Locale ?? "es-MX"),
            new("picture",                 target.Picture ?? ""),
            new("impersonating",           "true"),
            new("impersonating_admin",     adminId ?? "unknown"),
            new("impersonating_target",    targetUserId.ToString()),
        };

        if (target.Birth.HasValue)
            claims.Add(new("birth", target.Birth.Value.ToString("yyyy-MM-dd")));
        if (!string.IsNullOrEmpty(target.Country))
            claims.Add(new("country", target.Country));

        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                        _config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key missing")));
        var token = new JwtSecurityToken(
            issuer:             _config["Jwt:Issuer"],
            audience:           _config["Jwt:Audience"],
            claims:             claims,
            expires:            DateTime.UtcNow.AddHours(2),  // short-lived
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        var jwt = new JwtSecurityTokenHandler().WriteToken(token);

        _logger.LogWarning(
            "[Admin] Admin {AdminId} is impersonating user {TargetId} ({Email}, role={Role}).",
            adminId, targetUserId, target.Email, target.Role);

        return Ok(new
        {
            impersonationToken = jwt,
            targetUser = new AdminUserDto
            {
                Id = target.Id, Name = target.Name ?? "", Email = target.Email ?? "",
                Role = target.Role, Country = target.Country,
                CreatedAt = target.CreatedAt, Picture = target.Picture ?? "",
            },
            expiresAt = DateTime.UtcNow.AddHours(2),
            message   = $"Impersonating {target.Name} ({target.Role}). Token expires in 2 hours."
        });
    }

    // ── STOP IMPERSONATING ────────────────────────────────────────────────────
    // Client just deletes the impersonation token and restores admin token.
    // No server call needed — but this endpoint is here for explicit audit logging.
    [HttpPost("stop-impersonation")]
    public IActionResult StopImpersonation()
    {
        var adminId  = User.FindFirst("impersonating_admin")?.Value;
        var targetId = User.FindFirst("impersonating_target")?.Value;
        _logger.LogInformation(
            "[Admin] Admin {AdminId} stopped impersonating user {TargetId}.", adminId, targetId);
        return Ok(new { message = "Impersonation ended." });
    }

    // ── UPDATE USER ROLE ──────────────────────────────────────────────────────
    [HttpPatch("users/{userId:int}/role")]
    public async Task<IActionResult> UpdateRole(int userId, [FromBody] UpdateRoleDto dto)
    {
        if (!IsAdmin()) return Forbid();

        var validRoles = new[] { "child", "parent", "specialist", "admin", "pending" };
        if (!validRoles.Contains(dto.Role))
            return BadRequest(new { error = "invalid_role", validRoles });

        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        user.Role      = dto.Role;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = $"User {userId} role updated to {dto.Role}." });
    }

    // ── GET CHILD PROFILES for a parent (admin view) ──────────────────────────
    [HttpGet("users/{parentId:int}/children")]
    public async Task<IActionResult> GetChildren(int parentId)
    {
        if (!IsAdmin()) return Forbid();

        var children = await _db.ChildProfiles
            .Where(c => c.ParentUserId == parentId)
            .Select(c => new
            {
                c.Id, c.Name, c.Avatar, c.Birth,
                c.DominantStyle, c.SuggestedLevel,
                c.ChildUserId, c.CreatedAt
            })
            .ToListAsync();

        return Ok(children);
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────────
public class AdminUserDto
{
    public int      Id        { get; set; }
    public string   Name      { get; set; } = "";
    public string   Email     { get; set; } = "";
    public string?  Role      { get; set; }
    public string?  Country   { get; set; }
    public string?  Picture   { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UpdateRoleDto
{
    public string Role { get; set; } = "";
}
