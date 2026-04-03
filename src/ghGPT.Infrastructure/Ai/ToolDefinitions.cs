using ghGPT.Core.Ai;

namespace ghGPT.Infrastructure.Ai;

internal static class ToolDefinitions
{
    public static IReadOnlyList<ToolDefinition> All =>
    [
        new()
        {
            Function = new()
            {
                Name = "get_status",
                Description = "Zeigt staged und unstaged Änderungen im Repository an.",
                Parameters = new
                {
                    type = "object",
                    properties = new { },
                    required = Array.Empty<string>()
                }
            }
        },
        new()
        {
            Function = new()
            {
                Name = "get_branches",
                Description = "Listet alle lokalen und Remote-Branches des Repositories auf.",
                Parameters = new
                {
                    type = "object",
                    properties = new { },
                    required = Array.Empty<string>()
                }
            }
        },
        new()
        {
            Function = new()
            {
                Name = "checkout_branch",
                Description = "Wechselt zu einem vorhandenen Branch.",
                Parameters = new
                {
                    type = "object",
                    properties = new
                    {
                        name = new { type = "string", description = "Name des Branches, zu dem gewechselt werden soll." }
                    },
                    required = new[] { "name" }
                }
            }
        },
        new()
        {
            Function = new()
            {
                Name = "create_branch",
                Description = "Erstellt einen neuen Branch, optional von einem bestimmten Startpunkt.",
                Parameters = new
                {
                    type = "object",
                    properties = new
                    {
                        name = new { type = "string", description = "Name des neuen Branches." },
                        start_point = new { type = "string", description = "Optionaler Startpunkt (Branch-Name oder Commit-SHA)." }
                    },
                    required = new[] { "name" }
                }
            }
        },
        new()
        {
            Function = new()
            {
                Name = "get_history",
                Description = "Ruft die Commit-History des Repositories ab.",
                Parameters = new
                {
                    type = "object",
                    properties = new
                    {
                        count = new { type = "integer", description = "Anzahl der zurückzugebenden Commits (Standard: 10, Maximum: 50)." }
                    },
                    required = Array.Empty<string>()
                }
            }
        },
        new()
        {
            Function = new()
            {
                Name = "fetch",
                Description = "Aktualisiert den Remote-Stand des Repositories (git fetch).",
                Parameters = new
                {
                    type = "object",
                    properties = new { },
                    required = Array.Empty<string>()
                }
            }
        }
    ];
}
