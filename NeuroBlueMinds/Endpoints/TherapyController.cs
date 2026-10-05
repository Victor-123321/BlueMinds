// NeuroBlueMinds/Endpoints/TherapyController.cs
// Specialist clinical tools: therapy session CRUD operations with access control.

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NeuroBlueMinds.Data;
using NeuroBlueMinds.Shared.DbModels;
using NeuroBlueMinds.Shared.DTOs;
using System.Security.Claims;

[ApiController]
[Route("api/therapy")]
[Authorize]
public class TherapyController : ControllerBase
{
    private readonly NeuroBlueMindsDbContext _db;
    private readonly ILogger<TherapyController> _logger;

    public TherapyController(NeuroBlueMindsDbContext db, ILogger<TherapyController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/therapy/sessions/{childProfileId}
    /// Returns all non-deleted therapy sessions for a child.
    /// Specialist must have active professional access to the child.
    /// Ordered by SessionDate descending.
    /// </summary>
    [HttpGet("sessions/{childProfileId:int}")]
    public async Task<IActionResult> GetSessions(int childProfileId)
    {
        var specialistId = GetUserId();
        if (specialistId == null) return Unauthorized();

        try
        {
            // Verify specialist has active access to this child profile
            var hasAccess = await _db.ProfessionalAccesses
                .AnyAsync(a => a.ChildProfileId == childProfileId &&
                              a.SpecialistUserId == specialistId.Value &&
                              a.Status == "active");

            if (!hasAccess)
            {
                _logger.LogWarning(
                    "[TherapyController] Specialist {SpecialistId} attempted unauthorized access to child {ChildProfileId}",
                    specialistId, childProfileId);
                return Forbid("No tienes acceso a este perfil de niño.");
            }

            // Fetch all non-deleted therapy sessions
            var sessions = await _db.TherapySessions
                .Where(s => s.ChildProfileId == childProfileId && !s.IsDeleted)
                .OrderByDescending(s => s.SessionDate)
                .Select(s => new TherapySessionDto
                {
                    Id = s.Id,
                    ChildProfileId = s.ChildProfileId,
                    SpecialistUserId = s.SpecialistUserId,
                    SessionDate = s.SessionDate,
                    DurationMinutes = s.DurationMinutes,
                    Objectives = s.Objectives,
                    Notes = s.Notes,
                    Outcomes = s.Outcomes,
                    CreatedAt = s.CreatedAt,
                    UpdatedAt = s.UpdatedAt,
                    IsDeleted = s.IsDeleted
                })
                .ToListAsync();

            return Ok(sessions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TherapyController] Error fetching sessions for child {ChildProfileId}", childProfileId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// POST /api/therapy/sessions
    /// Creates a new therapy session record.
    /// Specialist must have active professional access to the child.
    /// </summary>
    [HttpPost("sessions")]
    public async Task<IActionResult> CreateSession([FromBody] CreateTherapySessionDto dto)
    {
        if (dto == null) return BadRequest(new { error = "request_body_required" });

        var specialistId = GetUserId();
        if (specialistId == null) return Unauthorized();

        try
        {
            // Validate ChildProfileId exists
            var childProfile = await _db.ChildProfiles
                .FirstOrDefaultAsync(cp => cp.Id == dto.ChildProfileId);

            if (childProfile == null)
            {
                return BadRequest(new { error = "child_profile_not_found" });
            }

            // Verify specialist has active access to this child profile
            var hasAccess = await _db.ProfessionalAccesses
                .AnyAsync(a => a.ChildProfileId == dto.ChildProfileId &&
                              a.SpecialistUserId == specialistId.Value &&
                              a.Status == "active");

            if (!hasAccess)
            {
                _logger.LogWarning(
                    "[TherapyController] Specialist {SpecialistId} attempted unauthorized creation for child {ChildProfileId}",
                    specialistId, dto.ChildProfileId);
                return Forbid("No tienes acceso a este perfil de niño.");
            }

            // Create therapy session
            var session = new TherapySession
            {
                ChildProfileId = dto.ChildProfileId,
                SpecialistUserId = specialistId.Value,
                SessionDate = dto.SessionDate,
                DurationMinutes = dto.DurationMinutes,
                Objectives = dto.Objectives,
                Notes = dto.Notes,
                Outcomes = dto.Outcomes,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.TherapySessions.Add(session);
            await _db.SaveChangesAsync();

            _logger.LogInformation(
                "[TherapyController] Specialist {SpecialistId} created therapy session {SessionId} for child {ChildProfileId}",
                specialistId, session.Id, dto.ChildProfileId);

            var responseDto = new TherapySessionDto
            {
                Id = session.Id,
                ChildProfileId = session.ChildProfileId,
                SpecialistUserId = session.SpecialistUserId,
                SessionDate = session.SessionDate,
                DurationMinutes = session.DurationMinutes,
                Objectives = session.Objectives,
                Notes = session.Notes,
                Outcomes = session.Outcomes,
                CreatedAt = session.CreatedAt,
                UpdatedAt = session.UpdatedAt,
                IsDeleted = session.IsDeleted
            };

            return CreatedAtAction(nameof(GetSessions), new { childProfileId = session.ChildProfileId }, responseDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TherapyController] Error creating therapy session");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// PATCH /api/therapy/sessions/{sessionId}
    /// Updates notes, outcomes, or other fields of an existing session.
    /// Only the creating specialist can update.
    /// </summary>
    [HttpPatch("sessions/{sessionId:int}")]
    public async Task<IActionResult> UpdateSession(int sessionId, [FromBody] UpdateTherapySessionDto dto)
    {
        if (dto == null) return BadRequest(new { error = "request_body_required" });

        var specialistId = GetUserId();
        if (specialistId == null) return Unauthorized();

        try
        {
            // Fetch session
            var session = await _db.TherapySessions
                .FirstOrDefaultAsync(s => s.Id == sessionId && !s.IsDeleted);

            if (session == null)
            {
                return NotFound(new { error = "session_not_found" });
            }

            // Verify specialist is the creator or admin
            if (session.SpecialistUserId != specialistId.Value)
            {
                var user = await _db.Users.FindAsync(specialistId.Value);
                if (user?.Role != "admin")
                {
                    _logger.LogWarning(
                        "[TherapyController] Specialist {SpecialistId} attempted unauthorized update of session {SessionId}",
                        specialistId, sessionId);
                    return Forbid("Solo el especialista que creó esta sesión puede editarla.");
                }
            }

            // Apply updates (only non-null fields)
            if (dto.SessionDate.HasValue)
                session.SessionDate = dto.SessionDate.Value;
            if (dto.DurationMinutes.HasValue)
                session.DurationMinutes = dto.DurationMinutes.Value;
            if (dto.Objectives != null)
                session.Objectives = dto.Objectives;
            if (dto.Notes != null)
                session.Notes = dto.Notes;
            if (dto.Outcomes != null)
                session.Outcomes = dto.Outcomes;

            session.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            _logger.LogInformation(
                "[TherapyController] Specialist {SpecialistId} updated therapy session {SessionId}",
                specialistId, sessionId);

            var responseDto = new TherapySessionDto
            {
                Id = session.Id,
                ChildProfileId = session.ChildProfileId,
                SpecialistUserId = session.SpecialistUserId,
                SessionDate = session.SessionDate,
                DurationMinutes = session.DurationMinutes,
                Objectives = session.Objectives,
                Notes = session.Notes,
                Outcomes = session.Outcomes,
                CreatedAt = session.CreatedAt,
                UpdatedAt = session.UpdatedAt,
                IsDeleted = session.IsDeleted
            };

            return Ok(responseDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TherapyController] Error updating therapy session {SessionId}", sessionId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// DELETE /api/therapy/sessions/{sessionId}
    /// Soft-deletes a therapy session (marks IsDeleted = true).
    /// Only the creating specialist can delete.
    /// </summary>
    [HttpDelete("sessions/{sessionId:int}")]
    public async Task<IActionResult> DeleteSession(int sessionId)
    {
        var specialistId = GetUserId();
        if (specialistId == null) return Unauthorized();

        try
        {
            // Fetch session
            var session = await _db.TherapySessions
                .FirstOrDefaultAsync(s => s.Id == sessionId && !s.IsDeleted);

            if (session == null)
            {
                return NotFound(new { error = "session_not_found" });
            }

            // Verify specialist is the creator or admin
            if (session.SpecialistUserId != specialistId.Value)
            {
                var user = await _db.Users.FindAsync(specialistId.Value);
                if (user?.Role != "admin")
                {
                    _logger.LogWarning(
                        "[TherapyController] Specialist {SpecialistId} attempted unauthorized delete of session {SessionId}",
                        specialistId, sessionId);
                    return Forbid("Solo el especialista que creó esta sesión puede eliminarla.");
                }
            }

            // Soft delete
            session.IsDeleted = true;
            session.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            _logger.LogInformation(
                "[TherapyController] Specialist {SpecialistId} deleted therapy session {SessionId}",
                specialistId, sessionId);

            return Ok(new { message = "Sesión eliminada correctamente." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TherapyController] Error deleting therapy session {SessionId}", sessionId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>Helper: extract UserId from JWT claim.</summary>
    private int? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }
}
