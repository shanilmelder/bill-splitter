using System.Reflection;

var builder = WebApplication.CreateBuilder(args);

// ProblemDetails (RFC 9457) is the error shape for every endpoint on this service.
builder.Services.AddProblemDetails();

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

// Serve the published SPA out of wwwroot when it is there. During development the
// Vite dev server hosts the frontend and proxies /api here, so wwwroot is absent or
// empty — both middlewares tolerate a missing web root, and the host still starts.
app.UseDefaultFiles();
app.UseStaticFiles();

var api = app.MapGroup("/api");

api.MapGet("/health", () => Results.Ok(new HealthResponse("ok", AppVersion.Current)));

// Anything unmatched under /api must be a 404 ProblemDetails, never the SPA shell —
// otherwise a mistyped API call returns HTML with a 200 and the client can't tell.
api.MapFallback("/{*rest}", (HttpContext http) => Results.Problem(
    type: "about:blank",
    title: "Not Found",
    statusCode: StatusCodes.Status404NotFound,
    detail: $"No API endpoint matches '{http.Request.Method} {http.Request.Path}'."));

// Every other unmatched path is a client-side route: hand back the SPA shell so the
// browser router can resolve it. Yields 404 when wwwroot/index.html is not published.
app.MapFallbackToFile("index.html");

app.Run();

/// <summary>Response body of <c>GET /api/health</c>.</summary>
internal sealed record HealthResponse(string Status, string Version);

internal static class AppVersion
{
    /// <summary>Informational assembly version, with any build metadata suffix trimmed.</summary>
    internal static string Current { get; } = Resolve();

    private static string Resolve()
    {
        var assembly = typeof(AppVersion).Assembly;
        var informational = assembly
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion;

        if (!string.IsNullOrWhiteSpace(informational))
        {
            var plus = informational.IndexOf('+');
            return plus >= 0 ? informational[..plus] : informational;
        }

        return assembly.GetName().Version?.ToString(3) ?? "0.0.0";
    }
}
