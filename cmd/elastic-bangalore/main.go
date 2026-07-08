package main

import (
	"flag"
	"fmt"
	"os"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/elastic-bangalore/workshop/internal/config"
	"github.com/elastic-bangalore/workshop/internal/tui"
)

func main() {
	configPath := flag.String("config", "", "path to config file (default: ~/.elastic-bangalore/config.yaml)")
	flag.Parse()

	app := tui.NewApp(*configPath)
	p := tea.NewProgram(app, tea.WithAltScreen())
	if err := p.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}

	if app.ConfigPath() != "" && !config.Exists(app.ConfigPath()) {
		// config was deleted or never saved — non-fatal
	}
}
