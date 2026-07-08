package tui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"

	"github.com/elastic-bangalore/workshop/internal/config"
)

func setupFieldHelp(cursor int) string {
	switch cursor {
	case 0:
		return config.HelpCloudOrES
	case 1:
		return config.HelpAPIKey
	case 2:
		return config.HelpKibanaURL
	default:
		return ""
	}
}

func setupFieldLabels() []string {
	return []string{
		"1. Cloud ID or Elasticsearch URL:",
		"2. API Key (Encoded / base64):",
		"3. Kibana URL:",
	}
}

func renderSetup(width, height int, values []string, cursor int, errMsg string, showAPIKey bool) string {
	labels := setupFieldLabels()

	var fields strings.Builder
	fields.WriteString(headerStyle.Render("Connect to Elastic Cloud"))
	fields.WriteString("\n\n")
	fields.WriteString(instructionStyle.Render("Paste each value from Elastic Cloud / Kibana. Use Tab or ↑↓ to switch fields."))
	fields.WriteString("\n\n")

	for i, label := range labels {
		style := instructionStyle
		prefix := "  "
		if i == cursor {
			style = selectedStyle
			prefix = "▸ "
		}

		val := ""
		if i < len(values) {
			val = values[i]
			if i == 1 && val != "" && !showAPIKey {
				val = strings.Repeat("*", min(len(val), 24)) + "  (Ctrl+U to replace)"
			}
		}

		line := fmt.Sprintf("%s%s %s", prefix, label, val)
		fields.WriteString(style.Render(line))
		if i == cursor {
			fields.WriteString("█")
		}
		fields.WriteString("\n")
	}

	if errMsg != "" {
		fields.WriteString("\n")
		fields.WriteString(failStyle.Render("✗ " + errMsg))
	}

	fields.WriteString("\n")
	fields.WriteString(footerStyle.Render("Tab/↑↓ field · Ctrl+U clear · Ctrl+H show key · Ctrl+G lab guide · Enter save · Esc back · q quit"))

	left := panelStyle.Width(min(width/2, width-4)).Render(fields.String())

	help := setupFieldHelp(cursor)
	helpPanel := panelStyle.
		Width(max(width-lipgloss.Width(left)-4, 36)).
		Height(max(height-bannerHeight-4, 12)).
		Render(headerStyle.Render("Where to find this") + "\n\n" + instructionStyle.Render(help))

	if width < 100 {
		return fields.String() + "\n\n" + headerStyle.Render("Where to find this") + "\n" + instructionStyle.Render(help) + "\n\n" + footerStyle.Render("Tab/↑↓ · Ctrl+U clear · Ctrl+H show key · Enter save · Esc back · q quit")
	}

	return lipgloss.JoinHorizontal(lipgloss.Top, left, " ", helpPanel)
}

func renderSplash(width, height int) string {
	if width < 20 {
		width = 80
	}

	sub := subtitleStyle.Render("Workshop Lab CLI")
	desc := instructionStyle.Render("Agentic Workflows & Searchable Applications")
	hint := footerStyle.Render("Press any key to continue · g open lab guide · q quit")

	center := lipgloss.NewStyle().Width(width).Align(lipgloss.Center)

	var b strings.Builder
	b.WriteString(renderSplashTitle(width))
	b.WriteString("\n\n")
	b.WriteString(center.Render(sub))
	b.WriteString("\n")
	b.WriteString(center.Render(desc))
	b.WriteString("\n\n")
	b.WriteString(center.Render(hint))

	content := b.String()
	if height > 14 {
		return lipgloss.Place(width, height, lipgloss.Center, lipgloss.Center, content)
	}
	return content
}

func renderSplashLoading(width, height int) string {
	if width < 20 {
		width = 80
	}
	center := lipgloss.NewStyle().Width(width).Align(lipgloss.Center)
	msg := runningStyle.Render("Loading workshop...")
	hint := footerStyle.Render("Please wait...")
	content := center.Render(msg + "\n\n" + hint)
	if height > 10 {
		return lipgloss.Place(width, height, lipgloss.Center, lipgloss.Center, content)
	}
	return content
}
