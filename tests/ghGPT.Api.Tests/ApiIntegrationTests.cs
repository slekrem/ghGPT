using Microsoft.AspNetCore.Mvc.Testing;

namespace ghGPT.Api.Tests;

public class ApiIntegrationTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Swagger_ReturnsOk()
    {
        var response = await _client.GetAsync("/swagger/index.html");
        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task SwaggerJson_ReturnsValidSpec()
    {
        var response = await _client.GetAsync("/swagger/v1/swagger.json");
        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);

        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"openapi\"", content);
    }
}
