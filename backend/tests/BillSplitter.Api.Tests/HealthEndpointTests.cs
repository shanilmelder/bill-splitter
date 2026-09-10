using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace BillSplitter.Api.Tests;

/// <summary>
/// Integration tests for the HTTP surface of BS-27: the health probe and the
/// ProblemDetails error shape. Note the API project ships no wwwroot, so these
/// also prove the host starts with the web root absent (the dev-mode setup,
/// where Vite serves the frontend).
/// </summary>
public sealed class HealthEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public HealthEndpointTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact]
    public async Task GetHealth_ReturnsOkStatusAndVersion()
    {
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);

        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal("ok", payload.GetProperty("status").GetString());

        var version = payload.GetProperty("version").GetString();
        Assert.False(string.IsNullOrWhiteSpace(version));
    }

    [Fact]
    public async Task GetUnknownApiPath_ReturnsNotFoundProblemDetails()
    {
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync("/api/does-not-exist");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal("about:blank", problem.GetProperty("type").GetString());
        Assert.Equal("Not Found", problem.GetProperty("title").GetString());
        Assert.Equal(404, problem.GetProperty("status").GetInt32());
        Assert.False(string.IsNullOrWhiteSpace(problem.GetProperty("detail").GetString()));
    }

    [Fact]
    public async Task GetSpaRoute_IsHandledByTheFileFallbackNotTheApiHandler()
    {
        // No wwwroot is published in the test run, so the SPA fallback has nothing to
        // serve and the request ends as a bare 404. The point is that the host started
        // at all without a web root, and that the /api ProblemDetails handler did not
        // claim a non-API path.
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync("/some/client-side/route");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("No API endpoint matches", body);
    }
}
