// NeuroBlueMinds.Shared/Interfaces/ILocalizationService.cs
// i18n foundation — scalable to any number of locales

namespace NeuroBlueMinds.Shared.Interfaces;

/// <summary>
/// Provides translated strings for the current locale.
/// Implementations: ServerLocalizationService (reads from resource files),
/// ClientLocalizationService (reads from embedded JSON loaded at startup).
/// </summary>
public interface ILocalizationService
{
    /// <summary>Current locale code e.g. "es-MX", "en-US", "pt-BR"</summary>
    string CurrentLocale { get; }

    /// <summary>Get a translated string by key. Returns key if not found.</summary>
    string T(string key);

    /// <summary>Get a translated string with format arguments.</summary>
    string T(string key, params object[] args);

    /// <summary>Switch to a new locale and persist the preference.</summary>
    Task SetLocaleAsync(string locale);

    /// <summary>All supported locale codes.</summary>
    IReadOnlyList<LocaleInfo> SupportedLocales { get; }
}

public record LocaleInfo(string Code, string NativeName, string FlagEmoji);
