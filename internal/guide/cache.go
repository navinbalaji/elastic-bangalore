package guide

import (
	"path/filepath"
	"strings"
	"sync"

	"github.com/charmbracelet/glamour"
)

type renderCacheKey struct {
	stepID string
	width  int
}

var (
	sectionCache sync.Map // stepID -> string (raw markdown section)
	renderCache  sync.Map // renderCacheKey -> string (rendered ANSI)

	rendererMu      sync.Mutex
	renderer        *glamour.TermRenderer
	rendererWidth   int
	rendererBaseDir string
)

// ClearRenderCache drops cached glamour output (e.g. after terminal resize).
func ClearRenderCache() {
	renderCache = sync.Map{}
	rendererMu.Lock()
	renderer = nil
	rendererWidth = 0
	rendererBaseDir = ""
	rendererMu.Unlock()
}

func cachedSectionMarkdown(stepID string) (string, bool) {
	if v, ok := sectionCache.Load(stepID); ok {
		return v.(string), true
	}
	md, ok := SectionMarkdown(stepID)
	if ok {
		sectionCache.Store(stepID, md)
	}
	return md, ok
}

func getRenderer(width int, baseDir string) (*glamour.TermRenderer, error) {
	rendererMu.Lock()
	defer rendererMu.Unlock()

	if renderer != nil && rendererWidth == width && rendererBaseDir == baseDir {
		return renderer, nil
	}

	r, err := glamour.NewTermRenderer(
		glamour.WithAutoStyle(),
		glamour.WithWordWrap(width),
		glamour.WithBaseURL(pathToFileURL(baseDir)),
	)
	if err != nil {
		return nil, err
	}
	renderer = r
	rendererWidth = width
	rendererBaseDir = baseDir
	return r, nil
}

func renderMarkdownCached(stepID string, md string, width int, baseDir string) (string, error) {
	key := renderCacheKey{stepID: stepID, width: width}
	if v, ok := renderCache.Load(key); ok {
		return v.(string), nil
	}

	r, err := getRenderer(width, baseDir)
	if err != nil {
		return "", err
	}
	out, err := r.Render(md)
	if err != nil {
		return "", err
	}
	renderCache.Store(key, out)
	return out, nil
}

// RenderStep renders lab-guide markdown for a step as styled terminal output.
func RenderStep(stepID string, width int, fallback string) string {
	if width < 40 {
		width = 40
	}

	key := renderCacheKey{stepID: stepID, width: width}
	if v, ok := renderCache.Load(key); ok {
		return v.(string)
	}

	md, ok := cachedSectionMarkdown(stepID)
	if !ok {
		return fallback
	}

	_, baseDir, err := Load()
	if err != nil {
		return md
	}

	md = rewriteImageLinks(md)
	md = expandInlineImages(md, baseDir, width)
	rendered, err := renderMarkdownCached(stepID, md, width, baseDir)
	if err != nil {
		return md
	}
	out := trimRightNewlines(rendered)
	renderCache.Store(key, out)
	return out
}

func pathToFileURL(dir string) string {
	dir = filepath.ToSlash(dir)
	if !strings.HasPrefix(dir, "/") {
		return "file://" + dir + "/"
	}
	return "file://" + dir + "/"
}

func trimRightNewlines(s string) string {
	for len(s) > 0 && (s[len(s)-1] == '\n' || s[len(s)-1] == '\r') {
		s = s[:len(s)-1]
	}
	return s
}

// WarmCache pre-renders adjacent steps to keep arrow navigation responsive.
func WarmCache(stepIDs []string, center int, width int) {
	if center < 0 || center >= len(stepIDs) {
		return
	}
	for _, idx := range []int{center - 1, center, center + 1} {
		if idx < 0 || idx >= len(stepIDs) {
			continue
		}
		_ = RenderStep(stepIDs[idx], width, "")
	}
}
