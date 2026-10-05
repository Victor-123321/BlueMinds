// NeuroBlueMinds/Endpoints/VarkController.cs
// Endpoints VARK según flujo oficial de la API.
//
// GET  /api/vark/eligibility/{childUserId}   → gate de edad 12+
// GET  /api/vark/questionnaire               → HTML oficial del cuestionario
// POST /api/vark/submit                       → reenvía campos del form a VARK API + guarda resultado
// GET  /api/vark/result/{childUserId}         → último resultado guardado

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using NeuroBlueMinds.Server.Services;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VarkController : ControllerBase
{
    private readonly IVarkService _vark;
    private readonly ILogger<VarkController> _logger;

    public VarkController(IVarkService vark, ILogger<VarkController> logger)
    {
        _vark   = vark;
        _logger = logger;
    }

    // Los fallos internos (API externa, BD) se registran; al cliente solo va un
    // código estable, nunca ex.Message.
    private ObjectResult Fail(Exception ex, string code)
    {
        _logger.LogError(ex, "[VARK] {Code}", code);
        return StatusCode(500, new { error = code });
    }

    // ── GET /api/vark/eligibility/{childUserId} ───────────────────────────────
    [HttpGet("eligibility/{childUserId:int}")]
    public async Task<IActionResult> CheckEligibility(int childUserId)
    {
        var requestingUserId = GetUserId();
        if (requestingUserId == null) return Unauthorized();

        // Un niño solo puede consultar su propia elegibilidad
        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "";
        if (role == "child" && requestingUserId.Value != childUserId) return Forbid();

        try   { return Ok(await _vark.CheckEligibility(childUserId)); }
        catch (Exception ex) { return Fail(ex, "eligibility_check_failed"); }
    }

    // ── GET /api/vark/questionnaire ───────────────────────────────────────────
    /// <summary>
    /// Devuelve el HTML oficial del cuestionario VARK (cacheado 24h).
    /// El cliente lo inyecta en un <form> y el usuario lo llena.
    /// Las credenciales de la API nunca se exponen al cliente.
    /// </summary>
    [HttpGet("questionnaire")]
    public async Task<IActionResult> GetQuestionnaire([FromQuery] string lang = "es")
    {
        var requestingUserId = GetUserId();
        if (requestingUserId == null) return Unauthorized();

        try
        {
            var html = await _vark.GetQuestionnaireHtml(lang);
            return Ok(new { html });
        }
        catch (Exception ex) { return Fail(ex, "questionnaire_fetch_failed"); }
    }

    // ── POST /api/vark/submit ─────────────────────────────────────────────────
    /// <summary>
    /// Recibe los campos del formulario VARK tal como los envió el cliente,
    /// los reenvía al endpoint /result de la API oficial y guarda el resultado.
    ///
    /// Body: { childUserId: int, formFields: { "C1V": "V", "C2A": "A", ... } }
    /// Los campos son exactamente los que devolvió el HTML del cuestionario.
    /// </summary>
    [HttpPost("submit")]
    public async Task<IActionResult> SubmitForm([FromBody] VarkFormSubmitRequest request)
    {
        if (request?.FormFields == null || request.FormFields.Count == 0)
            return BadRequest(new { error = "form_fields_required" });

        var requestingUserId = GetUserId();
        if (requestingUserId == null) return Unauthorized();

        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "";
        if (role == "child" && requestingUserId.Value != request.ChildUserId) return Forbid();

        try
        {
            var result = await _vark.SubmitForm(request.ChildUserId, request.FormFields);
            return Ok(result);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("años"))
        {
            return BadRequest(new { error = "too_young", message = ex.Message });
        }
        catch (Exception ex) { return Fail(ex, "vark_submission_failed"); }
    }

    // ── GET /api/vark/result/{childUserId} ────────────────────────────────────
    [HttpGet("result/{childUserId:int}")]
    public async Task<IActionResult> GetResult(int childUserId)
    {
        var requestingUserId = GetUserId();
        if (requestingUserId == null) return Unauthorized();

        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "";
        if (role == "child" && requestingUserId.Value != childUserId) return Forbid();

        try
        {
            var result = await _vark.GetLatestResult(childUserId);
            if (result == null)
                return NotFound(new { message = "No se encontró resultado VARK para este niño." });
            return Ok(result);
        }
        catch (Exception ex) { return Fail(ex, "vark_result_failed"); }
    }

    private int? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

/// <summary>
/// Los formFields son exactamente los campos que devolvió el HTML del cuestionario VARK:
/// field_1, field_2 (identificación), C1V, C2A, C5K, etc. (respuestas).
/// El servidor añade/sobreescribe field_1 con el ID del participante antes de reenviar.
/// </summary>
public class VarkFormSubmitRequest
{
    public int                        ChildUserId { get; set; }
    public Dictionary<string, string> FormFields  { get; set; } = new();
}
