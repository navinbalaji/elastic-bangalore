# Agent Context — Elastic Bangalore Workshop CLI

Reference for AI agents and contributors working in this repository.

## Project summary

**`elastic-bangalore`** is an interactive terminal (TUI) workshop companion for the Elastic Bangalore event: *Agentic Workflows & Searchable Applications with Elasticsearch, Jina, and A2A*.

Participants run a single Go binary that:

1. Collects Elastic Cloud credentials
2. Shows a checklist of 30 lab steps across 6 modules
3. Renders **exact instructions** from `lab-guide.md` in a right-hand panel
4. **Auto-verifies** API-completable steps against Elasticsearch / Kibana
5. Persists progress and issues a completion certificate

**Module path:** `github.com/elastic-bangalore/workshop`

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Language | Go 1.22 (`toolchain go1.22.10` in `go.mod`) |
| TUI framework | [Bubble Tea](https://github.com/charmbracelet/bubbletea) v1.2.4 |
| TUI components | [Bubbles](https://github.com/charmbracelet/bubbles) (viewport) v0.20.0 |
| Styling | [Lip Gloss](https://github.com/charmbracelet/lipgloss) v1.0.0 |
| Markdown rendering | [Glamour](https://github.com/charmbracelet/glamour) v0.8.0 |
| Elasticsearch client | [go-elasticsearch/v8](https://github.com/elastic/go-elasticsearch) v8.12.1 (low-level API) |
| Config / session serialization | `gopkg.in/yaml.v3`, `encoding/json` |
| Clipboard | `internal/clipboard` → `pbcopy` (macOS), `wl-copy` / `xclip` (Linux), `clip` (Windows) |

No web server, no database — all state is local files + remote Elastic APIs.

---

## Repository layout (all paths)

```
elastic-bangalore/
├── agent.md                          # This file — agent/contributor context
├── README.md                         # User-facing docs
├── lab-guide.md                      # Source of truth for workshop instructions (markdown)
├── properties-dataset.csv            # Module 3 upload dataset
├── images/                           # Screenshots referenced by lab-guide.md (optional; not in repo yet)
├── go.mod / go.sum
├── Makefile                          # build, test, install (Darwin ldflags)
├── build                             # macOS-safe build shell script
├── elastic-bangalore                 # Compiled binary (gitignored)
│
├── cmd/
│   └── elastic-bangalore/
│       └── main.go                   # Entrypoint: flags, tea.NewProgram, alt screen
│
└── internal/
    ├── clipboard/
    │   └── clipboard.go              # OS clipboard write (pbcopy / xclip / clip)
    │
    ├── config/
    │   ├── config.go                 # Config struct, load/save YAML, DefaultPath
    │   ├── credentials.go            # ValidateCredentials, field help, friendly errors
    │   └── credentials_test.go
    │
    ├── guide/
    │   ├── guide.go                  # Load lab-guide.md, step→section map, SectionMarkdown
    │   ├── sections.go               # Markdown heading parser / section extraction
    │   ├── cache.go                  # Glamour render cache, renderer reuse, RenderStep, WarmCache
    │   ├── images.go                 # Inline terminal images (Kitty/iTerm protocol)
    │   ├── copy.go                   # PlainSection, CodeBlocks, CopyCode for clipboard
    │   └── guide_test.go
    │
    ├── session/
    │   ├── session.go                # session.json load/save, Merge, LoadOrCreate
    │   ├── certificate.go            # ASCII certificate generation + file write
    │   └── session_test.go
    │
    ├── steps/
    │   ├── steps.go                  # 30 Step definitions (ID, module, label, kind, fallback text)
    │   └── progress.go               # WorkshopComplete, ProgressCounts, status helpers
    │
    ├── tui/
    │   ├── app.go                    # Main Bubble Tea model: screens, keys, verify, copy, session
    │   ├── splash.go                 # Splash + credential setup wizard UI
    │   ├── banner.go                 # Persistent Elastic Bangalore top banner
    │   ├── completion.go             # Certificate / completion screen
    │   └── styles.go                 # Lip Gloss styles, status icons
    │
    └── verify/
        ├── client.go                 # ES + Kibana HTTP clients, ES|QL, inference, mappings
        ├── verifier.go               # Per-step verification logic (switch on step ID)
        └── esql.go                   # ES|QL result parsing helpers
```

### Runtime paths (user machine)

| Path | Purpose | Permissions |
|------|---------|-------------|
| `~/.elastic-bangalore/config.yaml` | Elasticsearch URL or Cloud ID, API key, Kibana URL | `0600` |
| `~/.elastic-bangalore/session.json` | Progress, cursor, pass/fail, guide acknowledgements | `0600` |
| `~/.elastic-bangalore/certificates/` | Downloaded completion certificates | `0700` dir |

### lab-guide.md resolution order

1. `$LAB_GUIDE_PATH` env var
2. `./lab-guide.md` (cwd)
3. Next to executable / parent directories
4. Walk up from cwd

Images resolve relative to the directory containing `lab-guide.md`. In `lab-guide.md`, screenshot links use full GitHub URLs:

`https://github.com/elastic/meetups/blob/main/Mumbai/27-06-2026_Jina-Elastic-Genai-A2A-Workshop/images/`

Override with `$LAB_GUIDE_IMAGES_BASE_URL` if needed.

---

## Architecture & data flow

```
main.go
  └── tui.App (bubbletea)
        ├── screenSplash → screenSetup → screenWorkshop → screenComplete
        │
        ├── config.Load/Save     → ~/.elastic-bangalore/config.yaml
        ├── session.Load/Save    → ~/.elastic-bangalore/session.json
        ├── guide.RenderStep     → lab-guide.md section → glamour → viewport
        ├── verify.Verifier      → Elasticsearch + Kibana APIs
        └── clipboard.Write      → pbcopy (copy code/text)
```

### TUI screens (`internal/tui/app.go`)

| Screen | Constant | Purpose |
|--------|----------|---------|
| Splash | `screenSplash` | Branding; auto-advance after 2s or keypress |
| Setup | `screenSetup` | 3-field credential wizard |
| Workshop | `screenWorkshop` | Split view: checklist (left) + instructions viewport (right) |
| Complete | `screenComplete` | Final checklist + certificate download |

### Step kinds (`internal/steps/steps.go`)

| Kind | Completion rule | User action |
|------|-----------------|-------------|
| `KindVerifiable` | API check must pass | **Enter** |
| `KindGuide` | Manual Kibana / local work | **Space** to acknowledge |

---

## Features (complete list)

### Credential setup
- Fields: Cloud ID **or** Elasticsearch URL, API key, Kibana URL
- Per-field help panel (Elastic Cloud connection details)
- Validation catches common mistakes (API key in URL field, etc.)
- **Ctrl+U** clear field, **Ctrl+H** show/hide API key
- Live connection test before save
- **r** reconfigure from workshop screen

### Workshop UI
- Persistent Elastic Bangalore banner (`internal/tui/banner.go`)
- 30-step checklist grouped by module with status icons (○ ◌ ✓ ✗)
- Right panel: rendered `lab-guide.md` section per step (glamour markdown)
- Render cache + neighbour pre-warm for fast ↑/↓ navigation
- Debounced session save (300ms) on cursor moves
- Inline images in Kitty / iTerm2 / WezTerm / Ghostty when `images/` exists

### Clipboard (avoid mouse selection in TUI)
- **y** — copy code block(s) from current step (ES|QL, JSON, YAML)
- **c** — copy full step instructions as plain markdown text

### Verification (`internal/verify/`)
- Async verify with 90s timeout per step
- Elasticsearch: indices, mappings, doc counts, inference, search, rerank, ES|QL
- Kibana HTTP: workflows, Agent Builder tools/skills/agents, A2A agent card

### Session & certificate
- Auto-resume cursor + progress on relaunch
- Completion when all verifiable pass + all guide steps acknowledged
- **d** / **Enter** download ASCII certificate to `~/.elastic-bangalore/certificates/`

---

## Workshop steps (30 total)

| ID | Module | Label | Kind |
|----|--------|-------|------|
| `m1-embeddings` | Module 1 | Test Jina embedding endpoint | Verifiable |
| `m1-index` | Module 1 | Create rerank-demo index | Verifiable |
| `m1-bulk` | Module 1 | Bulk index 11 documents | Verifiable |
| `m1-mapping` | Module 1 | Verify mapping | Verifiable |
| `m1-search` | Module 1 | Search without reranking | Verifiable |
| `m1-rerank` | Module 1 | Search with Jina reranker | Verifiable |
| `m2-upload-guide` | Module 2 | Upload Harry Potter PDF in Kibana | Guide |
| `m2-verify-index` | Module 2 | Verify harrypotter index | Verifiable |
| `m3-upload-guide` | Module 3 | Upload properties-dataset.csv | Guide |
| `m3-verify-index` | Module 3 | Verify properties index | Verifiable |
| `m3-english-search` | Module 3 | English semantic + geo search | Verifiable |
| `m3-french-search` | Module 3 | French cross-language search | Verifiable |
| `m3-completion` | Module 3 | ES\|QL COMPLETION | Verifiable |
| `m3-lang-detect` | Module 3 | Language detection (ML UI) | Guide |
| `m4-index-guide` | Module 4 | Create user_emails index + your doc | Guide |
| `m4-verify-index` | Module 4 | Verify user_emails index | Verifiable |
| `m4-workflow-guide` | Module 4 | Create send-email-with-lookup workflow | Guide |
| `m4-verify-workflow` | Module 4 | Verify workflow exists | Verifiable |
| `m5-tool-email-guide` | Module 5 | Create potter.send.email tool | Guide |
| `m5-verify-tool-email` | Module 5 | Verify potter.send.email tool | Verifiable |
| `m5-tool-search-guide` | Module 5 | Create potter.chapter.5 tool | Guide |
| `m5-verify-tool-search` | Module 5 | Verify potter.chapter.5 tool | Verifiable |
| `m5-skill-guide` | Module 5 | Create ministry-of-magic skill | Guide |
| `m5-verify-skill` | Module 5 | Verify ministry-of-magic skill | Verifiable |
| `m5-agent-guide` | Module 5 | Create potter-answers agent | Guide |
| `m5-verify-agent` | Module 5 | Verify potter-answers agent | Verifiable |
| `m5-test-guide` | Module 5 | Test agent in Kibana chat | Guide |
| `m6-inspector-guide` | Module 6 | Run A2A Inspector locally | Guide |
| `m6-verify-agent-card` | Module 6 | Verify A2A agent card | Verifiable |
| `m6-chat-guide` | Module 6 | Chat via A2A Inspector | Guide |

Step ID → `lab-guide.md` section mapping lives in `internal/guide/guide.go` (`stepSections`).

---

## Keyboard shortcuts (workshop)

| Key | Action |
|-----|--------|
| ↑ / ↓ / j / k | Change checklist step (scroll instructions at list edge) |
| PgUp / PgDn / home / end | Scroll instructions panel |
| **y** | Copy code to clipboard |
| **c** | Copy step text to clipboard |
| Space | Acknowledge guide step |
| Enter | Verify verifiable step |
| r | Reconfigure credentials |
| q / Ctrl+C | Quit (saves session) |

---

## Build & test

```bash
make build          # macOS: -ldflags="-linkmode=external" (LC_UUID fix)
./build             # Same, via shell script
make test           # go test ./...
make run            # build + run
./elastic-bangalore # Run binary
./elastic-bangalore --config /path/to/config.yaml
```

**macOS:** Plain `go build` without `-linkmode=external` crashes with `dyld: missing LC_UUID` on macOS 15+.

**Linux:** Plain `go build -o elastic-bangalore ./cmd/elastic-bangalore/` works.

---

## Conventions for extending

### Add a new verifiable step
1. Add entry to `steps.All()` in `internal/steps/steps.go` with unique `ID`
2. Map `ID` → lab-guide section in `internal/guide/guide.go` (`stepSections`)
3. Implement `Verifier.Verify` case in `internal/verify/verifier.go`
4. Add client helpers in `internal/verify/client.go` if needed

### Add / change instructions
- Prefer editing `lab-guide.md` (rendered automatically)
- Keep `Step.Instructions` as fallback when guide file is missing

### TUI changes
- All screens flow through `internal/tui/app.go` `Update` / `View`
- Styles in `internal/tui/styles.go` — Elastic teal `#00BFB3`, gold `#FEC514`
- Long-running work must use `tea.Cmd` async messages (see `verifyDoneMsg`, `clipboardMsg`)

### Tests
- `internal/config/credentials_test.go` — credential validation
- `internal/guide/guide_test.go` — section extraction, lab-guide integration
- `internal/guide/copy_test.go` — fenced code extraction
- `internal/session/session_test.go` — session round-trip, certificate

---

## Key Elasticsearch / Kibana resources verified

| Resource | Index / ID |
|----------|------------|
| Rerank demo | `rerank-demo` (11 docs) |
| Harry Potter | `harrypotter` (`content_jina` semantic_text) |
| Properties | `properties` (`body_content_jina`, `location` geo_point) |
| Email lookup | `user_emails` |
| Workflow | `send-email-with-lookup` |
| Agent Builder tool | `potter.send.email`, `potter.chapter.5` |
| Skill | `ministry-of-magic` |
| Agent | `potter-answers` |
| A2A card | `{KIBANA_URL}/api/agent_builder/a2a/potter-answers.json` |

---

## External workshop assets (not in repo)

- `harrypotter_sorcerers_stone_chapter_5-workshop-asset.pdf` — Module 2
- [Workshop screenshots on GitHub](https://github.com/elastic/meetups/tree/main/Mumbai/27-06-2026_Jina-Elastic-Genai-A2A-Workshop/images) — linked from `lab-guide.md`
- [a2a-inspector](https://github.com/a2aproject/a2a-inspector) — Module 6 local tool

---

## License

Workshop materials for Elastic Bangalore community events.
