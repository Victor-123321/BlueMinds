// NeuroBlueMinds/Services/DatabaseHealthCheck.cs
// Lightweight health check: opens a connection and runs SELECT 1.
// Reported at /health — used by load balancers and uptime monitors.

using Microsoft.Extensions.Diagnostics.HealthChecks;
using NeuroBlueMinds.Data;

namespace NeuroBlueMinds.Server.Services;

public class DatabaseHealthCheck : IHealthCheck
{
    private readonly NeuroBlueMindsDbContext _db;

    public DatabaseHealthCheck(NeuroBlueMindsDbContext db) => _db = db;

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // CanConnectAsync opens a real connection and issues SELECT 1.
            var ok = await _db.Database.CanConnectAsync(cancellationToken);
            return ok
                ? HealthCheckResult.Healthy("Database connection OK.")
                : HealthCheckResult.Degraded("Database is reachable but CanConnect returned false.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Database connection failed.", ex);
        }
    }
}
