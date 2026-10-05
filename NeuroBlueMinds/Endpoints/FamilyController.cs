// NeuroBlueMinds/Endpoints/FamilyController.cs — COMPLETE FILE
// Handles child profile CRUD + child-scoped JWT generation.

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NeuroBlueMinds.Data;
using NeuroBlueMinds.Shared.DbModels;
using NeuroBlueMinds.Shared.DTOs;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FamilyController : ControllerBase
{
    private readonly NeuroBlueMindsDbContext _db;
    private readonly IConfiguration _config;

    public FamilyController(NeuroBlueMindsDbContext db, IConfiguration config)
    {
        _db     = db;
        _config = config;
    }

    // ── List children ─────────────────────────────────────────────────────────
    [HttpGet("children")]
    public async Task<IActionResult> GetChildren()
    {
        var parentId = GetUserId();
        if (parentId == null) return Unauthorized();

        var children = await _db.ChildProfiles
            .Where(c => c.ParentUserId == parentId.Value)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new ChildProfileDto
            {
                Id             = c.Id,
                ChildUserId    = c.ChildUserId,
                Name           = c.Name,
                Avatar         = c.Avatar ?? "🦕",
                Birth          = c.Birth,
                DominantStyle  = c.DominantStyle,
                SuggestedLevel = c.SuggestedLevel
            })
            .ToListAsync();

        return Ok(children);
    }

    // ── Create child (also creates a User row for the child) ──────────────────
    [HttpPost("children")]
    public async Task<IActionResult> CreateChild([FromBody] CreateChildDto dto)
    {
        var parentId = GetUserId();
        if (parentId == null) return Unauthorized();

        var count = await _db.ChildProfiles.CountAsync(c => c.ParentUserId == parentId.Value);
        if (count >= 10) return BadRequest("Máximo 10 perfiles por cuenta.");

        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest("El nombre es requerido.");

        // 1. Create a User row for the child
        //    Email is synthetic — not used for login, just to satisfy the unique constraint
        var parent = await _db.Users.FindAsync(parentId.Value);
        var childEmail = $"child_{parentId}_{DateTime.UtcNow.Ticks}@family.blueminds.internal";

        var childUser = new User
        {
            Name      = dto.Name.Trim(),
            Email     = childEmail,
            Role      = "child",
            Locale    = parent?.Locale ?? "es-MX",
            Birth     = dto.Birth,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.Users.Add(childUser);
        await _db.SaveChangesAsync();   // flush to get childUser.Id

        // 2. Create the ChildProfile linking parent ↔ child user
        var profile = new ChildProfile
        {
            ParentUserId = parentId.Value,
            ChildUserId  = childUser.Id,
            Name         = dto.Name.Trim(),
            Avatar       = dto.Avatar ?? "🦕",
            Birth        = dto.Birth,
            CreatedAt    = DateTime.UtcNow,
            UpdatedAt    = DateTime.UtcNow
        };
        _db.ChildProfiles.Add(profile);
        await _db.SaveChangesAsync();

        return Ok(new ChildProfileDto
        {
            Id             = profile.Id,
            ChildUserId    = childUser.Id,
            Name           = profile.Name,
            Avatar         = profile.Avatar ?? "🦕",
            Birth          = profile.Birth,
            DominantStyle  = null,
            SuggestedLevel = 1
        });
    }

    // ── Select child → returns a child-scoped JWT ─────────────────────────────
    /// <summary>
    /// Called when a parent taps a child card on the family selector screen.
    /// Returns a JWT whose sub is the child's UserId — all subsequent API calls
    /// use this token so game/quiz data is stored against the child, not the parent.
    /// </summary>
    [HttpPost("children/{id}/select")]
    public async Task<IActionResult> SelectChild(int id)
    {
        var parentId = GetUserId();
        if (parentId == null) return Unauthorized();

        var profile = await _db.ChildProfiles
            .Include(c => c.ChildUser)
            .FirstOrDefaultAsync(c => c.Id == id && c.ParentUserId == parentId.Value);

        if (profile == null) return NotFound();

        var childToken = GenerateChildJwt(profile, parentId.Value);

        return Ok(new SelectChildResponseDto
        {
            ChildId    = profile.Id,
            ChildToken = childToken,
            Child      = new ChildProfileDto
            {
                Id             = profile.Id,
                ChildUserId    = profile.ChildUserId,
                Name           = profile.Name,
                Avatar         = profile.Avatar ?? "🦕",
                Birth          = profile.Birth,
                DominantStyle  = profile.DominantStyle,
                SuggestedLevel = profile.SuggestedLevel
            }
        });
    }

    // ── Update child ──────────────────────────────────────────────────────────
    [HttpPatch("children/{id}")]
    public async Task<IActionResult> UpdateChild(int id, [FromBody] UpdateChildDto dto)
    {
        var parentId = GetUserId();
        if (parentId == null) return Unauthorized();

        var profile = await _db.ChildProfiles
            .Include(c => c.ChildUser)
            .FirstOrDefaultAsync(c => c.Id == id && c.ParentUserId == parentId.Value);
        if (profile == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(dto.Name))
        {
            profile.Name         = dto.Name.Trim();
            profile.ChildUser.Name = dto.Name.Trim();
        }
        if (!string.IsNullOrWhiteSpace(dto.Avatar)) profile.Avatar = dto.Avatar;
        if (dto.Birth.HasValue)
        {
            profile.Birth          = dto.Birth;
            profile.ChildUser.Birth = dto.Birth;
        }
        profile.UpdatedAt         = DateTime.UtcNow;
        profile.ChildUser.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new ChildProfileDto
        {
            Id = profile.Id, ChildUserId = profile.ChildUserId,
            Name = profile.Name, Avatar = profile.Avatar ?? "🦕", Birth = profile.Birth,
            DominantStyle = profile.DominantStyle, SuggestedLevel = profile.SuggestedLevel
        });
    }

    // ── Delete child ──────────────────────────────────────────────────────────
    [HttpDelete("children/{id}")]
    public async Task<IActionResult> DeleteChild(int id)
    {
        var parentId = GetUserId();
        if (parentId == null) return Unauthorized();

        var profile = await _db.ChildProfiles
            .FirstOrDefaultAsync(c => c.Id == id && c.ParentUserId == parentId.Value);
        if (profile == null) return NotFound();

        // Cascade deletes the ChildUser row and all their data via FK cascade
        _db.ChildProfiles.Remove(profile);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Perfil eliminado." });
    }

    // ── UPDATE avatar ─────────────────────────────────────────────────────────
    [HttpPatch("children/{id}/avatar")]
    public async Task<IActionResult> UpdateAvatar(int id, [FromBody] UpdateAvatarDto dto)
    {
        var parentId = GetUserId();
        if (parentId == null) return Unauthorized();

        var profile = await _db.ChildProfiles
            .FirstOrDefaultAsync(c => c.Id == id && c.ParentUserId == parentId.Value);
        if (profile == null) return NotFound();

        if (string.IsNullOrWhiteSpace(dto.Avatar))
            return BadRequest(new { error = "avatar_required" });

        profile.Avatar = dto.Avatar;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Avatar actualizado.", avatar = dto.Avatar });
    }

    // ── GET child profile by child's user ID ─────────────────────────────────
    // Used by ChildDashboard to discover its own ChildProfileId for achievements.
    [HttpGet("/api/profiles/by-user/{userId:int}")]
    public async Task<IActionResult> GetProfileByUser(int userId)
    {
        var callerId = GetUserId();
        if (callerId == null) return Unauthorized();

        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        // Child can only look up their own profile
        if (role == "child" && callerId.Value != userId) return Forbid();

        var profile = await _db.ChildProfiles
            .Where(c => c.ChildUserId == userId)
            .Select(c => new { id = c.Id, name = c.Name, avatar = c.Avatar })
            .FirstOrDefaultAsync();

        if (profile == null) return NotFound();
        return Ok(profile);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private string GenerateChildJwt(ChildProfile profile, int parentId)
    {
        var claims = new List<Claim>
        {
            // Sub = child's UserId → all API endpoints work transparently
            new Claim(ClaimTypes.NameIdentifier, profile.ChildUserId.ToString()),
            new Claim(ClaimTypes.Name,           profile.Name),
            new Claim(ClaimTypes.Role,           "child"),
            new Claim("picture",                 profile.Avatar ?? "🦕"),
            new Claim("parentId",                parentId.ToString()),  // for audit
            new Claim("childProfileId",          profile.Id.ToString())
        };

        if (profile.Birth.HasValue)
            claims.Add(new Claim("birth", profile.Birth.Value.ToString("yyyy-MM-dd")));

        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                        _config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key missing")));
        var token = new JwtSecurityToken(
            issuer:             _config["Jwt:Issuer"],
            audience:           _config["Jwt:Audience"],
            claims:             claims,
            expires:            DateTime.UtcNow.AddHours(8),  // shorter expiry for child sessions
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private int? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }
}

// ── DTOs ─────────────────────────────────────────────────────────────────────
public class UpdateAvatarDto
{
    public string Avatar { get; set; } = "";
}
