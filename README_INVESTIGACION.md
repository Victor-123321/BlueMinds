# Módulo de sesión en tableta (Protocolo C&W-NM)

Implementa la "Tableta con plataforma BlueMinds" del protocolo (§8.6.6): conduce la sesión V2/V3, aplica las cargas cognitiva y sensorial, registra marcadores de evento y escalas, y exporta los datos en el formato largo de §9.3.3.

- Ruta: `/investigacion` (roles `specialist` y `admin`).
- Código: `NeuroBlueMinds.Client/Research/`, `Pages/Research/`, `Components/Research/`, `wwwroot/js/research.js`, `wwwroot/css/research.css`.
- **No usa la base de datos.** Cada sesión vive en el `localStorage` de la tableta hasta que el personal la exporta, de modo que los datos no salen de la sede (§10.3). Exportar antes de borrar el navegador o eliminar la sesión.

## Flujo de la sesión

Instrumentación → Fase 1 (estabilización 2 min, línea base 5 min, resultado MCLB) → bloques A y B según el orden AB/BA, cada uno con su recuperación de 5 min (prolongable a 10) → pausa → carga física PWC170 → recuperación de 10 min → cierre.

Los pasos con cronómetro y sin prórroga avanzan solos. Terminar un paso antes de tiempo pide confirmación y queda en la bitácora de desviaciones.

## Archivos exportados

| Archivo | Contenido |
| --- | --- |
| `NB-017_S02_V2_TAB.csv` | Formato largo de §9.3.3; `fuente = TAB`, `version_pipeline = tab-1.0.0`, `version_firmware` = firmware del C&W emparejado |
| `NB-017_S02_V2_TAB_desviaciones.csv` | Bitácora de desviaciones con paso y motivo |
| `NB-017_S02_V2_TAB.sha256` | Huella SHA-256 de ambos archivos (`sha256sum -c` la verifica) |

## Indicadores que registra la tableta

La fuente `TAB` y los indicadores marcados como *nuevo* no están en el catálogo de §9.3.3 y hay que agregarlos.

| Indicador | Unidad | Cuándo |
| --- | --- | --- |
| `evento_<nombre>` *(nuevo)* | marca (valor 1) | Marcadores: `inicio_<paso>`, `fin_<paso>`, `sync_toque`, `INICIO`, `senal_verificada`, `reajuste_correa`, `nivel_inicio`, `prorroga_60s`, `pausa_nino`, `reanudar`, `inicio_etapa`, `fin_etapa`, `fin_carga`, `t0`, `traslado_silla`, `FIN` |
| `carga_nivel` | nivel | Inicio de cada nivel de los bloques cognitivo y sensorial |
| `nback_correcto` *(nuevo)* | binario | Cada ensayo n-back (acierto o rechazo correcto = 1) |
| `rt_ms` *(nuevo)* | ms | Tiempo de reacción de cada respuesta n-back |
| `nback_aciertos`, `nback_omisiones`, `nback_falsas_alarmas`, `nback_rechazos_correctos`, `nback_rt_medio_ms` *(nuevos)* | n / ms | Resumen al terminar cada nivel completo |
| `sensorial_ganancia` *(nuevo)* | relativa | Ganancia calibrada usada en cada nivel sensorial |
| `mclb_valida` *(nuevo)* | binario | Resultado del MCLB reportado por el dispositivo |
| `potencia_w`, `omni` | W / puntos | Carga física (por etapa) y OMNI al minuto 1 de la recuperación |
| `fin_carga_motivo` *(nuevo)* | código | 1 FC ≥ 170, 2 OMNI ≥ 8, 3 síntomas, 4 criterio pediátrico, 5 decisión del participante, 6 otro |
| `pa_sis`, `pa_dia`, `spo2` | mmHg / % | Cuando el personal las registra |
| `itr_s` / `itr_censurado` *(nuevo)* | s / binario | ITR reportado por el C&W, o censura a 600 s |
| `dolor_fpsr` *(nuevo)* | puntos | FPS-R de la venopunción (V2), bloque `venopuncion` |
| `correa_orificio`, `piel_eritema` *(nuevos)* | — | Instrumentación y cierre |
| `agrado`, `sus_1`…`sus_10`, `sus_total` *(nuevos)* | puntos | Cierre (niño y cuidador) |

## Diario de episodios (módulo ecológico)

`/investigacion/diario` (roles `parent`, `specialist`, `admin`): la familia anota hora de inicio, contexto (casa, escuela, traslado, otro) y duración de cada episodio durante las 72 h (§7.8). Sin texto libre. Se guarda en el teléfono y se descarga como `NB-017_ECO_DIARIO.csv` (fuente `DIARIO`, fase `ecologico`, indicador `episodio_duracion_min`, bloque = contexto) con su `.sha256`.

## Pendientes conocidos

- Los sonidos del bloque sensorial son sintetizados. El grupo asesor (§10.5) debe revisarlos y, si se decide, reemplazarlos por grabaciones; el volumen se calibra en sala con sonómetro desde `/investigacion`.
- El SUS usa una traducción de trabajo; sustituirla por una versión validada si existe.
- La FPS-R se aplica con la tarjeta oficial; la tableta solo registra el valor.
- El reloj de la tableta debe sincronizarse por NTP con la pasarela desde el sistema operativo; los tres toques permiten la alineación fina.
- Los tiempos de reacción incluyen la latencia de pantalla y táctil de la tableta (no medida).
