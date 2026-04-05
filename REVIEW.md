# Review-Kontext

Diese Datei wird automatisch vom Code-Review geladen und gibt dem Reviewer zusätzlichen Kontext über Projekt-Konventionen und bekannte Patterns.

## C#-Patterns – nicht flaggen

- `?.`-Chaining ist null-sicher by design: `a?.b?.c ?? fallback` wirft nie eine NullReferenceException
- `ArgumentException.ThrowIfNullOrWhiteSpace()` prüft null, Leerstring UND Whitespace – wirft bei null eine `ArgumentNullException`, bei leer/whitespace eine `ArgumentException`. Kein separater null-Check nötig.
- `ArgumentOutOfRangeException.ThrowIfNegativeOrZero()` ist die idiomatische Validierung für positive Zahlen seit .NET 8
- CliWrap mit `string[]`-Argumenten übergibt Werte direkt ans OS ohne Shell-Interpreter – kein Shell-Injection-Risiko
- `gh api graphql -F key=value` übergibt typisierte GraphQL-Variablen (Integer, Boolean) – das ist korrekte Syntax, kein Bug
- `record`-Typen mit `init`-Properties sind immutable by design
- `internal`-Klassen benötigen keine öffentliche Dokumentation
- `switch` in C# hat kein Fall-through – ein `case` fällt nicht automatisch in den nächsten
- `StringBuilder` implementiert `IDisposable` nicht – kein `using`-Statement nötig oder möglich
- `int.TryParse()` wirft keine Exception – gibt `false` zurück bei ungültiger Eingabe
- `Console.WriteLine()` fügt standardmäßig einen Zeilenumbruch ein
- `IAsyncEnumerable` mit `yield return` streamt sofort – ein parallel akkumulierender `StringBuilder` der erst am Ende mit `.ToString()` ausgewertet wird ist korrekt, kein Bug
- `catch (Exception)` für optionale Best-Effort-Operationen (z. B. Hilfsdatei speichern) ist bewusst weit gefasst – kein Redesign nötig

## Projekt-Konventionen

- Fehlermeldungen auf Deutsch, einheitliches Muster: `"... konnte nicht ..."` oder `"... nicht gefunden."`
- GraphQL-Queries werden als Konstanten (`const string`) definiert, nicht inline gebaut
- Eingabevalidierung erfolgt am Methodenanfang mit `ArgumentException.ThrowIfNullOrWhiteSpace`
- JSON-Mapping immer mit expliziten `[JsonPropertyName]`-Attributen – `PropertyNameCaseInsensitive = true` wird nicht verwendet, da es Namenskollisionen maskieren kann

## Test-Konventionen

- Jede neue `public`-Methode braucht mindestens einen Unit-Test
- `private`- und `internal`-Methoden werden **nicht** direkt getestet – sie werden indirekt über öffentliche Methoden abgedeckt
- Testprojekte liegen unter `tests/`, Namensschema: `{Projektname}.Tests`
- Framework: xUnit + NSubstitute für Mocks
- Integrationstests die `gh` CLI aufrufen sind bewusst nicht Teil der Unit-Tests
- Testklassen spiegeln die zu testende Klasse wider: `DiscussionClient` → `DiscussionClientTests`
- Tests folgen der **Arrange-Act-Assert**-Struktur:

```csharp
[Fact]
public async Task ListAsync_ReturnsPullRequests()
{
    // Arrange
    var json = JsonSerializer.Serialize(new[] { ... });
    _runner.RunAsync(Arg.Any<string[]>()).Returns(json);

    // Act
    var result = await _sut.ListAsync("owner", "repo");

    // Assert
    Assert.Single(result);
    Assert.Equal("Fix bug", result[0].Title);
}
```

## Bekannte Architektur-Entscheidungen

- `GhCli.Net` nutzt die `gh` CLI als Proxy zu GitHub – kein direkter API-Token nötig
- `IGhCliRunner` ist `internal` – bewusst nicht öffentlich, da Implementierungsdetail
- Alle GitHub-Kommunikation läuft über `GhCli.Net`, lokale Git-Operationen über `LibGit2Sharp`
