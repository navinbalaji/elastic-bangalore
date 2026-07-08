package session

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/elastic-bangalore/workshop/internal/steps"
)

func GenerateCertificate(states []steps.StepState, sessionID string) string {
	completed := time.Now().UTC().Format("January 2, 2006")
	var b strings.Builder

	b.WriteString("╔══════════════════════════════════════════════════════════════════╗\n")
	b.WriteString("║                                                                  ║\n")
	b.WriteString("║                    ELASTIC BANGALORE                             ║\n")
	b.WriteString("║              WORKSHOP CERTIFICATE OF COMPLETION                  ║\n")
	b.WriteString("║                                                                  ║\n")
	b.WriteString("╚══════════════════════════════════════════════════════════════════╝\n\n")
	b.WriteString("This certifies that the holder has successfully completed the\n")
	b.WriteString("Elastic Bangalore hands-on workshop:\n\n")
	b.WriteString("  Agentic Workflows & Searchable Applications\n")
	b.WriteString("  with Elasticsearch, Jina, and A2A\n\n")
	b.WriteString(fmt.Sprintf("Completed on: %s\n", completed))
	b.WriteString(fmt.Sprintf("Session ID:     %s\n\n", sessionID))
	b.WriteString("Modules completed:\n")
	b.WriteString("──────────────────────────────────────────────────────────────────\n")

	currentModule := ""
	for _, st := range states {
		if st.Step.Module != currentModule {
			currentModule = st.Step.Module
			b.WriteString(fmt.Sprintf("\n%s\n", currentModule))
		}
		icon := "[ ]"
		if steps.StepCompleted(st) {
			icon = "[✓]"
		}
		b.WriteString(fmt.Sprintf("  %s %s\n", icon, st.Step.Label))
	}

	b.WriteString("\n──────────────────────────────────────────────────────────────────\n")
	passed, total := steps.ProgressCounts(states)
	b.WriteString(fmt.Sprintf("Progress: %d / %d steps completed\n\n", passed, total))
	b.WriteString("Elastic Bangalore Community Workshop\n")
	b.WriteString("https://www.elastic.co\n")

	return b.String()
}

func WriteCertificate(states []steps.StepState, sessionID string) (string, error) {
	dir, err := CertificatesDirPath()
	if err != nil {
		return "", err
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}

	filename := fmt.Sprintf("elastic-bangalore-certificate-%s.txt",
		time.Now().UTC().Format("20060102-150405"))
	path := filepath.Join(dir, filename)

	content := GenerateCertificate(states, sessionID)
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		return "", err
	}
	return path, nil
}
