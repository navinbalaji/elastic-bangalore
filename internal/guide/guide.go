package guide

import (
	"os"
	"path/filepath"
	"strings"
	"sync"
)

// Section selects a slice of lab-guide.md by heading text.
type Section struct {
	// Start matches a heading line (## / ### / ####) containing this text.
	Start string
	// End, if set, stops before the next heading that contains this text.
	End string
	// Module scopes Start/End to headings under a ## Module N line.
	Module string
}

var stepSections = map[string]Section{
	"m1-embeddings":     {Start: "1.1 Jina.ai Embeddings"},
	"m1-index":          {Start: "1.2 Jina.ai Semantic Reranker", End: "Step 2 — Bulk index sample documents"},
	"m1-bulk":           {Start: "Step 2 — Bulk index sample documents"},
	"m1-mapping":        {Start: "Step 3 — Verify the mapping", End: "1.3 Search Without Reranking"},
	"m1-search":         {Start: "1.3 Search Without Reranking"},
	"m1-rerank":         {Start: "1.4 Search With Jina Semantic Reranking"},

	"m2-upload-guide": {Module: "Module 2 — File Uploader and Semantic Text", Start: "Steps"},
	"m2-verify-index": {Module: "Module 2 — File Uploader and Semantic Text", Start: "Steps"},

	"m3-upload-guide":   {Module: "Module 3 — Jina.ai Multi-Language Search with ES|QL", Start: "Objective", End: "3.1 Cross-Language Search"},
	"m3-verify-index":   {Module: "Module 3 — Jina.ai Multi-Language Search with ES|QL", Start: "Objective", End: "3.1 Cross-Language Search"},
	"m3-english-search": {Start: "3.1 Cross-Language Search", End: "3.2 Optional"},
	"m3-french-search":  {Start: "3.1 Cross-Language Search", End: "3.2 Optional"},
	"m3-completion":     {Start: "3.3 Chat Completions with ES|QL"},
	"m3-lang-detect":    {Start: "3.4 Language Detection"},

	"m4-index-guide":    {Start: "4.1 Create the Email Lookup Index"},
	"m4-verify-index":   {Start: "4.1 Create the Email Lookup Index"},
	"m4-workflow-guide": {Start: "4.2 Create the Workflow"},
	"m4-verify-workflow": {Start: "4.2 Create the Workflow"},

	"m5-tool-email-guide":  {Start: "5.1 Create a Workflow Tool"},
	"m5-verify-tool-email": {Start: "5.1 Create a Workflow Tool"},
	"m5-tool-search-guide": {Start: "5.2 Create an Index Search Tool"},
	"m5-verify-tool-search": {Start: "5.2 Create an Index Search Tool"},
	"m5-skill-guide":       {Start: "5.3 Create a Skill"},
	"m5-verify-skill":      {Start: "5.3 Create a Skill"},
	"m5-agent-guide":       {Start: "5.4 Create the AI Agent"},
	"m5-verify-agent":      {Start: "5.4 Create the AI Agent"},
	"m5-test-guide":        {Start: "5.5 Test Your Agent"},

	"m6-inspector-guide":   {Start: "6.1 Run the A2A Inspector Locally"},
	"m6-verify-agent-card": {Start: "6.2 Inspect Your Agent Card"},
	"m6-chat-guide":        {Start: "6.3 Chat with Your Agent via A2A"},
}

var (
	loadOnce sync.Once
	loadErr  error
	doc      string
	baseDir  string
)

// Load reads lab-guide.md from disk or the embedded copy (cached).
func Load() (string, string, error) {
	loadOnce.Do(func() {
		path, err := findGuidePath()
		if err == nil {
			raw, readErr := os.ReadFile(path)
			if readErr == nil {
				doc = string(raw)
				baseDir = filepath.Dir(path)
				return
			}
		}
		if embeddedLabGuide != "" {
			doc = embeddedLabGuide
			baseDir = ""
			return
		}
		loadErr = os.ErrNotExist
	})
	return doc, baseDir, loadErr
}

func findGuidePath() (string, error) {
	if p := strings.TrimSpace(os.Getenv("LAB_GUIDE_PATH")); p != "" {
		if _, err := os.Stat(p); err == nil {
			return p, nil
		}
	}

	candidates := []string{
		"lab-guide.md",
		filepath.Join("..", "lab-guide.md"),
	}

	if exe, err := os.Executable(); err == nil {
		dir := filepath.Dir(exe)
		candidates = append(candidates,
			filepath.Join(dir, "lab-guide.md"),
			filepath.Join(dir, "..", "lab-guide.md"),
		)
	}

	if wd, err := os.Getwd(); err == nil {
		for dir := wd; len(dir) > 1; dir = filepath.Dir(dir) {
			p := filepath.Join(dir, "lab-guide.md")
			candidates = append(candidates, p)
		}
	}

	seen := map[string]bool{}
	for _, p := range candidates {
		if seen[p] {
			continue
		}
		seen[p] = true
		if _, err := os.Stat(p); err == nil {
			return p, nil
		}
	}

	return "", os.ErrNotExist
}

// SectionMarkdown returns the raw markdown for a workshop step.
func SectionMarkdown(stepID string) (string, bool) {
	spec, ok := stepSections[stepID]
	if !ok {
		return "", false
	}
	doc, _, err := Load()
	if err != nil || doc == "" {
		return "", false
	}
	md, ok := extractSection(doc, spec)
	return md, ok
}
