// NeuroBlueMinds/Services/VarkService.cs
// Implementación COMPLETA según la guía oficial VARK API v1.0 (20 Aug 2025).
//
// FLUJO OFICIAL:
//   1. GET  /questionnaire?lang=es  → devuelve HTML del cuestionario oficial
//   2. El servidor lo entrega al cliente como string (nunca exponemos credenciales)
//   3. El cliente muestra el HTML dentro de un <form> y el usuario lo llena
//   4. El cliente envía los campos del form al servidor (no a VARK directamente)
//   5. POST /result con esos campos (form-urlencoded) → devuelve "mild Visual"
//   6. El servidor parsea el resultado y actualiza el CSM del niño
//
// AUTENTICACIÓN: HTTP Basic (Authorization: Basic base64(username:password))
// CONTENT-TYPE para result: application/x-www-form-urlencoded (los campos del HTML)
// RESPUESTA: JSON string, e.g. "mild Visual", "strong Kinesthetic", "VARK" (multimodal)
//
// appsettings.json necesita:
//   "Vark": {
//     "ApiUsername": "tu-access-code",
//     "ApiPassword": "<contraseña de aplicación>"
//   }

using Microsoft.EntityFrameworkCore;
using NeuroBlueMinds.Data;
using NeuroBlueMinds.Shared.DbModels;
using System.Text;
using System.Text.Json;

namespace NeuroBlueMinds.Server.Services;

public interface IVarkService
{
    /// <summary>Verifica si el niño tiene 12+ años para el VARK oficial.</summary>
    Task<VarkEligibilityDto> CheckEligibility(int childUserId);

    /// <summary>
    /// Obtiene el HTML oficial del cuestionario VARK desde la API.
    /// El HTML contiene las preguntas, opciones y campos de identificación.
    /// Se cachea en memoria por 24h para no consumir llamadas innecesarias.
    /// </summary>
    Task<string> GetQuestionnaireHtml(string lang = "es");

    /// <summary>
    /// Envía los campos del formulario VARK al endpoint /result de la API oficial.
    /// formFields es el diccionario de campos tal como llegaron del submit del form del cliente.
    /// Retorna el resultado parseado y actualiza el CSM del niño.
    /// </summary>
    Task<VarkResultDto> SubmitForm(int childUserId, Dictionary<string, string> formFields);

    /// <summary>Devuelve el último resultado VARK guardado para un niño.</summary>
    Task<VarkResultDto?> GetLatestResult(int childUserId);
}

public class VarkService : IVarkService
{
    private readonly NeuroBlueMindsDbContext _db;
    private readonly IConfiguration         _config;
    private readonly HttpClient             _http;
    private readonly IAdaptiveEngineService _adaptive;

    // ── VARK API endpoints (guía oficial v1.0) ────────────────────────────────
    private const string VarkBase           = "https://site.vark-learn.com/wp-json/vark-api/v1";
    private const string QuestionnaireUrl   = VarkBase + "/questionnaire";
    private const string ResultUrl          = VarkBase + "/result";
    private const int    MinAgeForVark      = 12;

    // Cache del HTML del cuestionario (se renueva cada 24h como recomienda la guía)
    private static string?   _cachedHtml;
    private static DateTime  _cacheTime = DateTime.MinValue;
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(24);

    public VarkService(
        NeuroBlueMindsDbContext  db,
        IConfiguration          config,
        IHttpClientFactory      httpFactory,
        IAdaptiveEngineService  adaptive)
    {
        _db       = db;
        _config   = config;
        _http     = httpFactory.CreateClient("vark");
        _adaptive = adaptive;
    }

