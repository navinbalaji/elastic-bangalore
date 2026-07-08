package tui

import (
	"testing"
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
	if len(out) < 2 || out[len(out)-2:] != "ab" {
		t.Fatalf("expected centered ab, got %q", out)
	}
	// 4 spaces padding + "ab" for width 10
	if out != "    ab" {
		t.Fatalf("expected %q, got %q", "    ab", out)
	}
}
