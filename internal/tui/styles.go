package tui

import (
	"github.com/charmbracelet/lipgloss"
)

var (
	colorElastic = lipgloss.Color("#00BFB3")
	colorAccent  = lipgloss.Color("#FEC514")
	colorMuted   = lipgloss.Color("#888888")
	colorPass    = lipgloss.Color("#00C853")
	colorFail    = lipgloss.Color("#FF5252")
	colorRunning = lipgloss.Color("#42A5F5")
	colorGuide   = lipgloss.Color("#AB47BC")

	titleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(colorElastic).
			MarginBottom(1)

	subtitleStyle = lipgloss.NewStyle().
			Foreground(colorAccent).
			MarginBottom(1)

	headerStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(colorElastic)

	footerStyle = lipgloss.NewStyle().
			Foreground(colorMuted)

	panelStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(colorElastic).
			Padding(0, 1)

	instructionStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("#CCCCCC"))

	selectedStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(colorAccent)

	pendingStyle = lipgloss.NewStyle().Foreground(colorMuted)
	passStyle    = lipgloss.NewStyle().Foreground(colorPass).Bold(true)
	failStyle    = lipgloss.NewStyle().Foreground(colorFail).Bold(true)
	runningStyle = lipgloss.NewStyle().Foreground(colorRunning).Bold(true)
	guideStyle   = lipgloss.NewStyle().Foreground(colorGuide)

	verifyBanner = lipgloss.NewStyle().Bold(true).Foreground(colorAccent).Render("Press Enter to auto-verify this step")
)

func statusIcon(status int) string {
	switch status {
	case 0: // pending
		return "○"
	case 1: // running
		return "◌"
	case 2: // pass
		return "✓"
	case 3: // fail
		return "✗"
	default:
		return "?"
	}
}

func statusStyle(status int) lipgloss.Style {
	switch status {
	case 2:
		return passStyle
	case 3:
		return failStyle
	case 1:
		return runningStyle
	default:
		return pendingStyle
	}
}
