using System.Net.Http.Json;
using NeuroBlueMinds.Shared.DTOs;
using NeuroBlueMinds.Shared.Interfaces;
using Microsoft.JSInterop; // Para guardar el token en el navegador

namespace NeuroBlueMinds.Client.Services;

public class WebAuthService : IAuthService
{
  private readonly HttpClient _http;
  private readonly IJSRuntime _js;

  public WebAuthService(HttpClient http, IJSRuntime js)
  {
    _http = http;
    _js = js;
  }

  public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
  {
    var response = await _http.PostAsJsonAsync("api/auth/register", dto);
    return await HandleAuthResponse(response);
  }

  public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
  {
    var response = await _http.PostAsJsonAsync("api/auth/login", dto);
    return await HandleAuthResponse(response);
  }

  public async Task<AuthResponseDto> GoogleAuthAsync(GoogleAuthDto dto)
  {
    var response = await _http.PostAsJsonAsync("api/auth/google", dto);
    return await HandleAuthResponse(response);
  }

  public async Task<UserProfileDto> GetProfileAsync()
  {
    return await _http.GetFromJsonAsync<UserProfileDto>("api/auth/profile")
           ?? throw new Exception("No se pudo obtener el perfil");
  }

  public async Task<UserProfileDto> CompleteProfileAsync(CompleteProfileDto dto)
  {
    var response = await _http.PostAsJsonAsync("api/auth/complete-profile", dto);
    response.EnsureSuccessStatusCode();
    return await response.Content.ReadFromJsonAsync<UserProfileDto>()
           ?? throw new Exception("No se pudo leer el perfil");
  }

  public async Task<UserProfileDto> UpdateProfileAsync(UpdateProfileDto dto)
  {
    var response = await _http.PatchAsJsonAsync("api/auth/update-profile", dto);
    response.EnsureSuccessStatusCode();
    return await response.Content.ReadFromJsonAsync<UserProfileDto>()
           ?? throw new Exception("No se pudo leer el perfil actualizado");
  }

  public async Task LogoutAsync()
  {
    await _js.InvokeVoidAsync("localStorage.removeItem", "authToken");
    // Aquí podrías resetear el header del HttpClient si fuera necesario
  }

  // Helper privado para procesar respuestas de autenticación
  private async Task<AuthResponseDto> HandleAuthResponse(HttpResponseMessage response)
  {
    if (!response.IsSuccessStatusCode)
    {
      try
      {
        // Try to parse structured { error: "..." } JSON first
        var body = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        if (body.TryGetProperty("error", out var errProp))
          throw new Exception(errProp.GetString() ?? "Error en la autenticación");
      }
      catch (Exception ex) when (ex is not InvalidOperationException)
      {
        throw; // re-throw our own exception
      }
      // Fall back to raw text
      var raw = await response.Content.ReadAsStringAsync();
      throw new Exception(string.IsNullOrWhiteSpace(raw) ? "Error en la autenticación" : raw);
    }

    var result = await response.Content.ReadFromJsonAsync<AuthResponseDto>();

    if (result?.Token != null)
    {
      // Guardamos el JWT en el LocalStorage para que persista al refrescar
      await _js.InvokeVoidAsync("localStorage.setItem", "authToken", result.Token);
    }

    return result ?? throw new Exception("Respuesta de autenticación vacía");
  }
}
