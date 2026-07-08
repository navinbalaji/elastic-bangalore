# Publishing a release

## One-time setup

1. Create a GitHub repo (e.g. `elastic-bangalore`)
2. Push this project:

```bash
cd elastic-bangalore
git init
git add .
git commit -m "Initial workshop CLI release"
git branch -M main
git remote add origin https://github.com/navinbalaji/elastic-bangalore.git
git push -u origin main
```

3. Releases URL: https://github.com/navinbalaji/elastic-bangalore/releases

## Cut a release

Every tag matching `v*` triggers GitHub Actions which builds **7 download packages**:

| Archive | Platform |
|---------|----------|
| `*_darwin_universal.tar.gz` | **macOS — all Macs** (recommended) |
| `*_darwin_arm64.tar.gz` | macOS Apple Silicon |
| `*_darwin_amd64.tar.gz` | macOS Intel |
| `*_linux_amd64.tar.gz` | Linux x86_64 |
| `*_linux_arm64.tar.gz` | Linux ARM64 |
| `*_windows_amd64.zip` | Windows 64-bit |
| `*_windows_arm64.zip` | Windows ARM64 |

Plus `SHA256SUMS.txt` for verifying downloads.

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions builds all platforms and attaches archives to the Release page.

## Build locally

```bash
chmod +x scripts/build-one.sh scripts/build-release.sh
# Single platform:
./scripts/build-one.sh v0.1.0 darwin arm64
# All platforms (darwin only when run on macOS):
./scripts/build-release.sh v0.1.0
```

## macOS note for participants

Release binaries for macOS are built with `-linkmode=external` so they run on macOS 15+. If Gatekeeper blocks the app, right-click → Open once, or:

```bash
xattr -cr ./elastic-bangalore
```
