// NeuroBlueMinds/Endpoints/AdaptiveController.cs — NEW FILE

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NeuroBlueMinds.Server.Services;
using System.Security.Claims;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AdaptiveController : ControllerBase
{
    private readonly IAdaptiveEngineService _ade;
    public AdaptiveController(IAdaptiveEngineService ade) => _ade = ade;

    /// <summary>
    /// Returns ranked activity recommendations for the current child.
    /// The child's userId comes from the JWT (set by ChildAwareHttpHandler).
    /// </summary>
    [HttpGet("recommendations")]
    public async Task<IActionResult> GetRecommendations()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        return Ok(await _ade.GetRecommendations(userId.Value));
    }

    /// <summary>Called by DashboardService after game result saved.</summary>
    [HttpPost("update-after-game")]
    public async Task<IActionResult> UpdateAfterGame(
        [FromBody] UpdateAfterGameRequest req)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        await _ade.UpdateStateAfterGame(userId.Value, req.Style, req.Accuracy,
            req.ResponseTimeMs, req.Abandoned);
        return Ok();
    }

    private int? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }
}

public class UpdateAfterGameRequest
{
    public string Style         { get; set; } = "";
    public double Accuracy      { get; set; }
    public int    ResponseTimeMs { get; set; }
    public bool   Abandoned     { get; set; }
}
