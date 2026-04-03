using GhCli.Net;

var client = new GhClient();

Console.WriteLine("=== GhCli.Net Console ===");
Console.WriteLine();

var owner = args.ElementAtOrDefault(0) ?? "slekrem";
var repo = args.ElementAtOrDefault(1) ?? "ghGPT";
var command = args.ElementAtOrDefault(2) ?? "all";

Console.WriteLine($"Repository: {owner}/{repo}");
Console.WriteLine();

try
{
    switch (command)
    {
        case "discussions":
            await ShowDiscussionsAsync();
            break;
        case "prs":
            var state = args.ElementAtOrDefault(3) ?? "open";
            await ShowPullRequestsAsync(state);
            break;
        case "pr" when args.ElementAtOrDefault(3) is { } numberArg && int.TryParse(numberArg, out var number):
            await ShowPullRequestDetailAsync(number);
            break;
        case "pr":
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("Verwendung: <owner> <repo> pr <nummer>  (z.B. pr 42)");
            Console.ResetColor();
            break;
        default:
            await ShowDiscussionsAsync();
            Console.WriteLine();
            await ShowPullRequestsAsync();
            break;
    }
}
catch (InvalidOperationException ex)
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine($"Fehler: {ex.Message}");
    Console.ResetColor();
}

async Task ShowDiscussionsAsync()
{
    Console.WriteLine("── Discussions ──────────────────────────");
    var discussions = await client.Discussion.ListAsync(owner, repo);

    if (discussions.Count == 0)
    {
        Console.WriteLine("  Keine Discussions gefunden.");
        return;
    }

    foreach (var d in discussions)
    {
        Console.WriteLine($"  #{d.Number} [{d.Category.Name}] {d.Title}");
        Console.WriteLine($"           Autor: {d.Author.Login} | {d.CreatedAt:dd.MM.yyyy}");
        Console.WriteLine($"           {d.Url}");
        Console.WriteLine();
    }
}

async Task ShowPullRequestsAsync(string state = "open")
{
    Console.WriteLine($"── Pull Requests ({state}) ──────────────────");
    var prs = await client.PullRequest.ListAsync(owner, repo, state);

    if (prs.Count == 0)
    {
        Console.WriteLine("  Keine Pull Requests gefunden.");
        return;
    }

    foreach (var pr in prs)
    {
        var draft = pr.IsDraft ? " [DRAFT]" : string.Empty;
        var labels = pr.Labels.Count > 0 ? $" [{string.Join(", ", pr.Labels.Select(l => l.Name))}]" : string.Empty;
        Console.WriteLine($"  #{pr.Number}{draft}{labels} {pr.Title}");
        Console.WriteLine($"           Autor: {pr.Author.Login} | {pr.HeadRefName} → {pr.BaseRefName}");
        Console.WriteLine($"           {pr.Url}");
        Console.WriteLine();
    }
}

async Task ShowPullRequestDetailAsync(int number)
{
    Console.WriteLine($"── Pull Request #{number} ───────────────────");
    var pr = await client.PullRequest.GetDetailAsync(owner, repo, number);

    Console.WriteLine($"  {pr.Title}");
    Console.WriteLine($"  Status:  {pr.State}{(pr.IsDraft ? " (Draft)" : string.Empty)}");
    Console.WriteLine($"  Autor:   {pr.Author.Login}");
    Console.WriteLine($"  Branch:  {pr.HeadRefName} → {pr.BaseRefName}");
    Console.WriteLine($"  CI:      {(pr.CiHasCombinedStatus ? (pr.CiPassing ? "✓ Passing" : "✗ Failing") : "Kein Status")}");
    Console.WriteLine();

    if (!string.IsNullOrWhiteSpace(pr.Body))
    {
        Console.WriteLine("  Beschreibung:");
        Console.WriteLine($"  {pr.Body.Replace("\n", "\n  ")}");
        Console.WriteLine();
    }

    if (pr.Reviews.Count > 0)
    {
        Console.WriteLine("  Reviews:");
        foreach (var r in pr.Reviews)
            Console.WriteLine($"    {r.Author.Login}: {r.State} ({r.SubmittedAt:dd.MM.yyyy})");
        Console.WriteLine();
    }

    if (pr.Files.Count > 0)
    {
        Console.WriteLine($"  Geänderte Dateien ({pr.Files.Count}):");
        foreach (var f in pr.Files)
            Console.WriteLine($"    {f.ChangeType,-10} {f.Path}  +{f.Additions}/-{f.Deletions}");
        Console.WriteLine();
    }

    Console.WriteLine($"  {pr.Url}");
}
