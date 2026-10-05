// NeuroBlueMinds/Endpoints/DashboardController.cs

using NeuroBlueMinds.Shared.DbModels;
using NeuroBlueMinds.Shared.DTOs;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using NeuroBlueMinds.Shared.Interfaces;

[ApiController]
[Route("api/[controller]")]
[Authorize]   // ← all endpoints require a valid JWT by default
public class DashboardController : ControllerBase
{
  private readonly IDashboardService _service;
  public DashboardController(IDashboardService service) => _service = service;

  // ── Analysis & Roadmap ────────────────────────────────────────────────────
  // userId from JWT is validated against the route parameter to prevent
  // users from querying other people's data.

  [HttpGet("analysis/{userId}/{userName}")]
  public async Task<IActionResult> GetAnalysis(int userId, string userName)
  {
    if (!CanAccessUser(userId)) return Forbid();
    return Ok(await _service.GetDeepAnalysisAsync(userId, userName));
  }

  [HttpGet("roadmap/{userId}/{userName}")]
  public async Task<IActionResult> GetRoadmap(int userId, string userName)
  {
    if (!CanAccessUser(userId)) return Forbid();
    return Ok(await _service.GetRoadmapAsync(userId, userName));
  }

  [HttpGet("history/{userId}")]
  public async Task<IActionResult> GetHistory(int userId)
  {
    if (!CanAccessUser(userId)) return Forbid();
    return Ok(await _service.GetHistoryAsync(userId));
  }

  [HttpGet("summary/{userId}")]
  public async Task<IActionResult> GetSummary(int userId)
  {
    if (!CanAccessUser(userId)) return Forbid();
    return Ok(await _service.GetUserSummaryAsync(userId));
  }

  // ── Parent quiz ───────────────────────────────────────────────────────────

  [HttpGet("parent-session/{userId}")]
  public async Task<ActionResult<ParentQuizSession>> GetParentSession(int userId)
  {
    if (!CanAccessUser(userId)) return Forbid();
    var session = await _service.GetActiveParentSessionAsync(userId);
    if (session == null) return NotFound();
    return Ok(session);
  }

  [HttpPost("save-parent-response")]
  public async Task<IActionResult> SaveParentResponse([FromBody] SaveParentResponseRequest req)
  {
    if (req == null) return BadRequest();
    var userId = GetUserId();
    if (userId == null) return Unauthorized();
    var ok = await _service.SaveParentResponseAsync(userId.Value, req.QuestionIndex, req.Section, req.Answer);
    return ok ? Ok(new { message = "Respuesta guardada." }) : StatusCode(500);
  }

  [HttpPost("complete-parent-quiz")]
  public async Task<IActionResult> CompleteParentQuiz([FromBody] CompleteParentQuizRequest req)
  {
    if (req == null) return BadRequest();
    var userId = GetUserId();
    if (userId == null) return Unauthorized();
    var ok = await _service.CompleteParentSessionAsync(userId.Value, req.CommunicationScore, req.LearningStyle ?? "unknown");
    return ok ? Ok(new { message = "Evaluación guardada correctamente." }) : StatusCode(500);
  }

  // ── Child quiz ────────────────────────────────────────────────────────────

  [HttpGet("child-session")]
  public async Task<IActionResult> GetChildSession()
  {
    var userId = GetUserId();
    if (userId == null) return Unauthorized();
    var session = await _service.GetActiveChildSessionAsync(userId.Value);
    if (session == null) return NotFound();
    return Ok(new
    {
      progress = new
      {
        id = session.Id,
        current_question_index = session.CurrentQuestionIndex,
        is_completed = session.IsCompleted
      }
    });
  }

  [HttpPost("save-child-response")]
  public async Task<IActionResult> SaveChildResponse([FromBody] SaveChildResponseRequest req)
  {
    if (req == null) return BadRequest();
    var userId = GetUserId();
    if (userId == null) return Unauthorized();

    long sessionId = req.SessionId;
    if (sessionId == 0)
      sessionId = await _service.CreateChildSessionAsync(userId.Value);

    var ok = await _service.SaveChildResponseAsync(
        userId.Value, sessionId,
        req.QuestionIndex, req.QuestionType, req.LearningStyle,
        req.Nivel, req.AnswerJson, req.IsCorrect, req.ResponseTimeMs);

    return ok
        ? Ok(new { message = "Respuesta guardada.", sessionId })
        : StatusCode(500);
  }

  [HttpPost("complete-child-quiz")]
  public async Task<IActionResult> CompleteChildQuiz([FromBody] CompleteChildQuizRequest req)
  {
    if (req == null) return BadRequest();
    var userId = GetUserId();
    if (userId == null) return Unauthorized();
    var result = await _service.CompleteChildSessionAsync(
        userId.Value, req.SessionId, req.AnswersJson, req.TotalTimeSeconds);
    return Ok(result);
  }

  // ── Games ─────────────────────────────────────────────────────────────────

  [HttpPost("save-result")]
  public async Task<IActionResult> SaveResult([FromBody] SaveGameResultDto req)
  {
    if (req == null) return BadRequest();
    var userId = GetUserId();
    if (userId == null) return Unauthorized("No se pudo identificar al usuario desde el token");
    var ok = await _service.SaveGameResultAsync(req, userId.Value);
    return ok ? Ok(new { message = "Progreso actualizado correctamente" }) : StatusCode(500);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private int? GetUserId()
  {
    var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    return int.TryParse(claim, out var id) ? id : null;
  }

  /// <summary>
  /// Returns true if the JWT owner may access data for <paramref name="targetUserId"/>.
  /// Rules:
  ///   - Users can always read their own data (userId == tokenUserId).
  ///   - Specialists and admins can read any userId.
  ///   - Parents can read their own userId AND their children's userIds
  ///     (child JWT sets sub = childUserId, so this is handled transparently
  ///      by the child-scoped JWT — the child IS the token owner).
  /// </summary>
  private bool CanAccessUser(int targetUserId)
  {
    var tokenUserId = GetUserId();
    if (tokenUserId == null) return false;
    if (tokenUserId.Value == targetUserId) return true;

    var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "";
    return role is "specialist" or "admin";
  }
}

// ── Request DTOs ──────────────────────────────────────────────────────────────
public class SaveParentResponseRequest
{
  public int QuestionIndex { get; set; }
  public string Section { get; set; } = string.Empty;
  public string Answer { get; set; } = string.Empty;
}

public class CompleteParentQuizRequest
{
  public int CommunicationScore { get; set; }
  public string? LearningStyle { get; set; }
}

public class SaveChildResponseRequest
{
  public long SessionId { get; set; }
  public int QuestionIndex { get; set; }
  public string QuestionType { get; set; } = string.Empty;
  public string LearningStyle { get; set; } = string.Empty;
  public int Nivel { get; set; }
  public string AnswerJson { get; set; } = string.Empty;
  public bool IsCorrect { get; set; }
  public int ResponseTimeMs { get; set; }
}

public class CompleteChildQuizRequest
{
  public long SessionId { get; set; }
  public string AnswersJson { get; set; } = string.Empty;
  public int TotalTimeSeconds { get; set; }
}
