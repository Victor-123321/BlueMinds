// NeuroBlueMinds.Client/Services/ClientLocalizationService.cs
// WASM-side i18n — loads JSON locale files from wwwroot/locales/
// Persists preference in localStorage.
// Add this as a scoped service in Client Program.cs.

using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.JSInterop;
using NeuroBlueMinds.Shared.Interfaces;

public class ClientLocalizationService : ILocalizationService
{
  private readonly HttpClient? _http;
  private readonly IJSRuntime? _js;
  private readonly ILogger<ClientLocalizationService> _logger;
  private Dictionary<string, string> _strings = new();

  public string CurrentLocale { get; private set; } = "es-MX";

  public IReadOnlyList<LocaleInfo> SupportedLocales { get; } = new List<LocaleInfo>
    {
        new("es-MX", "Español (México)", "🇲🇽"),
        new("en-US", "English (US)",     "🇺🇸"),
        new("es-ES", "Español (España)", "🇪🇸"),
        new("pt-BR", "Português (BR)",   "🇧🇷"),
    };

  // Event so components can re-render on locale change
  public event Action? OnLocaleChanged;

  // Full constructor used by WASM client
  public ClientLocalizationService(HttpClient http, IJSRuntime js, ILogger<ClientLocalizationService> logger)
  {
    _http = http;
    _js = js;
    _logger = logger;
  }

  // Parameterless constructor for server-side SSR prerender
  // Returns default strings only — WASM will reinitialize on load
  public ClientLocalizationService()
  {
    _logger = new NullLogger<ClientLocalizationService>();
  }

  /// <summary>Call this once from client Program.cs after host.Build().</summary>
  public async Task InitializeAsync()
  {
    // Read persisted preference — safe no-op if running server-side
    try
    {
      if (_js != null)
      {
        var saved = await _js.InvokeAsync<string>("localStorage.getItem", "nbm_locale");
        if (!string.IsNullOrEmpty(saved) && SupportedLocales.Any(l => l.Code == saved))
          CurrentLocale = saved;
      }
    }
    catch { /* localStorage unavailable in SSR */ }

    await LoadStringsAsync(CurrentLocale);
  }

  public string T(string key)
  {
    return _strings.TryGetValue(key, out var val) ? val : key;
  }

  public string T(string key, params object[] args)
  {
    var template = T(key);
    try { return string.Format(template, args); }
    catch { return template; }
  }

  public async Task SetLocaleAsync(string locale)
  {
    if (CurrentLocale == locale) return;
    CurrentLocale = locale;
    await LoadStringsAsync(locale);
    try
    {
      if (_js != null)
        await _js.InvokeVoidAsync("localStorage.setItem", "nbm_locale", locale);
    }
    catch { }
    OnLocaleChanged?.Invoke();
  }

  private async Task LoadStringsAsync(string locale)
  {
    if (_http == null) return;   // server-side SSR: no HTTP, use key-as-fallback
    try
    {
      var dict = await _http.GetFromJsonAsync<Dictionary<string, string>>(
          $"locales/{locale}.json");
      _strings = dict ?? new();
    }
    catch (Exception ex)
    {
      _logger.LogError(ex, "Failed to load locale {locale}", locale);
    }
  }
}