    // ── Eligibility ──────────────────────────────────────────────────────────
    public async Task<VarkEligibilityDto> CheckEligibility(int childUserId)
    {
        var user = await _db.Users.FindAsync(childUserId);
        if (user == null)
            return new VarkEligibilityDto { Eligible = false, Reason = "child_not_found" };

        if (!user.Birth.HasValue)
            return new VarkEligibilityDto { Eligible = false, Reason = "no_birth_date" };

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var age   = today.Year - user.Birth.Value.Year;
        if (user.Birth.Value > today.AddYears(-age)) age--;

        DateOnly? unlocksOn = null;
        if (age < MinAgeForVark)
        {
            unlocksOn = new DateOnly(
                user.Birth.Value.Year + MinAgeForVark,
                user.Birth.Value.Month,
                user.Birth.Value.Day);
        }

        return new VarkEligibilityDto
        {
            Eligible  = age >= MinAgeForVark,
            AgeYears  = age,
            UnlocksOn = unlocksOn,
            Reason    = age >= MinAgeForVark ? "eligible" : "too_young"
        };
    }

    // ── GET questionnaire HTML ────────────────────────────────────────────────
    public async Task<string> GetQuestionnaireHtml(string lang = "es")
    {
        // Devolver desde cache si es reciente (la guía recomienda cachear el HTML)
        if (_cachedHtml != null && DateTime.UtcNow - _cacheTime < CacheDuration)
            return _cachedHtml;

        var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{QuestionnaireUrl}?lang={lang}");

        request.Headers.Authorization = BuildBasicAuth();

        var response = await _http.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            throw new Exception(
                $"VARK questionnaire API error {(int)response.StatusCode}: {err}");
        }

        // La API devuelve un JSON-encoded string que contiene el HTML.
        // json_decode en PHP → en C# deserializamos el string JSON para obtener el HTML puro.
        var jsonString = await response.Content.ReadAsStringAsync();
        var html       = JsonSerializer.Deserialize<string>(jsonString)
                         ?? throw new Exception("VARK API devolvió HTML vacío.");

        _cachedHtml = html;
        _cacheTime  = DateTime.UtcNow;

