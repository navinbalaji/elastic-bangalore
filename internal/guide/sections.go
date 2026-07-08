package guide

import (
	"strings"
)

func extractSection(doc string, spec Section) (string, bool) {
	lines := strings.Split(doc, "\n")
	moduleStart := -1
	if spec.Module != "" {
		moduleStart = findHeading(lines, spec.Module, 2)
		if moduleStart < 0 {
			return "", false
		}
	}

	searchFrom := 0
	searchUntil := len(lines)
	if moduleStart >= 0 {
		searchFrom = moduleStart
		searchUntil = findNextHeading(lines, moduleStart, 2)
		if searchUntil < 0 {
			searchUntil = len(lines)
		}
	}

	start := findHeadingInRange(lines, spec.Start, searchFrom, searchUntil)
	if start < 0 {
		return "", false
	}

	startLevel := headingLevel(lines[start])
	end := searchUntil
	if spec.End != "" {
		if endIdx := findHeadingInRange(lines, spec.End, start+1, searchUntil); endIdx >= 0 {
			end = endIdx
		}
	} else {
		if next := findNextHeading(lines, start, startLevel); next >= 0 && next < end {
			end = next
		}
	}

	body := strings.TrimSpace(strings.Join(lines[start:end], "\n"))
	if body == "" {
		return "", false
	}
	return body, true
}

func findHeading(lines []string, text string, level int) int {
	for i, line := range lines {
		if headingLevel(line) == level && headingContains(line, text) {
			return i
		}
	}
	return -1
}

func findHeadingInRange(lines []string, text string, from, until int) int {
	for i := from; i < until && i < len(lines); i++ {
		if headingLevel(lines[i]) > 0 && headingContains(lines[i], text) {
			return i
		}
	}
	return -1
}

func findNextHeading(lines []string, from int, maxLevel int) int {
	for i := from + 1; i < len(lines); i++ {
		lvl := headingLevel(lines[i])
		if lvl > 0 && lvl <= maxLevel {
			return i
		}
	}
	return -1
}

func headingLevel(line string) int {
	trim := strings.TrimSpace(line)
	if !strings.HasPrefix(trim, "#") {
		return 0
	}
	n := 0
	for n < len(trim) && trim[n] == '#' {
		n++
	}
	if n == 0 || n >= len(trim) || trim[n] != ' ' {
		return 0
	}
	return n
}

func headingContains(line, text string) bool {
	trim := strings.TrimSpace(line)
	trim = strings.TrimLeft(trim, "#")
	trim = strings.TrimSpace(trim)
	return strings.Contains(trim, text)
}
