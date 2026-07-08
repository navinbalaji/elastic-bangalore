package guide

import (
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

var imageRE = regexp.MustCompile(`!\[([^\]]*)\]\(([^)]+)\)`)

func expandInlineImages(md, baseDir string, maxWidthCells int) string {
	if maxWidthCells < 20 {
		maxWidthCells = 40
	}
	lines := strings.Split(md, "\n")
	for i, line := range lines {
		sub := imageRE.FindStringSubmatch(strings.TrimSpace(line))
		if len(sub) != 3 {
			continue
		}
		lines[i] = renderImageLine(sub[1], sub[2], baseDir, maxWidthCells)
	}
	return strings.Join(lines, "\n")
}

func renderImageLine(alt, ref, baseDir string, maxWidthCells int) string {
	webURL := ImageWebURL(ref)

	path := ref
	if !filepath.IsAbs(ref) {
		path = filepath.Join(baseDir, ref)
	}

	label := strings.TrimSpace(alt)
	if label == "" {
		label = filepath.Base(ref)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Sprintf("\n🖼  **%s**\n   %s\n   *(o copy URL · O open in browser)*\n", label, webURL)
	}

	inline := terminalInlineImage(data, maxWidthCells)
	if inline == "" {
		return fmt.Sprintf("\n🖼  **%s**\n   %s\n   *(o copy URL · O open in browser)*\n", label, webURL)
	}

	return fmt.Sprintf("\n%s\n🖼  %s\n   %s\n   *(o copy URL · O open in browser)*\n", inline, label, webURL)
}

func terminalInlineImage(data []byte, maxWidthCells int) string {
	if !terminalSupportsInlineImages() {
		return ""
	}
	encoded := base64.StdEncoding.EncodeToString(data)
	// Kitty / iTerm2 / Ghostty / WezTerm graphics protocol.
	return fmt.Sprintf("\x1b]1337;File=inline=1;width=%d;preserveAspectRatio=1:%s\x07", maxWidthCells, encoded)
}

func terminalSupportsInlineImages() bool {
	if os.Getenv("KITTY_WINDOW_ID") != "" {
		return true
	}
	term := strings.ToLower(os.Getenv("TERM"))
	if strings.Contains(term, "kitty") || strings.Contains(term, "xterm-kitty") {
		return true
	}
	switch os.Getenv("TERM_PROGRAM") {
	case "iTerm.app", "WezTerm", "ghostty":
		return true
	}
	if v := os.Getenv("CURSOR_TRACE_ID"); v != "" {
		// Cursor integrated terminal is VS Code-based; inline images are unreliable.
		return false
	}
	if os.Getenv("TERM_PROGRAM") == "vscode" {
		return false
	}
	return false
}
