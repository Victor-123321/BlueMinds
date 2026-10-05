// NeuroBlueMinds.Client/Program.cs — COMPLETE REPLACEMENT
// Key change: HttpClient now goes through ChildAwareHttpHandler
// which auto-swaps parent/child JWT so all existing endpoints work with zero changes.

using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Microsoft.AspNetCore.Components.Authorization;
using NeuroBlueMinds.Client.Services;
using NeuroBlueMinds.Client.Research;
using NeuroBlueMinds.Shared.Interfaces;

var builder = WebAssemblyHostBuilder.CreateDefault(args);

// ── HTTP client with child-aware token handler ───────────────────────────────
builder.Services.AddTransient<ChildAwareHttpHandler>();
builder.Services.AddScoped(sp =>
{
  var handler = sp.GetRequiredService<ChildAwareHttpHandler>();
  handler.InnerHandler = new HttpClientHandler();
  return new HttpClient(handler)
  {
    BaseAddress = new Uri(builder.HostEnvironment.BaseAddress)
  };
});

// ── Auth ──────────────────────────────────────────────────────────────────────
builder.Services.AddScoped<IAuthService, WebAuthService>();
builder.Services.AddScoped<CustomAuthStateProvider>();
builder.Services.AddScoped<AuthenticationStateProvider>(sp =>
    sp.GetRequiredService<CustomAuthStateProvider>());
builder.Services.AddAuthorizationCore();

// ── Services ──────────────────────────────────────────────────────────────────
builder.Services.AddScoped<IDashboardService, ClientDashboardService>();
builder.Services.AddScoped<ClientLocalizationService>();

// ── Módulo de sesión en tableta (protocolo C&W-NM); datos solo en localStorage ──
builder.Services.AddScoped<ResearchStore>();

var host = builder.Build();

await host.Services.GetRequiredService<ClientLocalizationService>().InitializeAsync();

await host.RunAsync();
