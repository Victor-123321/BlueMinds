// NeuroBlueMinds/Program.cs

using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using System.Threading.RateLimiting;
using NeuroBlueMinds.Client.Pages;
using NeuroBlueMinds.Components;
using NeuroBlueMinds.Server.Endpoints;
using NeuroBlueMinds.Data;
using Npgsql;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Swashbuckle.AspNetCore;
using Microsoft.OpenApi;
using NeuroBlueMinds.Server.Services;
using NeuroBlueMinds.Shared.Interfaces;
using NeuroBlueMinds.Shared.DTOs;
using NeuroBlueMinds.Shared;


var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
  Args = args,
  WebRootPath = "wwwroot"
});

builder.Services.AddRazorComponents()
    .AddInteractiveWebAssemblyComponents();

builder.Services.AddHttpContextAccessor();
builder.Services.AddHttpClient();

// Named HTTP client for VARK API
builder.Services.AddHttpClient("vark", client =>
{
  client.BaseAddress = new Uri("https://vark-learn.com/");
  client.DefaultRequestHeaders.Add("Accept", "application/json");
  client.Timeout = TimeSpan.FromSeconds(30);
});

// ── Server-side services ──────────────────────────────────────────────────────
builder.Services.AddScoped<IAuthService, ServerAuthService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
// Also register DashboardService as itself so controllers that inject the
// concrete class (e.g. AchievementsController) can be resolved by DI.
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<IGroqService, GroqService>();
builder.Services.AddScoped<IVarkService, VarkService>();
builder.Services.AddScoped<IAdaptiveEngineService, AdaptiveEngineService>();
builder.Services.AddScoped<IEmailService, SmtpEmailService>();

// Register ClientLocalizationService server-side as a stub so SSR prerender
// of any page that injects Loc doesn't throw "no registered service".
builder.Services.AddScoped<ClientLocalizationService>();

builder.Services.AddDbContext<NeuroBlueMindsDbContext>(options =>
{
  var connString = builder.Configuration.GetConnectionString("DefaultConnection")
      ?? throw new InvalidOperationException(
          "ConnectionStrings:DefaultConnection is not configured. " +
          "Set it via environment variable or web.config <environmentVariables>.");
  var dataSourceBuilder = new NpgsqlDataSourceBuilder(connString);
  options.UseNpgsql(dataSourceBuilder.Build());
});

// ── JWT ───────────────────────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException(
        "Jwt:Key is not configured. Set it via environment variable.");

var jwtIssuer   = builder.Configuration["Jwt:Issuer"]
    ?? builder.Configuration["App:BaseUrl"]
    ?? throw new InvalidOperationException("Jwt:Issuer / App:BaseUrl is not configured.");

var jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? builder.Configuration["App:BaseUrl"]
    ?? jwtIssuer;

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
      options.TokenValidationParameters = new TokenValidationParameters
      {
        ValidateIssuer           = true,
        ValidateAudience         = true,
        ValidateLifetime         = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer              = jwtIssuer,
        ValidAudience            = jwtAudience,
        IssuerSigningKey         = new SymmetricSecurityKey(
                                       Encoding.UTF8.GetBytes(jwtKey))
      };
    });

// ── Rate limiting (built-in .NET 7+) ─────────────────────────────────────────
// "auth" policy: 10 requests per minute per IP on auth endpoints.
// Prevents brute-force on /api/auth/login, /api/auth/register, /api/auth/google.
builder.Services.AddRateLimiter(options =>
{
  options.AddFixedWindowLimiter("auth", opt =>
  {
    opt.Window            = TimeSpan.FromMinutes(1);
    opt.PermitLimit       = 10;
    opt.QueueLimit        = 0;
    opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
  });

  // Generic API limiter: 120 requests/min per IP for all other endpoints.
  options.AddFixedWindowLimiter("api", opt =>
  {
    opt.Window      = TimeSpan.FromMinutes(1);
    opt.PermitLimit = 120;
    opt.QueueLimit  = 0;
  });

  // Return 429 with a Retry-After header instead of the default 503.
  options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// ── Response compression ──────────────────────────────────────────────────────
// Compresses JSON API responses. Blazor WASM .gz/.br static assets are served
// pre-compressed by MapStaticAssets() and don't go through this middleware.
builder.Services.AddResponseCompression(options =>
{
  options.EnableForHttps = true;
  options.Providers.Add<BrotliCompressionProvider>();
  options.Providers.Add<GzipCompressionProvider>();
  // Only compress content types that benefit from it.
  options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(new[]
  {
    "application/json",
    "application/javascript",
    "text/javascript",
    "text/css",
    "image/svg+xml"
  });
});

builder.Services.Configure<BrotliCompressionProviderOptions>(opt =>
    opt.Level = System.IO.Compression.CompressionLevel.Optimal);
builder.Services.Configure<GzipCompressionProviderOptions>(opt =>
    opt.Level = System.IO.Compression.CompressionLevel.SmallestSize);

// ── Health checks ─────────────────────────────────────────────────────────────
// Custom DB check: runs a lightweight SELECT 1 via the EF connection.
// No external NuGet package needed — works with any EF Core version.
builder.Services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("database", failureStatus: HealthStatus.Degraded);

// ── Swagger ───────────────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
  c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
  {
    In          = ParameterLocation.Header,
    Description = "JWT Authorization header usando Bearer",
    Name        = "Authorization",
    Type        = SecuritySchemeType.ApiKey,
    Scheme      = "Bearer"
  });
});

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
  options.AddPolicy("AllowBlazor", policy =>
  {
    // Use GetChildren() instead of Get<string[]>() — more reliable when origins
    // come from environment variables with indexed keys (Cors__AllowedOrigins__0, __1 …).
    var origins = builder.Configuration
        .GetSection("Cors:AllowedOrigins")
        .GetChildren()
        .Select(c => c.Value!)
        .Where(v => !string.IsNullOrWhiteSpace(v))
        .ToArray();

    if (origins.Length == 0)
    {
      if (builder.Environment.IsDevelopment())
        origins = new[] { "https://localhost:5001", "http://localhost:5500", "http://localhost:3000" };
      else
      {
        // Last-resort fallback: read App:BaseUrl so a single env var is enough
        var baseUrl = builder.Configuration["App:BaseUrl"];
        if (!string.IsNullOrWhiteSpace(baseUrl))
          origins = new[] { baseUrl };
        else
          throw new InvalidOperationException(
              "Cors:AllowedOrigins (or App:BaseUrl) must be configured in production.");
      }
    }

    policy.WithOrigins(origins)
          .AllowAnyMethod()
          .AllowAnyHeader()
          .AllowCredentials();
  });
});

