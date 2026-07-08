package guide

import (
	"strings"
	"testing"
)

func TestExtractSection(t *testing.T) {
	doc := `## Module 2 — File Uploader and Semantic Text

### Objectives

- obj

### Steps

1. step one
2. step two

### Key Takeaways

- kt

## Module 3 — Jina.ai Multi-Language Search with ES|QL

### Objective

module 3 intro

### 3.1 Cross-Language Search

english query
`

	t.Run("module scoped steps", func(t *testing.T) {
		md, ok := extractSection(doc, Section{
			Module: "Module 2 — File Uploader and Semantic Text",
			Start:  "Steps",
		})
		if !ok {
			t.Fatal("expected section")
		}
		if !strings.Contains(md, "step one") {
			t.Fatalf("missing steps content: %q", md)
		}
		if strings.Contains(md, "Key Takeaways") {
			t.Fatalf("should stop before key takeaways: %q", md)
		}
	})

	t.Run("end boundary", func(t *testing.T) {
		md, ok := extractSection(doc, Section{
			Module: "Module 3 — Jina.ai Multi-Language Search with ES|QL",
			Start:  "Objective",
			End:    "3.1 Cross-Language Search",
		})
		if !ok {
			t.Fatal("expected section")
		}
		if !strings.Contains(md, "module 3 intro") {
			t.Fatalf("missing intro: %q", md)
		}
		if strings.Contains(md, "english query") {
			t.Fatalf("should stop before 3.1: %q", md)
		}
	})
}

func TestSectionMarkdownFromRepo(t *testing.T) {
	_, _, err := Load()
	if err != nil {
		t.Skip("lab-guide.md not available:", err)
	}
	md, ok := SectionMarkdown("m1-embeddings")
	if !ok {
		t.Fatal("expected m1-embeddings section")
	}
	if !strings.Contains(md, "Jina.ai Embeddings") {
		t.Fatalf("unexpected content: %s", md[:min(120, len(md))])
	}
	if !strings.Contains(md, "github.com/elastic/meetups") {
		t.Fatal("expected GitHub image URL from lab-guide.md")
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
