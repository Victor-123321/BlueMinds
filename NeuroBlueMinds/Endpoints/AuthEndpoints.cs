using Google.Apis.Auth;
using NeuroBlueMinds.Shared.DTOs;
using NeuroBlueMinds.Shared.Interfaces;

namespace NeuroBlueMinds.Server.Endpoints;

public static class AuthEndpoints
{
    // Mensaje para cualquier fallo que no es culpa del usuario (BD caída, config, red).
    // El detalle va al log, nunca a la respuesta: antes se filtraban errores de Postgres
    // con el usuario de la base al formulario de login.
    private const string GenericError = "No pudimos completar la solicitud. Intenta de nuevo en unos minutos.";

    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        // "auth" rate-limit policy: 10 requests/min per IP (brute-force protection).
        // Defined in Program.cs AddRateLimiter("auth").
        var group = app.MapGroup("/api/auth");

        group.MapPost("/google", (GoogleAuthDto dto, IAuthService authService, ILoggerFactory lf) =>
            Run(lf, "google", () => authService.GoogleAuthAsync(dto)))
            .RequireRateLimiting("auth");

        group.MapPost("/login", (LoginDto dto, IAuthService authService, ILoggerFactory lf) =>
            Run(lf, "login", () => authService.LoginAsync(dto)))
            .RequireRateLimiting("auth");

        group.MapPost("/register", (RegisterDto dto, IAuthService authService, ILoggerFactory lf) =>
            Run(lf, "register", () => authService.RegisterAsync(dto)))
            .RequireRateLimiting("auth");

        group.MapGet("/profile", async (IAuthService authService) =>
        {
            try   { return Results.Ok(await authService.GetProfileAsync()); }
            catch { return Results.Unauthorized(); }
        }).RequireAuthorization();

        group.MapPatch("/update-profile", (UpdateProfileDto dto, IAuthService authService, ILoggerFactory lf) =>
            Run(lf, "update-profile", () => authService.UpdateProfileAsync(dto)))
            .RequireAuthorization();

        group.MapPost("/complete-profile", (CompleteProfileDto dto, IAuthService authService, ILoggerFactory lf) =>
            Run(lf, "complete-profile", () => authService.CompleteProfileAsync(dto)))
            .RequireAuthorization();
    }

    // Solo las excepciones que AuthService lanza a propósito con un mensaje para
    // el usuario llegan tal cual; todo lo demás se registra y se responde genérico.
    private static async Task<IResult> Run<T>(ILoggerFactory lf, string action, Func<Task<T>> call)
    {
        try
        {
            return Results.Ok(await call());
        }
        catch (UnauthorizedAccessException ex)
        {
            return Results.Json(new { error = ex.Message }, statusCode: StatusCodes.Status401Unauthorized);
        }
        catch (InvalidJwtException)
        {
            return Results.Json(new { error = "No pudimos verificar tu cuenta de Google. Intenta de nuevo." },
                                statusCode: StatusCodes.Status401Unauthorized);
        }
        catch (Exception ex) when (ex is BadHttpRequestException or KeyNotFoundException)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            lf.CreateLogger("AuthEndpoints").LogError(ex, "[Auth] {Action} falló", action);
            return Results.Json(new { error = GenericError }, statusCode: StatusCodes.Status503ServiceUnavailable);
        }
    }
}