        return html;
    }

    // ── POST form to /result ──────────────────────────────────────────────────
    public async Task<VarkResultDto> SubmitForm(int childUserId, Dictionary<string, string> formFields)
    {
        // Verificar elegibilidad
        var eligibility = await CheckEligibility(childUserId);
        if (!eligibility.Eligible)
            throw new InvalidOperationException(
                $"VARK requiere {MinAgeForVark}+ años. El niño tiene {eligibility.AgeYears} años.");

        // Añadir/sobreescribir field_1 con el identificador de participante.
        // Usamos un ID estable basado en childUserId para que reenvíos del mismo
        // participante no consuman cuota adicional (según la guía: mismo field_1 = 1 cuota).
        // Para testing sin consumir cuota, pon "api_test" en appsettings Vark:TestMode=true.
        var testMode      = _config.GetValue<bool>("Vark:TestMode");
        var participantId = testMode
            ? "api_test"
            : (formFields.TryGetValue("field_1", out var existing) && !string.IsNullOrEmpty(existing)
                ? existing
                : $"nbm_{childUserId}");

        formFields["field_1"] = participantId;

        // Construir el request: form-urlencoded, Basic Auth en header (nunca en body)
        var request = new HttpRequestMessage(HttpMethod.Post, ResultUrl)
        {
            Content = new FormUrlEncodedContent(
                formFields.Select(kv => new KeyValuePair<string, string>(kv.Key, kv.Value)))
        };
        request.Headers.Authorization = BuildBasicAuth();

        var response = await _http.SendAsync(request);
        var rawBody  = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new Exception(
                $"VARK result API error {(int)response.StatusCode}: {rawBody}");

        // La API devuelve un JSON-encoded string, e.g. "mild Visual" o "VARK"
        // json_decode en PHP → deserializamos en C#
        string resultLabel;
        try
        {
            resultLabel = JsonSerializer.Deserialize<string>(rawBody) ?? rawBody.Trim('"');
        }
        catch
        {
            // Si por alguna razón no es JSON válido, usar el texto tal cual
            resultLabel = rawBody.Trim('"', ' ', '\n', '\r');
        }

        // Parsear el resultado textual y calcular scores locales para la gráfica
        var scores        = ParseScoresFromForm(formFields);
        var dominantStyle = MapResultLabelToStyle(resultLabel, scores);

        // Persist en DB
        var varkResult = new VarkResult
        {
            ChildUserId           = childUserId,
            ParticipantIdentifier = participantId,
            VisualScore           = scores.V,
            AuralScore            = scores.A,
            ReadWriteScore        = scores.R,
            KinestheticScore      = scores.K,
            DominantStyle         = dominantStyle,
            RawResponse           = rawBody,
            VarkResultId          = resultLabel,   // guardamos el label oficial como referencia
            CreatedAt             = DateTime.UtcNow
        };
        _db.VarkResults.Add(varkResult);
        await _db.SaveChangesAsync();

        // Actualizar CSM del niño
        await UpdateAdaptiveStateFromVark(childUserId, varkResult);

        return MapToDto(varkResult);
    }

    // ── Latest result ─────────────────────────────────────────────────────────
    public async Task<VarkResultDto?> GetLatestResult(int childUserId)
    {
        var result = await _db.VarkResults
            .Where(v => v.ChildUserId == childUserId)
            .OrderByDescending(v => v.CreatedAt)
            .FirstOrDefaultAsync();

        return result == null ? null : MapToDto(result);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private System.Net.Http.Headers.AuthenticationHeaderValue BuildBasicAuth()
    {
        var username = _config["Vark:ApiUsername"]
            ?? throw new InvalidOperationException("Vark:ApiUsername no configurado en appsettings");
        var password = _config["Vark:ApiPassword"]
            ?? throw new InvalidOperationException("Vark:ApiPassword no configurado en appsettings");

        var token = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{username}:{password}"));
        return new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", token);
    }

    /// <summary>
    /// Cuenta las selecciones V/A/R/K a partir de los campos del formulario VARK.
    /// Los campos tienen el formato: C{nPregunta}{Modalidad} = {Modalidad}
    /// e.g. C5V=V significa que el usuario seleccionó la opción Visual en la pregunta 5.
    /// </summary>
    private static VarkScores ParseScoresFromForm(Dictionary<string, string> fields)
    {
        var scores = new VarkScores();
        foreach (var (key, value) in fields)
        {
            // Patrón: C seguido de número(s) seguido de V|A|R|K
            if (key.Length < 3 || key[0] != 'C') continue;
            var modality = value.Trim().ToUpper();
            switch (modality)
            {
                case "V": scores.V++; break;
                case "A": scores.A++; break;
                case "R": scores.R++; break;
                case "K": scores.K++; break;
            }
        }
        return scores;
    }

    /// <summary>
    /// Mapea el resultado textual de la API ("mild Visual", "strong Kinesthetic", "VARK")
    /// al estilo de la plataforma. Si el label no es parseable, usa los scores locales.
    /// </summary>
    private static string MapResultLabelToStyle(string resultLabel, VarkScores scores)
    {
        var lower = resultLabel.ToLower();

        // Resultado multimodal "VARK" → usar el score más alto de los campos locales
        if (lower == "vark" || lower.Contains("multimodal"))
        {
            return MapScoresToStyle(scores);
        }

        // Labels individuales: "mild Visual", "strong Aural", etc.
        if      (lower.Contains("visual"))                                      return "visual";
        else if (lower.Contains("aural") || lower.Contains("auditory"))        return "auditivo";
        else if (lower.Contains("read")  || lower.Contains("write"))           return "lectoescritura";
        else if (lower.Contains("kinesthetic") || lower.Contains("kinestésic")) return "kinestesico";

        // Fallback a scores locales
        return MapScoresToStyle(scores);
    }

    private static string MapScoresToStyle(VarkScores scores)
    {
        var map = new Dictionary<string, int>
        {
            ["visual"]         = scores.V,
            ["auditivo"]       = scores.A,
            ["lectoescritura"] = scores.R,
            ["kinestesico"]    = scores.K
        };
        var max     = map.Values.Max();
        var leaders = map.Where(kv => max - kv.Value <= 2)
                        .Select(kv => kv.Key)
                        .OrderByDescending(k => map[k])
                        .ToList();
        return string.Join(",", leaders);
    }

    private async Task UpdateAdaptiveStateFromVark(int childUserId, VarkResult result)
    {
        var profile = await _db.ChildProfiles
            .FirstOrDefaultAsync(p => p.ChildUserId == childUserId);
        if (profile == null) return;

        var state = string.IsNullOrEmpty(profile.AdaptiveState)
            ? new Shared.DTOs.AdaptiveStateDto()
            : JsonSerializer.Deserialize<Shared.DTOs.AdaptiveStateDto>(profile.AdaptiveState)
              ?? new Shared.DTOs.AdaptiveStateDto();

        // Normalizar scores (0-16) a mastery (0.0-1.0)
        var maxScore = Math.Max(1, Math.Max(Math.Max(result.VisualScore, result.AuralScore),
                                            Math.Max(result.ReadWriteScore, result.KinestheticScore)));
        state.MasteryScores["visual"]         = Math.Round(result.VisualScore      / (double)maxScore, 3);
        state.MasteryScores["auditivo"]       = Math.Round(result.AuralScore       / (double)maxScore, 3);
        state.MasteryScores["lectoescritura"] = Math.Round(result.ReadWriteScore   / (double)maxScore, 3);
        state.MasteryScores["kinestesico"]    = Math.Round(result.KinestheticScore / (double)maxScore, 3);

        var primaryStyle    = result.DominantStyle.Split(',').First();
        state.DominantStyle = primaryStyle;
        state.WeakestStyle  = state.MasteryScores.OrderBy(kv => kv.Value).First().Key;
        state.LastUpdated   = DateTime.UtcNow;

        profile.AdaptiveState = JsonSerializer.Serialize(state);
        profile.DominantStyle = primaryStyle;
        profile.UpdatedAt     = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }

    private static VarkResultDto MapToDto(VarkResult r) => new()
    {
        Id                    = r.Id,
        ChildUserId           = r.ChildUserId,
        ParticipantIdentifier = r.ParticipantIdentifier,
        VisualScore           = r.VisualScore,
        AuralScore            = r.AuralScore,
        ReadWriteScore        = r.ReadWriteScore,
        KinestheticScore      = r.KinestheticScore,
        DominantStyle         = r.DominantStyle,
        VarkResultId          = r.VarkResultId,
        CreatedAt             = r.CreatedAt
    };

    private class VarkScores
    {
        public int V { get; set; }
        public int A { get; set; }
        public int R { get; set; }
        public int K { get; set; }
    }
}

// ── DTOs ─────────────────────────────────────────────────────────────────────

public class VarkEligibilityDto
{
    public bool      Eligible  { get; set; }
    public int?      AgeYears  { get; set; }
    public DateOnly? UnlocksOn { get; set; }
    public string    Reason    { get; set; } = "";
}

public class VarkAnswerDto
{
    public int          QuestionNumber  { get; set; }
    public List<string> SelectedOptions { get; set; } = new();
}

public class VarkResultDto
{
    public int      Id                    { get; set; }
    public int      ChildUserId           { get; set; }
    public string   ParticipantIdentifier { get; set; } = "";
    public int      VisualScore           { get; set; }
    public int      AuralScore            { get; set; }
    public int      ReadWriteScore        { get; set; }
    public int      KinestheticScore      { get; set; }
    public string   DominantStyle         { get; set; } = "";
    public string?  VarkResultId          { get; set; }
    public DateTime CreatedAt             { get; set; }

    public string PlatformStyleLabel => DominantStyle.Split(',').First() switch
    {
        "visual"         => "Visual",
        "auditivo"       => "Auditivo",
        "lectoescritura" => "Lecto-Escritor",
        "kinestesico"    => "Kinestésico",
        _                => DominantStyle
    };
}
