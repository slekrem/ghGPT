namespace ghGPT.Core.Ai;

public class OllamaStatus
{
    public bool Online { get; set; }
    public string BaseUrl { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
}
