using GhCli.Net;

var client = new GhClient();

Console.WriteLine("=== GhCli.Net Console ===");
Console.WriteLine();

var owner = args.ElementAtOrDefault(0) ?? "slekrem";
var repo = args.ElementAtOrDefault(1) ?? "ghGPT";

Console.WriteLine($"Repository: {owner}/{repo}");
Console.WriteLine();

try
{
    Console.WriteLine("Lade Discussions...");
    var discussions = await client.Discussion.ListAsync(owner, repo);

    if (discussions.Count == 0)
    {
        Console.WriteLine("Keine Discussions gefunden.");
    }
    else
    {
        Console.WriteLine($"{discussions.Count} Discussion(s) gefunden:");
        Console.WriteLine();
        foreach (var d in discussions)
        {
            Console.WriteLine($"  #{d.Number} [{d.Category.Name}] {d.Title}");
            Console.WriteLine($"         Autor: {d.Author.Login} | {d.CreatedAt:dd.MM.yyyy}");
            Console.WriteLine($"         {d.Url}");
            Console.WriteLine();
        }
    }
}
catch (InvalidOperationException ex)
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine($"Fehler: {ex.Message}");
    Console.ResetColor();
}
