// NeuroBlueMinds.Client/Research/SessionRecorder.cs
// Punto único para registrar filas y marcadores durante una sesión en curso.
// Cada registro se guarda de inmediato: si la tableta se cierra no se pierde nada.

namespace NeuroBlueMinds.Client.Research;

public class SessionRecorder
{
  private readonly ResearchStore _store;
  public ResearchSession Session { get; }

  /// <summary>Fase y bloque vigentes; los componentes de tarea pueden afinar el bloque (cognitivo_n2).</summary>
  public string Fase   { get; set; } = "";
  public string Bloque { get; set; } = "";

  public SessionRecorder(ResearchStore store, ResearchSession session)
  {
    _store  = store;
    Session = session;
  }

  public Task Valor(string indicador, double? valor, string unidad, string? bloque = null) =>
      Agregar(new ResearchRow
      {
        Fase = Fase, Bloque = bloque ?? Bloque, Utc = DateTime.UtcNow,
        Indicador = indicador, Valor = valor, Unidad = unidad,
      });

  /// <summary>Marcador de evento: indicador evento_&lt;nombre&gt;, valor 1, unidad "marca".</summary>
  public Task Marcar(string evento, string? bloque = null) =>
      Valor($"evento_{evento}", 1, "marca", bloque);

  public Task Desviacion(string paso, string motivo)
  {
    Session.Desviaciones.Add(new Desviacion { Utc = DateTime.UtcNow, Paso = paso, Motivo = motivo });
    return _store.GuardarAsync(Session);
  }

  public Task Guardar() => _store.GuardarAsync(Session);

  private Task Agregar(ResearchRow fila)
  {
    Session.Filas.Add(fila);
    return _store.GuardarAsync(Session);
  }
}
