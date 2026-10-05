using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.JSInterop;

namespace NeuroBlueMinds.Client.Services;

/// <summary>
/// Reads the active JWT from localStorage.
/// Priority: childToken (when a child profile is selected) → authToken (parent/specialist/admin).
/// This means GetAuthenticationStateAsync() always reflects WHOEVER is actively using the app.
/// </summary>
public class CustomAuthStateProvider : AuthenticationStateProvider
{
    private readonly IJSRuntime _js;
    private readonly HttpClient _http;
    private readonly ClaimsPrincipal _anonymous = new(new ClaimsIdentity());

    public CustomAuthStateProvider(IJSRuntime js, HttpClient http)
    {
        _js   = js;
        _http = http;
    }

    public override async Task<AuthenticationState> GetAuthenticationStateAsync()
    {
        try
        {
            // childToken is set when a parent taps a child card in FamilySelector.
            // When present it represents the active user (the child).
            var childToken = await _js.InvokeAsync<string?>("localStorage.getItem", "childToken");
            var authToken  = await _js.InvokeAsync<string?>("localStorage.getItem", "authToken");

            var token = !string.IsNullOrWhiteSpace(childToken) ? childToken : authToken;

            if (string.IsNullOrWhiteSpace(token))
                return new AuthenticationState(_anonymous);

            // Keep the HttpClient header in sync so server calls use the right token.
            _http.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            var claims   = ParseClaimsFromJwt(token);
            var identity = new ClaimsIdentity(claims, "jwt");
            return new AuthenticationState(new ClaimsPrincipal(identity));
        }
        catch
        {
            return new AuthenticationState(_anonymous);
        }
    }

    /// <summary>Called after login / token refresh to update the auth UI immediately.</summary>
    public void NotifyUserLogin(string token)
    {
        var identity = new ClaimsIdentity(ParseClaimsFromJwt(token), "jwt");
        NotifyAuthenticationStateChanged(
            Task.FromResult(new AuthenticationState(new ClaimsPrincipal(identity))));
    }

    public void NotifyUserLogout()
    {
        _http.DefaultRequestHeaders.Authorization = null;
        NotifyAuthenticationStateChanged(
            Task.FromResult(new AuthenticationState(_anonymous)));
    }

    /// <summary>True when the currently authenticated user still needs to complete onboarding.</summary>
    public async Task<bool> UserNeedsOnboarding()
    {
        var state = await GetAuthenticationStateAsync();
        var user  = state.User;
        if (user.Identity == null || !user.Identity.IsAuthenticated) return false;
        var hasBirth   = user.HasClaim(c => c.Type == "birth");
        var hasCountry = user.HasClaim(c => c.Type == "country");
        return !hasBirth || !hasCountry;
    }

    // ── JWT parsing ───────────────────────────────────────────────────────────

    private static IEnumerable<Claim> ParseClaimsFromJwt(string jwt)
    {
        var parts = jwt.Split('.');
        if (parts.Length != 3) return Enumerable.Empty<Claim>();

        var payload   = PadBase64(parts[1]);
        var jsonBytes = Convert.FromBase64String(payload);
        var kvp       = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(jsonBytes);
        if (kvp == null) return Enumerable.Empty<Claim>();

        var claims = new List<Claim>();
        foreach (var (key, value) in kvp)
        {
            // Arrays (e.g. roles claim) → one Claim per entry
            if (value.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in value.EnumerateArray())
                    claims.Add(new Claim(key, item.ToString()));
            }
            else
            {
                claims.Add(new Claim(key, value.ToString()));
            }
        }
        return claims;
    }

    private static string PadBase64(string base64)
    {
        base64 = base64.Replace('-', '+').Replace('_', '/');
        return (base64.Length % 4) switch
        {
            2 => base64 + "==",
            3 => base64 + "=",
            _ => base64
        };
    }
}
