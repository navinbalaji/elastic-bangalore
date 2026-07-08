# Elastic Bangalore Workshop CLI

Interactive terminal lab companion for the **Elastic Bangalore** workshop: *Agentic Workflows & Searchable Applications with Elasticsearch, Jina, and A2A*.

The CLI walks participants through every lab step from [lab-guide.md](lab-guide.md), shows instructions in the terminal, and **auto-verifies** completion against your Elastic Cloud deployment.

## Features

- Elastic Bangalore branded splash screen
- Interactive credential setup (saved to `~/.elastic-bangalore/config.yaml`)
- Checklist UI with **↑/↓** navigation, **Space** to mark, **Enter** to verify
- Step-by-step instructions panel
- API verification for indices, inference, reranking, ES|QL, workflows, Agent Builder, and A2A agent cards

## Prerequisites

- Go 1.21+ (to build from source; `go.mod` may auto-download a newer toolchain)
- Elastic Cloud deployment with workshop features enabled
- API key with appropriate privileges (see below)

## Download (recommended)

Pre-built binaries for **macOS, Linux, and Windows** are on **[GitHub Releases](https://github.com/navinbalaji/elastic-bangalore/releases)**.

| Your system | Download file |
|-------------|---------------|
| **macOS** (any Mac) | `elastic-bangalore_vX.X.X_darwin_universal.tar.gz` |
| macOS Apple Silicon (M1/M2/M3/M4) | `elastic-bangalore_vX.X.X_darwin_arm64.tar.gz` |
| macOS Intel | `elastic-bangalore_vX.X.X_darwin_amd64.tar.gz` |
| **Linux** x86_64 (Ubuntu, etc.) | `elastic-bangalore_vX.X.X_linux_amd64.tar.gz` |
| Linux ARM64 | `elastic-bangalore_vX.X.X_linux_arm64.tar.gz` |
| **Windows** 64-bit | `elastic-bangalore_vX.X.X_windows_amd64.zip` |
| Windows ARM64 | `elastic-bangalore_vX.X.X_windows_arm64.zip` |

### macOS

```bash
tar -xzf elastic-bangalore_*_darwin_universal.tar.gz
chmod +x elastic-bangalore
./elastic-bangalore
```

If blocked by Gatekeeper: `xattr -cr ./elastic-bangalore` then run again.

### Linux

```bash
tar -xzf elastic-bangalore_*_linux_amd64.tar.gz
chmod +x elastic-bangalore
./elastic-bangalore
```

### Windows

1. Extract the `.zip` file
2. Open PowerShell in that folder:

```powershell
.\elastic-bangalore.exe
```

Each archive includes `INSTALL.txt` with full instructions. The binary has the lab guide embedded — works without extra files.

**First run:** enter Elastic Cloud URL, API key, and Kibana URL when prompted.

---

## Build from source

For developers who want to compile locally:

**On macOS, use `./build` or `make build` — plain `go build` will crash at launch** (`dyld: missing LC_UUID`).

```bash
./build
# or
make build
```

Place `lab-guide.md` next to the binary (or run from the repo root). The right-hand instructions panel renders the matching **lab-guide.md** section for each step. Screenshots link to the [workshop images on GitHub](https://github.com/elastic/meetups/tree/main/Mumbai/27-06-2026_Jina-Elastic-Genai-A2A-Workshop/images) — copy the URL shown in the terminal and open in your browser.

The `./build` script and Makefile pass `-ldflags="-linkmode=external"` on Darwin so the binary includes the `LC_UUID` Mach-O load command required by macOS 15+.

Manual build on **macOS**:

```bash
rm -f elastic-bangalore
go build -ldflags="-linkmode=external" -o elastic-bangalore ./cmd/elastic-bangalore/
```

On Linux, a plain `go build -o elastic-bangalore ./cmd/elastic-bangalore/` is enough.

**macOS troubleshooting:**
- `dyld: missing LC_UUID` → rebuild with `./build` or the `-linkmode=external` flag above
- Do **not** use `CGO_ENABLED=0` on Mac — that also triggers this error
- If external linking fails, accept the Xcode license: `sudo xcodebuild -license`

Install globally (macOS — use Makefile so ldflags apply):

```bash
make install
```

## Run

```bash
./elastic-bangalore
```

Custom config path (for facilitators):

```bash
./elastic-bangalore --config /path/to/config.yaml
```

### First launch — where to get each value

The setup wizard shows **per-field help** on the right (or below on narrow terminals). Summary:

| Field | Where to get it |
|-------|-----------------|
| **1. Cloud ID or Elasticsearch URL** | [cloud.elastic.co](https://cloud.elastic.co) → your project → **Help (?) → Connection details** → **Elasticsearch endpoint** (recommended). Example: `https://my-project-d9fc53.es.us-central1.gcp.elastic.cloud` |
| **2. API Key** | Open **Kibana** → search **API keys** → **Create API key** → copy the **Encoded** (base64) key shown once |
| **3. Kibana URL** | Elastic Cloud → **Open Kibana** → copy the `https://...kb....elastic.cloud` URL from the browser |

**Common mistakes:**
- Do **not** put the API key in the Kibana URL field
- Do **not** put `https://...es...` in the API key field
- Field 1 accepts either the **Elasticsearch endpoint URL** or classic **Cloud ID** (`name:base64`)

**Replace API key:** press `r` to reconfigure, go to field 2, press **Ctrl+U** to clear, paste the new key.

Docs: [Find connection details](https://www.elastic.co/docs/solutions/elasticsearch-solution-project/search-connection-details)

### First launch (continued)

1. Splash screen appears with **Elastic Bangalore** branding
2. Enter your credentials when prompted:
   - **Cloud ID** — from Elastic Cloud deployment console
   - **API Key** — base64-encoded key
   - **Kibana URL** — e.g. `https://xxx.kb.us-central1.gcp.cloud.es.io:9243`
3. Credentials are validated against Elasticsearch and saved to `~/.elastic-bangalore/config.yaml` (mode `0600`)

### Session resume & certificate

Progress is saved automatically to:

```
~/.elastic-bangalore/session.json
```

Certificates download to:

```
~/.elastic-bangalore/certificates/
```

**Completion rules:**
- **Verifiable steps** — must pass API check (Enter)
- **Guide steps** — press **Space** to acknowledge when done in Kibana

When all steps are complete, the **certificate screen** appears. Press **d** or **Enter** to save the certificate file. Press **b** to return to the lab.

On next launch, your session resumes from `session.json` (cursor position, pass/fail status, acknowledgements).

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| ↑ / ↓ / Tab | Navigate setup fields or workshop steps |
| Ctrl+U | Clear current setup field (use to replace API key) |
| Ctrl+H | Show/hide API key while typing |
| y | Copy code block to clipboard (paste into Kibana) |
| c | Copy step instructions to clipboard |
| o | Copy screenshot URL to clipboard (cycles if multiple images) |
| O / Ctrl+O | Open screenshot in browser |
| g | Open full lab guide on GitHub in browser |
| Ctrl+G | Open lab guide (from setup screen) |
| PgUp / PgDn | Scroll instructions panel |
| Enter | Test connection & save (setup), verify step (workshop), or download certificate (completion) |
| d | Download certificate (completion screen) |
| b | Back to lab from completion screen |
| r | Reconfigure credentials |
| q | Quit |

### Step types

- **Verifiable** — Press Enter to check via Elasticsearch/Kibana APIs
- **Guide** — Instructions only; complete in Kibana UI. Verification happens on the next check step.

## API key privileges

Create an API key with at least:

| Area | Privileges |
|------|------------|
| Cluster | `monitor` |
| Indices | `read`, `view_index_metadata` on `rerank-demo`, `harrypotter`, `properties`, `user_emails` |
| Inference | Access to Jina and Anthropic completion endpoints |
| Kibana | `agentBuilder:read`, `workflowsManagement:read` |

If verification fails with **403**, the CLI will hint which privilege may be missing.

## Facilitator pre-flight

Before the workshop, run the CLI against your reference deployment and verify all **verifiable** steps pass:

```bash
./elastic-bangalore
```

Recommended order for participants:

1. Module 1 — Dev Tools (all API-verifiable)
2. Module 2 — Upload PDF in Kibana, then verify index
3. Module 3 — Upload CSV in Kibana, then run ES|QL checks
4. Module 4 — Create index + workflow in Kibana, then verify
5. Module 5 — Create tools/skills/agent in Kibana, then verify
6. Module 6 — Verify agent card, run A2A Inspector locally (guide)

## Project layout

```
cmd/elastic-bangalore/     CLI entrypoint
internal/config/          Credential load/save
internal/steps/           Step definitions + instructions
internal/verify/          Elasticsearch/Kibana verification
internal/tui/             Terminal UI (bubbletea)
lab-guide.md              Full workshop guide
properties-dataset.csv    Module 3 dataset
```

## License

Workshop materials for Elastic Bangalore community events.
