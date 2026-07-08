package clipboard

import (
	"fmt"
	"os/exec"
	"runtime"
	"strings"
)

// Write copies text to the system clipboard.
func Write(text string) error {
	text = strings.TrimSpace(text)
	if text == "" {
		return fmt.Errorf("nothing to copy")
	}

	switch runtime.GOOS {
	case "darwin":
		return runWithStdin(exec.Command("pbcopy"), text)
	case "linux":
		if err := runWithStdin(exec.Command("wl-copy"), text); err == nil {
			return nil
		}
		cmd := exec.Command("xclip", "-selection", "clipboard")
		return runWithStdin(cmd, text)
	case "windows":
		return runWithStdin(exec.Command("clip"), text)
	default:
		return fmt.Errorf("clipboard not supported on %s", runtime.GOOS)
	}
}

// OpenURL opens a URL in the default browser.
func OpenURL(url string) error {
	url = strings.TrimSpace(url)
	if url == "" {
		return fmt.Errorf("empty URL")
	}
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "linux":
		cmd = exec.Command("xdg-open", url)
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", "", url)
	default:
		return fmt.Errorf("open URL not supported on %s", runtime.GOOS)
	}
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("open browser: %w", err)
	}
	return nil
}

func runWithStdin(cmd *exec.Cmd, text string) error {
	cmd.Stdin = strings.NewReader(text)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("clipboard: %w", err)
	}
	return nil
}
