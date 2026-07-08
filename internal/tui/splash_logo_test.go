package tui

import (
	"testing"

	"github.com/charmbracelet/lipgloss"
)

func TestPickSplashLogo(t *testing.T) {
	if pickSplashLogo(120) == "" {
		t.Fatal("expected block logo on very wide terminal")
	}
	if pickSplashLogo(80) != logoStandard {
		t.Fatalf("expected standard logo on typical terminal, got %q", pickSplashLogo(80))
	}
	if pickSplashLogo(40) != logoSmall {
		t.Fatal("expected small logo on narrow terminal")
	}
	if pickSplashLogo(20) != "" {
		t.Fatal("expected text-only on very narrow terminal")
	}
}

func TestCenterLines(t *testing.T) {
	out := centerLines("ab", 10)
	if lipgloss.Width(out) != 10 {
		t.Fatalf("expected width 10, got %d (%q)", lipgloss.Width(out), out)
	}
}
