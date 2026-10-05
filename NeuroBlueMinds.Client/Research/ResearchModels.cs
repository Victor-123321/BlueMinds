// NeuroBlueMinds.Client/Research/ResearchModels.cs
// Modelo de datos del módulo de sesión en tableta (Protocolo C&W-NM, §7.4, §9.1.5, §9.3.3).
// Todo vive en el navegador de la tableta: no hay tablas nuevas en la BD y nada sale
// de la sede salvo el CSV que el personal exporta a mano.

namespace NeuroBlueMinds.Client.Research;

/// <summary>Una sesión experimental (V1 práctica, V2 o V3) de un participante seudonimizado.</summary>
public class ResearchSession
{
  public string NinoId          { get; set; } = "";   // NB-017 — nunca un nombre
  public string SesionId        { get; set; } = "";   // S02
  public string Visita          { get; set; } = "V2"; // V2 | V3
  public string Orden           { get; set; } = "AB"; // AB = cognitivo→sensorial, BA = al revés
  public string VersionFirmware { get; set; } = "";
  public DateTime CreadaUtc     { get; set; } = DateTime.UtcNow;
  public DateTime? CerradaUtc   { get; set; }
  public int PasoActual         { get; set; }
  public List<ResearchRow> Filas        { get; set; } = new();
  public List<Desviacion>  Desviaciones { get; set; } = new();

  /// <summary>Clave estable para guardar y listar.</summary>
  public string Clave => $"{NinoId}_{SesionId}_{Visita}";
}

/// <summary>Una fila del formato largo de §9.3.3 (fuente = TAB para todo lo que registra la tableta).</summary>
public class ResearchRow
{
  public string   Fase       { get; set; } = "";  // basal | reposo | carga | recuperacion
  public string   Bloque     { get; set; } = "";  // linea_base, cognitivo_n2, fisica_e3, post_fisica…
  public DateTime Utc        { get; set; }
  public string   Indicador  { get; set; } = "";
  public double?  Valor      { get; set; }
  public string   Unidad     { get; set; } = "";
}

public class Desviacion
{
  public DateTime Utc    { get; set; }
  public string   Paso   { get; set; } = "";
  public string   Motivo { get; set; } = "";
}

/// <summary>Tarea que ve el niño durante un paso.</summary>
public enum TareaNino
{
  Ninguna,
  BajaDemanda,   // conteo de figuras de colores (línea base y recuperaciones)
  NBack,         // bloque cognitivo
  Sensorial,     // bloque sensorial
}

/// <summary>Un paso de la sesión, en el orden de §9.1.5.</summary>
public class PasoSesion
{
  public string    Id          { get; init; } = "";
  public string    Titulo      { get; init; } = "";
  public string    Instruccion { get; init; } = "";
  public string    Fase        { get; init; } = "";
  public string    Bloque      { get; init; } = "";
  public TareaNino Tarea       { get; init; }
  /// <summary>Duración en segundos; null = el personal decide cuándo avanzar.</summary>
  public int?      Segundos    { get; init; }
  /// <summary>Segundos que se pueden agregar en tramos de 60 (recuperaciones: hasta 10 min).</summary>
  public int       ProrrogaMax { get; init; }
  public TipoPaso  Tipo        { get; init; } = TipoPaso.Temporizado;
}

public enum TipoPaso
{
  Temporizado,
  Instrumentacion,
  ValidacionLineaBase,
  CargaFisica,
  Recuperacion,
  Cierre,
}
