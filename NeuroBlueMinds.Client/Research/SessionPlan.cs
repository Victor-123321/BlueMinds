// NeuroBlueMinds.Client/Research/SessionPlan.cs
// Secuencia de pasos de la sesión V2/V3 (Protocolo C&W-NM §7.4, §7.6, §9.1.5).

namespace NeuroBlueMinds.Client.Research;

public static class SessionPlan
{
  public const int BloqueSegundos      = 360; // 3 niveles × 2 min
  public const int NivelSegundos       = 120;
  public const int RecuperacionSeg     = 300; // prolongable hasta 600
  public const int RecuperacionMaxSeg  = 600;

  public static List<PasoSesion> Construir(string orden)
  {
    var cognitivoPrimero = orden != "BA";
    var a = cognitivoPrimero ? BloqueCognitivo() : BloqueSensorial();
    var b = cognitivoPrimero ? BloqueSensorial() : BloqueCognitivo();

    return new List<PasoSesion>
    {
      new()
      {
        Id = "instrumentacion", Titulo = "Instrumentación", Fase = "basal", Bloque = "instrumentacion",
        Tipo = TipoPaso.Instrumentacion,
        Instruccion = "Coloca C&W, banda Polar y brazalete. Marca los tres toques de sincronización mientras los das sobre la carcasa, verifica 60 s de señal y marca INICIO.",
      },
      new()
      {
        Id = "estabilizacion", Titulo = "Fase 1 · Estabilización", Fase = "reposo", Bloque = "estabilizacion",
        Tarea = TareaNino.BajaDemanda, Segundos = 120,
        Instruccion = "Mide la PA antes de iniciar. Dos minutos de adaptación con la tarea de baja demanda.",
      },
      new()
      {
        Id = "linea_base", Titulo = "Fase 1 · Línea base", Fase = "reposo", Bloque = "linea_base",
        Tarea = TareaNino.BajaDemanda, Segundos = 300, ProrrogaMax = 180,
        Instruccion = "Sin conversación y con el personal fuera del campo visual. Si el MCLB no es válido, prolonga hasta 3 min.",
      },
      new()
      {
        Id = "mclb", Titulo = "Resultado MCLB", Fase = "reposo", Bloque = "linea_base",
        Tipo = TipoPaso.ValidacionLineaBase,
        Instruccion = "Registra el resultado del MCLB que reporta el dispositivo y la SpO₂ del oxímetro.",
      },
      a,
      Recuperacion($"rec_{a.Bloque}", $"Recuperación tras bloque {Nombre(a)}", $"post_{a.Bloque}"),
      b,
      Recuperacion($"rec_{b.Bloque}", $"Recuperación tras bloque {Nombre(b)}", $"post_{b.Bloque}"),
      new()
      {
        Id = "pausa", Titulo = "Pausa y ajuste del cicloergómetro", Fase = "reposo", Bloque = "pausa",
        Segundos = 300,
        Instruccion = "Ajusta el asiento (flexión de rodilla 25–30°) y verifica el manubrio.",
      },
      new()
      {
        Id = "fisica", Titulo = "Fase 2b · Carga física PWC170", Fase = "carga", Bloque = "fisica",
        Tipo = TipoPaso.CargaFisica,
        Instruccion = "1 min sentado sin pedalear, calentamiento 2 min a 0.5 W/kg y etapas de 2 min (+0.5 W/kg) a 60 rpm. Registra OMNI en los últimos 15 s de cada etapa.",
      },
      new()
      {
        Id = "recuperacion_fisica", Titulo = "Fase 3 · Recuperación", Fase = "recuperacion", Bloque = "post_fisica",
        Tipo = TipoPaso.Recuperacion, Segundos = 600,
        Instruccion = "2 min sentado en el cicloergómetro, traslado a la silla y 8 min con la tarea de baja demanda. PA a 1, 3, 5 y 10 min; OMNI al minuto 1.",
      },
      new()
      {
        Id = "cierre", Titulo = "Cierre", Fase = "recuperacion", Bloque = "cierre",
        Tipo = TipoPaso.Cierre,
        Instruccion = "Marca FIN, retira sensores e inspecciona la piel. Aplica la escala de agrado al niño y el SUS al cuidador.",
      },
    };
  }

  private static PasoSesion BloqueCognitivo() => new()
  {
    Id = "cognitivo", Titulo = "Fase 2a · Bloque cognitivo", Fase = "carga", Bloque = "cognitivo",
    Tarea = TareaNino.NBack, Segundos = BloqueSegundos,
    Instruccion = "Tarea de memoria de trabajo en tres niveles de 2 min. Sin retroalimentación negativa ni sonidos.",
  };

  private static PasoSesion BloqueSensorial() => new()
  {
    Id = "sensorial", Titulo = "Fase 2a · Bloque sensorial", Fase = "carga", Bloque = "sensorial",
    Tarea = TareaNino.Sensorial, Segundos = BloqueSegundos,
    Instruccion = "Tres niveles de 2 min (55, 62 y 68–70 dB(A) calibrados con sonómetro). El niño puede pausar con el botón.",
  };

  private static PasoSesion Recuperacion(string id, string titulo, string bloque) => new()
  {
    Id = id, Titulo = titulo, Fase = "recuperacion", Bloque = bloque,
    Tarea = TareaNino.BajaDemanda, Segundos = RecuperacionSeg,
    ProrrogaMax = RecuperacionMaxSeg - RecuperacionSeg,
    Instruccion = "Recuperación sentada con la tarea de baja demanda. Prolonga hasta 10 min si la FC no vuelve a la tolerancia de la línea base.",
  };

  private static string Nombre(PasoSesion p) => p.Tarea == TareaNino.NBack ? "cognitivo" : "sensorial";
}
