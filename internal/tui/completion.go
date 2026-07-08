package tui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"

	"github.com/elastic-bangalore/workshop/internal/steps"
)

func renderCompletion(width, height int, states []steps.StepState, certPath, msg string) string {
	passed, total := steps.ProgressCounts(states)
	complete := steps.WorkshopComplete(states)

	var b strings.Builder
	b.WriteString(passStyle.Render("🎉 Workshop Complete!"))
	b.WriteString("\n\n")
	b.WriteString(instructionStyle.Render("Final checklist — all steps finished."))
	b.WriteString("\n\n")

	currentModule := ""
	for _, st := range states {
		if st.Step.Module != currentModule {
			currentModule = st.Step.Module
			b.WriteString(guideStyle.Render(currentModule))
			b.WriteString("\n")
		}
		icon := "○"
		style := pendingStyle
		if steps.StepCompleted(st) {
			icon = "✓"
			style = passStyle
		}
		kind := ""
		if st.Step.Kind == steps.KindGuide {
			kind = " (guide)"
		}
		b.WriteString(style.Render(fmt.Sprintf("  %s %s%s", icon, st.Step.Label, kind)))
		b.WriteString("\n")
	}

	b.WriteString("\n")
	b.WriteString(subtitleStyle.Render(fmt.Sprintf("Score: %d / %d steps", passed, total)))
	b.WriteString("\n\n")

	// Certificate preview box
	certTitle := headerStyle.Render("Certificate of Completion")
	certPreview := instructionStyle.Render(strings.TrimSpace(`
ELASTIC BANGALORE — Workshop Certificate
Agentic Workflows & Searchable Applications
with Elasticsearch, Jina, and A2A`))
	b.WriteString(panelStyle.Width(min(width-8, 72)).Render(certTitle + "\n\n" + certPreview))

	if certPath != "" {
		b.WriteString("\n\n")
		b.WriteString(passStyle.Render("Saved: " + certPath))
	}

	if msg != "" {
		b.WriteString("\n\n")
		if complete {
			b.WriteString(instructionStyle.Render(msg))
		} else {
			b.WriteString(failStyle.Render(msg))
		}
	}

	footer := "d or Enter download certificate · b back to lab · q quit"
	if certPath != "" {
		footer = "d or Enter download again · b back to lab · q quit"
	}
	b.WriteString("\n\n")
	b.WriteString(footerStyle.Render(footer))

	content := b.String()
	maxH := height - bannerHeight - 2
	if maxH < 10 {
		maxH = 10
	}
	return lipgloss.NewStyle().Width(width).Height(maxH).Render(content)
}
