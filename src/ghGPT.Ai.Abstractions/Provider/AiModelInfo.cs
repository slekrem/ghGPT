namespace ghGPT.Ai.Abstractions;

public class AiModelInfo
{
    public string Name { get; set; } = string.Empty;
    public long Size { get; set; }
    public DateTime ModifiedAt { get; set; }
}