var app = builder.Build();

// ── Auto-migrate on startup ───────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
  var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
  try
  {
    var db = scope.ServiceProvider.GetRequiredService<NeuroBlueMindsDbContext>();
    await db.Database.MigrateAsync();
    logger.LogInformation("[Startup] Database migrations applied successfully.");
  }
  catch (Exception ex)
  {
    // Never crash the process on migration failure — the app still starts
    // so the operator can see logs and fix the connection string.
    logger.LogError(ex, "[Startup] Failed to apply database migrations. App will still start.");
  }
}

// ── Middleware pipeline ───────────────────────────────────────────────────────
// ORDER MATTERS: compression → https → cors → rate limiting → static → auth → endpoints

if (app.Environment.IsDevelopment())
{
  app.UseWebAssemblyDebugging();
  app.UseSwagger();
  app.UseSwaggerUI();
}
else
{
  app.UseExceptionHandler("/Error", createScopeForErrors: true);
  app.UseHsts();
}

app.UseResponseCompression();                   // Must be before anything that writes a response body
app.UseStatusCodePagesWithReExecute("/not-found", createScopeForStatusCodePages: true);

// For outofprocess IIS hosting: IIS terminates HTTPS and forwards plain HTTP to
// the app process. Without this, UseHttpsRedirection() sees every request as HTTP
// and issues a 307 redirect → infinite loop. UseForwardedHeaders must run FIRST
// so the app trusts X-Forwarded-Proto: https from IIS.
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
  ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});
app.UseHttpsRedirection();
app.UseCors("AllowBlazor");
app.UseRateLimiter();
app.UseAntiforgery();
app.UseAuthentication();
app.UseAuthorization();

// Static files with 1-year cache for fingerprinted assets.
// The browser only caches files that have a content-hash in the URL (Blazor does this).
app.UseStaticFiles(new StaticFileOptions
{
  OnPrepareResponse = ctx =>
  {
    var headers = ctx.Context.Response.Headers;
    var path    = ctx.File.Name;
    // Hash-fingerprinted files (e.g. app.abc123.js) can be cached indefinitely.
    // Everything else gets a short cache (1 hour) so updates are picked up quickly.
    if (path.Contains('.') && (
        path.EndsWith(".js")   || path.EndsWith(".css") ||
        path.EndsWith(".wasm") || path.EndsWith(".gz")  || path.EndsWith(".br")))
      headers.CacheControl = "public, max-age=31536000, immutable";
    else
      headers.CacheControl = "public, max-age=3600";
  }
});

// ── Map endpoints ─────────────────────────────────────────────────────────────
app.MapHealthChecks("/health").AllowAnonymous();
app.MapAuthEndpoints();
app.MapControllers();
app.MapStaticAssets();
// El JWT vive en localStorage, así que el servidor nunca puede autenticar la
// carga de una página: sin AllowAnonymous, los [Authorize] de las páginas
// responden 401 → UseStatusCodePagesWithReExecute pinta /not-found (el "404"
// que se veía al cargar). La autorización real la hace AuthorizeRouteView en WASM.
app.MapRazorComponents<App>()
    .AddInteractiveWebAssemblyRenderMode()
    .AddAdditionalAssemblies(typeof(NeuroBlueMinds.Client._Imports).Assembly)
    .AllowAnonymous();

app.Run();
