// NeuroBlueMinds.Client/Research/ResearchStore.cs
// Guarda las sesiones en el localStorage de la tableta y genera la exportación en
// formato largo (§9.3.3) con su huella SHA-256 para el control de integridad.

using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.JSInterop;

namespace NeuroBlueMinds.Client.Research;

public class ResearchStore
{
  /// <summary>Versión del módulo de tableta; va en la columna version_pipeline.</summary>
  public const string VersionModulo = "tab-1.0.0";
  public const string Fuente        = "TAB";

  private const string IndexKey   = "nbm_rs_index";
  private const string SessionKey = "nbm_rs_";

  private static readonly string[] Columnas =
  {
    "nino_id", "sesion_id", "visita", "fase", "bloque", "timestamp_utc", "fuente", "indicador",
    "valor", "unidad", "sqi", "flag_calidad", "version_firmware", "version_pipeline",
  };

  private readonly IJSRuntime _js;

  public ResearchStore(IJSRuntime js) => _js = js;

  public async Task<List<string>> ListarAsync()
  {
    var raw = await _js.InvokeAsync<string?>("localStorage.getItem", IndexKey);
    return string.IsNullOrEmpty(raw) ? new() : JsonSerializer.Deserialize<List<string>>(raw) ?? new();
  }

  public async Task<ResearchSession?> CargarAsync(string clave)
  {
    var raw = await _js.InvokeAsync<string?>("localStorage.getItem", SessionKey + clave);
    return string.IsNullOrEmpty(raw) ? null : JsonSerializer.Deserialize<ResearchSession>(raw);
  }

  public async Task GuardarAsync(ResearchSession s)
  {
    await _js.InvokeVoidAsync("localStorage.setItem", SessionKey + s.Clave, JsonSerializer.Serialize(s));
    var index = await ListarAsync();
    if (!index.Contains(s.Clave))
    {
      index.Add(s.Clave);
      await _js.InvokeVoidAsync("localStorage.setItem", IndexKey, JsonSerializer.Serialize(index));
    }
  }

  public async Task EliminarAsync(string clave)
  {
    await _js.InvokeVoidAsync("localStorage.removeItem", SessionKey + clave);
    var index = await ListarAsync();
    if (index.Remove(clave))
      await _js.InvokeVoidAsync("localStorage.setItem", IndexKey, JsonSerializer.Serialize(index));
  }

  // ── Calibración del bloque sensorial ────────────────────────────────────────

  private const string GainKey = "nbm_rs_gains";

  /// <summary>Ganancia relativa (0–1) por nivel, ajustada con sonómetro en la sala.</summary>
  public static readonly double[] GananciasPorDefecto = { 0.15, 0.30, 0.50 };

  public async Task<double[]> GananciasAsync()
  {
    var raw = await _js.InvokeAsync<string?>("localStorage.getItem", GainKey);
    var g = string.IsNullOrEmpty(raw) ? null : JsonSerializer.Deserialize<double[]>(raw);
    return g is { Length: 3 } ? g : (double[])GananciasPorDefecto.Clone();
  }

  public Task GuardarGananciasAsync(double[] g) =>
      _js.InvokeVoidAsync("localStorage.setItem", GainKey, JsonSerializer.Serialize(g)).AsTask();

  // ── Exportación ─────────────────────────────────────────────────────────────

  /// <summary>CSV en formato largo con exactamente las columnas de §9.3.3.</summary>
  public static string ExportarCsv(ResearchSession s)
  {
    var sb = new StringBuilder();
    sb.Append(string.Join(',', Columnas)).Append('\n');
    foreach (var f in s.Filas.OrderBy(f => f.Utc))
    {
      var celdas = new[]
      {
        s.NinoId, s.SesionId, s.Visita, f.Fase, f.Bloque,
        f.Utc.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture),
        Fuente, f.Indicador,
        f.Valor?.ToString("0.###", CultureInfo.InvariantCulture) ?? "",
        // version_firmware: el firmware del C&W emparejado en esta sesión, para unir con sus tramas.
        f.Unidad, "", "0", s.VersionFirmware, VersionModulo,
      };
      sb.Append(string.Join(',', celdas.Select(Csv))).Append('\n');
    }
    return sb.ToString();
  }

  /// <summary>Bitácora de desviaciones del protocolo (§9.1.5), archivo aparte.</summary>
  public static string ExportarDesviaciones(ResearchSession s)
  {
    var sb = new StringBuilder("nino_id,sesion_id,visita,timestamp_utc,paso,motivo\n");
    foreach (var d in s.Desviaciones.OrderBy(d => d.Utc))
    {
      var celdas = new[]
      {
        s.NinoId, s.SesionId, s.Visita,
        d.Utc.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture),
        d.Paso, d.Motivo,
      };
      sb.Append(string.Join(',', celdas.Select(Csv))).Append('\n');
    }
    return sb.ToString();
  }

  public static string Sha256(string texto) =>
      Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(texto))).ToLowerInvariant();

  /// <summary>Descarga el CSV, la bitácora y un .sha256 con la huella de ambos.</summary>
  public async Task DescargarAsync(ResearchSession s)
  {
    var baseName    = $"{s.NinoId}_{s.SesionId}_{s.Visita}_TAB";
    var csv         = ExportarCsv(s);
    var desviaciones = ExportarDesviaciones(s);
    var huellas     = $"{Sha256(csv)}  {baseName}.csv\n{Sha256(desviaciones)}  {baseName}_desviaciones.csv\n";

    await _js.InvokeVoidAsync("nbmResearch.download", $"{baseName}.csv", csv, "text/csv");
    await _js.InvokeVoidAsync("nbmResearch.download", $"{baseName}_desviaciones.csv", desviaciones, "text/csv");
    await _js.InvokeVoidAsync("nbmResearch.download", $"{baseName}.sha256", huellas, "text/plain");
  }

  private static string Csv(string v) =>
      v.IndexOfAny(new[] { ',', '"', '\n', '\r' }) >= 0 ? $"\"{v.Replace("\"", "\"\"")}\"" : v;
}
