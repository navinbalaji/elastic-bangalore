package tui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// Logo tiers — widest first. ASCII fonts read better in narrow terminals.
const (
	logoBlock = `███████╗██╗      █████╗ ███████╗████████╗██╗ ██████╗
██╔════╝██║     ██╔══██╗██╔════╝╚══██╔══╝██║██╔════╝
█████╗  ██║     ███████║███████╗   ██║   ██║██║
██╔══╝  ██║     ██╔══██║╚════██║   ██║   ██║██║
███████╗███████╗██║  ██║███████║   ██║   ██║╚██████╗
╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝ ╚═════╝`

	logoStandard = ` _____ _        _    ____ _____ ___ ____
| ____| |      / \  / ___|_   _|_ _/ ___|
|  _| | |     / _ \ \___ \ | |  | | |
| |___| |___ / ___ \ ___) || |  | | |___
|_____|_____/_/   \_\____/ |_| |___\____`

	logoSmall = ` ___ _      _   ___ _____ ___ ___
| __| |    /_\ / __|_   _|_ _/ __|
| _|| |__ / _ \\__ \ | |  | | (__
|___|____/_/ \_\___/ |_| |___\___`
)

func pickSplashLogo(termWidth int) string {
	margin := 4
	usable := termWidth - margin

	// Prefer spaced ASCII art on typical laptop terminals; block logo only when very wide.
	switch {
	case usable >= 100 && maxLineWidth(logoBlock) <= usable:
		return logoBlock
	case maxLineWidth(logoStandard) <= usable:
		return logoStandard
	case maxLineWidth(logoSmall) <= usable:
		return logoSmall
	default:
		return ""
	}
}

func maxLineWidth(s string) int {
	max := 0
	for _, line := range strings.Split(s, "\n") {
		line = strings.TrimRight(line, " ")
		if w := lipgloss.Width(line); w > max {
			max = w
		}
	}
	return max
}

func centerLines(s string, width int) string {
	var out []string
	for _, line := range strings.Split(strings.TrimRight(s, "\n"), "\n") {
		line = strings.TrimRight(line, " ")
		if line == "" {
			continue
		}
		w := lipgloss.Width(line)
		pad := 0
		if w < width {
			pad = (width - w) / 2
		}
		out = append(out, strings.Repeat(" ", pad)+line)
	}
	return strings.Join(out, "\n")
}

func renderSplashTitle(width int) string {
	center := lipgloss.NewStyle().Width(width).Align(lipgloss.Center)

	logo := pickSplashLogo(width)
	if logo != "" {
		styled := titleStyle.Render(centerLines(logo, width))
		bangalore := lipgloss.NewStyle().Bold(true).Foreground(colorAccent).Render("BANGALORE")
		return styled + "\n\n" + center.Render(bangalore)
	}

	elastic := titleStyle.Render("ELASTIC")
	bangalore := lipgloss.NewStyle().Bold(true).Foreground(colorAccent).Render("BANGALORE")
	return center.Render(elastic + "\n" + bangalore)
}
