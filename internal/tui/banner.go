package tui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// bannerHeight is the number of terminal rows used by the persistent banner + spacer.
const bannerHeight = 3

func renderTopBanner(width int) string {
	bangalore := lipgloss.NewStyle().Bold(true).Foreground(colorAccent).Render("BANGALORE")
	title := titleStyle.Render("ELASTIC") + " " + bangalore
	sub := subtitleStyle.Render("Workshop Lab CLI")

	centered := lipgloss.NewStyle().Width(width).Align(lipgloss.Center)
	line := centered.Render(title + "  ·  " + sub)

	ruleWidth := min(width-2, 96)
	if ruleWidth < 20 {
		ruleWidth = 20
	}
	rule := lipgloss.NewStyle().
		Foreground(colorElastic).
		Width(width).
		Align(lipgloss.Center).
		Render(strings.Repeat("─", ruleWidth))

	return line + "\n" + rule + "\n"
}

func wrapWithBanner(width int, content string) string {
	return renderTopBanner(width) + content
}
