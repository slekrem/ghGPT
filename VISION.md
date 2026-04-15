# ghGPT – Vision


> **"Ein Git-Werkzeug, das mitdenkt."**

---

## Mission

ghGPT ist ein lokaler Git-Client als Web-App, der die vertraute Stärke von Tools wie GitHub Desktop mit einem lokal laufenden KI-Assistenten verbindet. Ziel ist eine Arbeitsumgebung, in der Entwickler schneller, sicherer und bewusster mit Git arbeiten – ohne Cloud-Zwang, ohne Datenschutzbedenken, ohne Kontextwechsel.

---

## Das Problem

Moderne Git-Workflows sind fragmentiert:

- **GUI-Clients** (GitHub Desktop, SourceTree) sind komfortabel, aber dumm – sie bieten keine Interpretation, keine Unterstützung, kein Lernen.
- **Terminal-Git** ist mächtig, aber fehleranfällig und erfordert tiefes Wissen.
- **KI-Assistenten** (ChatGPT, Copilot) helfen beim Code, aber kennen den lokalen Repository-Zustand nicht.
- **CI/CD-Plattformen** leben in der Cloud – lokale Arbeit bleibt unsichtbar.

Das Ergebnis: Entwickler wechseln ständig zwischen Tools, verlieren Kontext und machen vermeidbare Fehler bei Commits, Branches und Merges.

---

## Die Vision

ghGPT schließt diese Lücke. Es ist eine **lokal laufende Web-App**, die:

1. **Den vollständigen Git-Workflow abbildet** – von der Repo-Initialisierung bis zum Pull Request.
2. **Einen KI-Assistenten nahtlos integriert**, der den aktuellen Zustand des Repositories kennt und aktiv handeln kann.
3. **Reaktiv und lebendig ist** – die Oberfläche spiegelt Änderungen sofort wider, ob sie durch den Benutzer, ein Terminal oder den KI-Assistenten ausgelöst wurden.
4. **Vollständig lokal und privat bleibt** – das LLM läuft via Ollama auf dem eigenen Rechner, kein Code verlässt die Maschine.

### Das Nordstern-Szenario

> Ein Entwickler öffnet ghGPT, tippt im Chat: *„Klone mir https://github.com/org/repo und erstelle einen Branch für das Login-Feature"* – und schaut zu, wie die App das Repository klont, den Branch anlegt und ihn automatisch auscheckt. Danach schreibt er Code, kommt zurück zu ghGPT, klickt auf „Review" und bekommt strukturiertes Feedback zu seinen Änderungen. Er lässt sich eine Commit-Nachricht vorschlagen, passt sie an, committed – und pushed. Alles in einer Oberfläche, ohne Terminal, ohne Copy-Paste, ohne Kontextverlust.

---

## Zielgruppe

**Primär:** Entwicklerinnen und Entwickler, die:
- regelmäßig mit Git arbeiten und einen visuellen Überblick schätzen
- an lokaler KI-Unterstützung interessiert sind, aber keine Cloud-Dienste nutzen wollen
- Teams in sicherheitssensiblen Umgebungen (kein Copilot, keine Cloud-AI)

**Sekundär:** Einsteiger, die Git über eine geführte, erklärende Oberfläche erlernen wollen.

---

## Leitprinzipien

### 1. Lokal zuerst
Alle Daten – Repositories, Token, KI-Anfragen – bleiben auf dem Rechner des Benutzers. ghGPT ist eine Desktop-Erfahrung in einem Browser-Fenster, keine SaaS-Plattform.

### 2. KI als Werkzeug, nicht als Gimmick
Der KI-Assistent hat Zugriff auf den echten Repository-Zustand (Diffs, History, Branches). Er handelt auf Wunsch des Benutzers – ersetzt keine Entscheidungen, unterstützt aber aktiv dabei.

### 3. Reaktive Oberfläche
Die UI ist kein Snapshot. Sie ist lebendig: Änderungen durch externe Tools, Terminal-Befehle oder den KI-Assistenten werden sofort reflektiert. Der Benutzer sieht immer den aktuellen Zustand.

### 4. Kontext bleibt erhalten
Der KI-Assistent kennt das aktive Repository, den aktuellen Branch, die Änderungen und die History. Gespräche im Chat-Panel sind kein isoliertes Q&A – sie sind Teil des Arbeitsablaufs.

### 5. Minimale Reibung
Kein Wechsel zwischen Tools. Kein manuelles Kopieren von Diffs in ChatGPT. Kein Nachschauen von Git-Kommandos. ghGPT macht den nächsten richtigen Schritt immer einen Klick (oder einen Satz) entfernt.

### 6. Erweiterbar und offen
Die App läuft lokal, ist Open Source und so gebaut, dass neue Modelle, neue Git-Hosting-Plattformen (GitLab, Gitea) und neue KI-Features ohne Architekturbruch hinzugefügt werden können.

---

## Feature-Säulen

| Säule | Beschreibung |
|-------|-------------|
| **Repository Management** | Erstellen, Importieren, Klonen, Wechseln zwischen Repos |
| **Git Core** | Status, Diff, Staging, Commit, History, Branches, Pull/Push/Fetch |
| **GitHub Integration** | Account-Verwaltung, Pull Requests anzeigen und interagieren |
| **KI-Assistent** | Commit-Messages, Code-Review, History-Zusammenfassung, Chat |
| **Reaktive UI** | SignalR-basierte Live-Updates, Chat-getriebene UI-Aktionen |

---

## Nicht-Ziele (Explizit außer Scope)

- **Kein Code-Editor** – ghGPT ergänzt den Editor, ersetzt ihn nicht.
- **Keine Cloud-Deployments** – ghGPT ist ein lokales Werkzeug, kein gehosteter Service.
- **Kein vollständiges GitHub-Ersatz** – Komplexe GitHub-Features (Actions, Projects, Wiki) bleiben auf github.com.
- **Keine Mobile App** – Der Fokus liegt auf der Desktop-Nutzung im Browser.
- **Kein Multi-User-System** – ghGPT ist für einen einzelnen Entwickler auf einem Rechner ausgelegt.

---

## Erfolgskriterien

Eine Version von ghGPT ist erfolgreich, wenn:

- [ ] Der vollständige tägliche Git-Workflow ohne Terminal-Öffnen möglich ist
- [ ] KI-generierte Commit-Messages von Nutzern ohne Änderung übernommen werden (>50% der Zeit)
- [ ] Chat-Befehle mindestens 5 verschiedene Git-Aktionen zuverlässig auslösen
- [ ] Die UI Änderungen innerhalb von 2 Sekunden reflektiert (externes Terminal, KI-Aktion)
- [ ] Kein einziges KI-Feature erfordert eine Internetverbindung

---

## Checkliste: Issue & Code gegen die Vision prüfen

Vor jedem neuen Issue oder PR diese Fragen stellen:

1. **Bleibt es lokal?** Werden Daten die Maschine verlassen?
2. **Hat die KI echten Kontext?** Oder arbeitet sie blind auf abstrakten Eingaben?
3. **Reduziert es Reibung?** Ist der Schritt näher dran als vorher?
4. **Ist die UI reaktiv?** Wird der Benutzer nach der Aktion manuell neu laden müssen?
5. **Bleibt es im Scope?** Bauen wir einen Editor oder ein Deployment-Tool?

Wenn eine dieser Fragen mit „Nein" / „Ja (schlecht)" beantwortet wird: kurz pausieren und begründen, warum die Ausnahme sinnvoll ist.
