package guide

import "testing"

func TestExtractFencedBlocks(t *testing.T) {
	md := "intro\n\n```sql\nFROM properties\n| LIMIT 10\n```\n\nafter\n\n```json\n{\"a\":1}\n```"
	blocks := extractFencedBlocks(md)
	if len(blocks) != 2 {
		t.Fatalf("expected 2 blocks, got %d", len(blocks))
	}
	if !containsAll(blocks[0], "FROM properties") {
		t.Fatalf("unexpected sql block: %q", blocks[0])
	}
}

func TestCopyCodeFromSection(t *testing.T) {
	_, _, err := Load()
	if err != nil {
		t.Skip("lab-guide.md not available:", err)
	}
	code := CopyCode("m3-completion", "")
	if code == "" {
		t.Fatal("expected ES|QL completion query")
	}
	if !containsAll(code, "COMPLETION") || !containsAll(code, "FROM properties") {
		t.Fatalf("unexpected copy code: %q", code[:min(80, len(code))])
	}
}

func containsAll(s, sub string) bool {
	return len(sub) == 0 || (len(s) >= len(sub) && stringIndex(s, sub) >= 0)
}

func stringIndex(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
