# ghGPT

## E2E Tests

Die E2E Tests laufen mit [Playwright](https://playwright.dev/) gegen eine echte Backend-Instanz.

### Voraussetzungen

- .NET 9 SDK
- Node.js
- Abhängigkeiten installiert: `npm install` im Verzeichnis `src/ghGPT.Frontend`
- Playwright-Browser installiert: `npx playwright install chromium` im Verzeichnis `src/ghGPT.Frontend`

### Tests ausführen

```bash
cd src/ghGPT.Frontend

# Alle Tests
npx playwright test

# Einzelne Testdatei
npx playwright test e2e/changes-view.spec.ts

# Mit UI (interaktiv)
npx playwright test --ui

# Mit HTML-Report (nach dem Lauf)
npx playwright show-report
```

> Der Backend-Server (`dotnet run`) wird automatisch von Playwright gestartet, falls er nicht bereits läuft (`reuseExistingServer: true`).

### Testdateien

| Datei | Inhalt |
|---|---|
| `e2e/app.spec.ts` | App-Shell, Sidebar, Repo-Dialog |
| `e2e/changes-view.spec.ts` | Staging, Unstaging, Diff, Commit, Partial Staging |
| `e2e/branches-view.spec.ts` | Branch-Verwaltung lokal |
| `e2e/branches-view-remote.spec.ts` | Remote-Branch Checkout |
| `e2e/toolbar-branch-dropdown.spec.ts` | Branch-Dropdown in der Toolbar |
| `e2e/git-toolbar-operations.spec.ts` | Fetch, Pull, Push |
| `e2e/history-view.spec.ts` | Commit-History und Diff |
| `e2e/screenshots.spec.ts` | Screenshot-Tests |