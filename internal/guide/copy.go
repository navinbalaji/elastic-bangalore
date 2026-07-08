package guide

import (
	"strings"
)

// PlainSection returns the lab-guide markdown for a step (no terminal styling).
func PlainSection(stepID string, fallback string) string {
	md, ok := cachedSectionMarkdown(stepID)
	if !ok {
		return fallback
	}
	return stripImageLines(md)
}

// CodeBlocks returns fenced code blocks from the step's lab-guide section.
func CodeBlocks(stepID string, fallback string) []string {
	md, ok := cachedSectionMarkdown(stepID)
	if !ok {
		if strings.TrimSpace(fallback) != "" {
			return []string{strings.TrimSpace(fallback)}
		}
		return nil
	}
	blocks := extractFencedBlocks(md)
	if len(blocks) == 0 && strings.TrimSpace(fallback) != "" {
		return []string{strings.TrimSpace(fallback)}
	}
	return blocks
}

// CopyCode returns the best text to paste into Kibana (largest code block, or all joined).
func CopyCode(stepID string, fallback string) string {
	blocks := CodeBlocks(stepID, fallback)
	if len(blocks) == 0 {
		return ""
	}
	if len(blocks) == 1 {
		return blocks[0]
	}
	// Prefer the longest block (usually the main query); if similar size, join all.
	longest := blocks[0]
	for _, b := range blocks[1:] {
		if len(b) > len(longest) {
			longest = b
		}
	}
	if len(longest) > 80 {
		return longest
	}
	return strings.Join(blocks, "\n\n")
}

func stripImageLines(md string) string {
	lines := strings.Split(md, "\n")
	out := make([]string, 0, len(lines))
	for _, line := range lines {
		trim := strings.TrimSpace(line)
		if strings.HasPrefix(trim, "![") {
			continue
		}
		out = append(out, line)
	}
	return strings.TrimSpace(strings.Join(out, "\n"))
}

func extractFencedBlocks(md string) []string {
	var blocks []string
	lines := strings.Split(md, "\n")
	inFence := false
	var fence strings.Builder
	fenceLang := ""

	flush := func() {
		if fence.Len() == 0 {
			return
		}
		blocks = append(blocks, strings.TrimRight(fence.String(), "\n"))
		fence.Reset()
	}

	for _, line := range lines {
		trim := strings.TrimSpace(line)
		if strings.HasPrefix(trim, "```") {
			if !inFence {
				inFence = true
				fenceLang = strings.TrimPrefix(trim, "```")
				_ = fenceLang
				fence.Reset()
				continue
			}
			inFence = false
			flush()
			continue
		}
		if inFence {
			if fence.Len() > 0 {
				fence.WriteByte('\n')
			}
			fence.WriteString(line)
		}
	}
	if inFence {
		flush()
	}
	return blocks
}
