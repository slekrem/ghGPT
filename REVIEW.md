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

## Projekt-Konventionen

- Fehlermeldungen auf Deutsch, einheitliches Muster: `"... konnte nicht ..."` oder `"... nicht gefunden."`
- GraphQL-Queries werden als Konstanten (`const string`) definiert, nicht inline gebaut
- Eingabevalidierung erfolgt am Methodenanfang mit `ArgumentException.ThrowIfNullOrWhiteSpace`
- JSON-Mapping immer mit expliziten `[JsonPropertyName]`-Attributen – `PropertyNameCaseInsensitive = true` wird nicht verwendet, da es Namenskollisionen maskieren kann

## Bekannte Architektur-Entscheidungen

- `GhCli.Net` nutzt die `gh` CLI als Proxy zu GitHub – kein direkter API-Token nötig
- `IGhCliRunner` ist `internal` – bewusst nicht öffentlich, da Implementierungsdetail
- Alle GitHub-Kommunikation läuft über `GhCli.Net`, lokale Git-Operationen über `LibGit2Sharp`
