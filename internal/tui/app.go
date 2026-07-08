package tui

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/elastic-bangalore/workshop/internal/clipboard"
	"github.com/elastic-bangalore/workshop/internal/config"
	"github.com/elastic-bangalore/workshop/internal/guide"
	"github.com/elastic-bangalore/workshop/internal/session"
	"github.com/elastic-bangalore/workshop/internal/steps"
	"github.com/elastic-bangalore/workshop/internal/verify"
)

type screen int

const (
	screenSplash screen = iota
	screenSetup
	screenWorkshop
	screenComplete
)

type verifyDoneMsg struct {
	index  int
	result verify.Result
}

type connValidatedMsg struct {
	err     error
	clients *verify.Clients
}

type splashDoneMsg struct {
	cfg *config.Config
	err error
}

type connectSavedMsg struct {
	clients *verify.Clients
	err     error
}

type workshopEnterMsg struct{}

type certSavedMsg struct {
	path string
	err  error
}

type saveSessionMsg struct {
	gen int
}

type clipboardMsg struct {
	ok           bool
	detail       string
	errText      string
	advanceImage bool
}

type App struct {
	configPath string
	cfg        *config.Config
	clients    *verify.Clients
	verifier   *verify.Verifier

	screen screen
	width  int
	height int

	// splash
	splashLeaving bool

	// setup
	setupFields  []string
	setupValues  []string
	setupCursor  int
	setupError   string
	setupSaving  bool
	showAPIKey   bool

	// workshop
	states        []steps.StepState
	cursor        int
	viewport      viewport.Model
	verifyMsg     string
	verifying     bool
	sessionData   *session.Data
	completionMsg string
	saveGen       int
	imageCopyIdx  int
}

func NewApp(configPath string) *App {
	if configPath == "" {
		path, err := config.DefaultPath()
		if err == nil {
			configPath = path
		}
	}

	vp := viewport.New(60, 20)

	return &App{
		configPath:  configPath,
		screen:      screenSplash,
		setupFields: []string{"cloud_id", "api_key", "kibana_url"},
		setupValues: make([]string, 3),
		states:      steps.InitialStates(),
		viewport:    vp,
	}
}

func (a *App) ConfigPath() string {
	return a.configPath
}

func (a *App) Init() tea.Cmd {
	return tea.Batch(
		tea.Tick(2*time.Second, func(time.Time) tea.Msg { return splashTimeoutMsg{} }),
		a.preloadGuideDuringSplash(),
	)
}

func (a *App) preloadGuideDuringSplash() tea.Cmd {
	return func() tea.Msg {
		all := steps.All()
		if len(all) == 0 {
			return workshopEnterMsg{}
		}
		width := 70
		if a.width > 40 {
			width = max(40, a.width/2-2)
		}
		guide.RenderStep(all[0].ID, width, all[0].Instructions)
		return workshopEnterMsg{}
	}
}

type splashTimeoutMsg struct{}

func (a *App) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		a.width = msg.Width
		a.height = msg.Height
		a.viewport.Width = max(40, msg.Width/2-6)
		a.viewport.Height = max(10, msg.Height-bannerHeight-8)
		guide.ClearRenderCache()
		if a.screen == screenWorkshop {
			a.refreshViewport()
		}
		return a, nil

	case tea.KeyMsg:
		switch a.screen {
		case screenSplash:
			if msg.String() == "q" || msg.String() == "ctrl+c" {
				return a, tea.Quit
			}
			if msg.String() == "g" {
				return a, a.openLabGuideInBrowser()
			}
			if a.splashLeaving {
				return a, nil
			}
			a.splashLeaving = true
			return a, a.leaveSplash()
		case screenSetup:
			return a.handleSetupKey(msg)
		case screenWorkshop:
			return a.handleWorkshopKey(msg)
		case screenComplete:
			return a.handleCompletionKey(msg)
		}

	case splashTimeoutMsg:
		if a.screen == screenSplash && !a.splashLeaving {
			a.splashLeaving = true
			return a, a.leaveSplash()
		}

	case workshopEnterMsg:
		// no-op — absorbs preload completion during splash
		return a, nil

	case connectSavedMsg:
		if msg.err != nil {
			a.screen = screenSetup
			a.setupError = config.FriendlyClientError(msg.err)
			return a, nil
		}
		a.clients = msg.clients
		a.verifier = verify.NewVerifier(msg.clients)
		if steps.WorkshopComplete(a.states) {
			a.screen = screenComplete
			a.completionMsg = "Welcome back — workshop already complete!"
		} else {
			a.screen = screenWorkshop
			a.verifyMsg = "Resumed previous session. ↑↓ navigate · Enter verify · r reconfigure · q quit"
		}
		return a, a.deferRefreshViewport()

	case splashDoneMsg:
		if msg.err != nil {
			a.screen = screenSetup
			a.setupError = msg.err.Error()
			return a, nil
		}
		if msg.cfg != nil {
			a.cfg = msg.cfg
			a.loadSession()
			a.screen = screenWorkshop
			a.verifyMsg = "Loading workshop..."
			return a, a.connectSavedConfig()
		}
		a.screen = screenSetup
		return a, nil

	case connValidatedMsg:
		a.setupSaving = false
		if msg.err != nil {
			a.setupError = msg.err.Error()
			return a, nil
		}
		a.clients = msg.clients
		a.verifier = verify.NewVerifier(msg.clients)
		if err := a.cfg.Save(a.configPath); err != nil {
			a.setupError = err.Error()
			return a, nil
		}
		a.screen = screenWorkshop
		a.loadSession()
		a.verifyMsg = "Credentials saved. Select a step and press Enter to verify."
		if steps.WorkshopComplete(a.states) {
			a.screen = screenComplete
			a.completionMsg = "Workshop already complete from a previous session!"
		}
		a.refreshViewport()
		return a, nil

	case certSavedMsg:
		if msg.err != nil {
			a.completionMsg = "Failed to save certificate: " + msg.err.Error()
		} else {
			a.completionMsg = "Certificate saved to:\n" + msg.path
			if a.sessionData != nil {
				a.sessionData.CertificatePath = msg.path
			}
			a.persistSession()
		}
		return a, nil

	case saveSessionMsg:
		if msg.gen == a.saveGen {
			a.persistSession()
		}
		return a, nil

	case clipboardMsg:
		if msg.ok {
			a.verifyMsg = msg.detail
			if msg.advanceImage {
				a.imageCopyIdx++
			}
		} else {
			a.verifyMsg = "Copy failed: " + msg.errText
		}
		return a, nil

	case deferredRefreshMsg:
		if a.screen == screenWorkshop {
			a.refreshViewport()
			return a, a.warmInstructionCache()
		}
		return a, nil

	case verifyDoneMsg:
		a.verifying = false
		a.states[msg.index].Status = steps.StatusFail
		a.states[msg.index].Reason = msg.result.Reason
		if msg.result.Pass {
			a.states[msg.index].Status = steps.StatusPass
		}
		a.verifyMsg = msg.result.Reason
		a.persistSession()
		a.refreshViewport()
		if steps.WorkshopComplete(a.states) {
			a.screen = screenComplete
			a.completionMsg = "All steps complete! Press d or Enter to download your certificate."
		} else if steps.VerifiableComplete(a.states) {
			a.verifyMsg = "All API checks passed — acknowledge remaining guide steps with Space."
		}
		return a, nil
	}

	var cmd tea.Cmd
	a.viewport, cmd = a.viewport.Update(msg)
	return a, cmd
}

func (a *App) leaveSplash() tea.Cmd {
	path := a.configPath
	return func() tea.Msg {
		if path != "" && config.Exists(path) {
			cfg, err := config.Load(path)
			if err != nil {
				return splashDoneMsg{err: err}
			}
			return splashDoneMsg{cfg: cfg}
		}
		return splashDoneMsg{}
	}
}

func (a *App) connectSavedConfig() tea.Cmd {
	cfg := a.cfg
	return func() tea.Msg {
		clients, err := verify.NewClients(cfg)
		return connectSavedMsg{clients: clients, err: err}
	}
}

func (a *App) deferRefreshViewport() tea.Cmd {
	return tea.Tick(10*time.Millisecond, func(time.Time) tea.Msg {
		return deferredRefreshMsg{}
	})
}

type deferredRefreshMsg struct{}


func (a *App) handleSetupKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	if a.setupSaving {
		return a, nil
	}

	switch msg.String() {
	case "ctrl+c", "q":
		return a, tea.Quit
	case "ctrl+g":
		return a, a.openLabGuideInBrowser()
	case "esc":
		if a.cfg != nil {
			a.screen = screenWorkshop
			a.setupError = ""
		}
		return a, nil
	case "tab", "down":
		a.setupCursor = (a.setupCursor + 1) % len(a.setupFields)
		a.showAPIKey = false
		return a, nil
	case "shift+tab", "up":
		a.setupCursor = (a.setupCursor - 1 + len(a.setupFields)) % len(a.setupFields)
		a.showAPIKey = false
		return a, nil
	case "ctrl+u":
		a.setupValues[a.setupCursor] = ""
		a.setupError = ""
		return a, nil
	case "ctrl+h":
		if a.setupCursor == 1 {
			a.showAPIKey = !a.showAPIKey
		}
		return a, nil
	case "enter":
		return a, a.saveSetup()
	case "backspace":
		if len(a.setupValues[a.setupCursor]) > 0 {
			a.setupValues[a.setupCursor] = a.setupValues[a.setupCursor][:len(a.setupValues[a.setupCursor])-1]
		}
		a.setupError = ""
		return a, nil
	default:
		if len(msg.Runes) > 0 {
			a.setupValues[a.setupCursor] += string(msg.Runes)
			a.setupError = ""
		}
		return a, nil
	}
}

func (a *App) saveSetup() tea.Cmd {
	cfg, err := config.ValidateCredentials(
		a.setupValues[0],
		a.setupValues[1],
		a.setupValues[2],
	)
	if err != nil {
		a.setupError = err.Error()
		return nil
	}

	a.setupSaving = true
	a.setupError = ""
	a.cfg = cfg

	return func() tea.Msg {
		clients, err := verify.NewClients(cfg)
		if err != nil {
			return connValidatedMsg{err: fmt.Errorf("%s", config.FriendlyClientError(err))}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if err := clients.ValidateConnection(ctx); err != nil {
			return connValidatedMsg{err: fmt.Errorf("%s", config.FriendlyClientError(err))}
		}
		return connValidatedMsg{clients: clients}
	}
}

func (a *App) handleWorkshopKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	if a.verifying {
		return a, nil
	}

	switch msg.String() {
	case "ctrl+c", "q":
		a.persistSession()
		return a, tea.Quit
	case "r":
		a.screen = screenSetup
		a.showAPIKey = false
		if a.cfg != nil {
			a.setupValues[0] = a.cfg.ConnectionDisplayValue()
			a.setupValues[1] = a.cfg.APIKey
			a.setupValues[2] = a.cfg.KibanaURL
		}
		a.setupError = ""
		return a, nil
	case "up", "k":
		if a.cursor > 0 {
			a.cursor--
			a.imageCopyIdx = 0
			a.refreshViewport()
			return a, tea.Batch(a.scheduleSave(), a.warmInstructionCache())
		}
		var cmd tea.Cmd
		a.viewport, cmd = a.viewport.Update(msg)
		return a, cmd
	case "down", "j":
		if a.cursor < len(a.states)-1 {
			a.cursor++
			a.imageCopyIdx = 0
			a.refreshViewport()
			return a, tea.Batch(a.scheduleSave(), a.warmInstructionCache())
		}
		var cmd tea.Cmd
		a.viewport, cmd = a.viewport.Update(msg)
		return a, cmd
	case "pgup", "pgdown", "home", "end", "b", "f", "u", "d":
		var cmd tea.Cmd
		a.viewport, cmd = a.viewport.Update(msg)
		return a, cmd
	case " ":
		a.states[a.cursor].Marked = !a.states[a.cursor].Marked
		if a.states[a.cursor].Step.Kind == steps.KindGuide && a.states[a.cursor].Marked {
			a.verifyMsg = "Guide step acknowledged."
		}
		a.persistSession()
		if steps.WorkshopComplete(a.states) {
			a.screen = screenComplete
			a.completionMsg = "All steps complete! Press d or Enter to download your certificate."
		}
		return a, nil
	case "enter":
		return a, a.runVerify()
	case "y":
		return a, a.copyStepCode()
	case "c":
		return a, a.copyStepText()
	case "o":
		return a, a.copyStepImageURL()
	case "O", "ctrl+o":
		return a, a.openStepImageInBrowser()
	case "g":
		return a, a.openLabGuideInBrowser()
	}

	var cmd tea.Cmd
	a.viewport, cmd = a.viewport.Update(msg)
	return a, cmd
}

func (a *App) runVerify() tea.Cmd {
	st := a.states[a.cursor]
	if st.Step.Kind == steps.KindGuide {
		a.verifyMsg = "Guide step — complete in Kibana. Verification happens on the next check step."
		return nil
	}
	if a.verifier == nil {
		a.verifyMsg = "Not connected — press r to configure credentials"
		return nil
	}

	idx := a.cursor
	a.verifying = true
	a.states[idx].Status = steps.StatusRunning
	a.verifyMsg = "Verifying..."

	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
		defer cancel()
		result := a.verifier.Verify(ctx, st.Step.ID)
		return verifyDoneMsg{index: idx, result: result}
	}
}

func (a *App) refreshViewport() {
	if a.cursor < 0 || a.cursor >= len(a.states) {
		return
	}
	st := a.states[a.cursor]
	width := max(40, a.viewport.Width-2)

	content := guide.RenderStep(st.Step.ID, width, st.Step.Instructions)

	if st.Step.Kind == steps.KindVerifiable {
		content = verifyBanner + "\n\n" + content
	}
	if st.Reason != "" {
		content += "\n\n" + strings.Repeat("─", min(40, width)) + "\n" + st.Reason
	}
	if st.Step.Kind == steps.KindGuide {
		content += "\n\n[Guide step — press Space to acknowledge when done in Kibana]"
	}
	a.viewport.SetContent(content)
	a.viewport.GotoTop()
}

func (a *App) View() string {
	if a.width == 0 {
		a.width = 100
	}
	if a.height == 0 {
		a.height = 30
	}

	switch a.screen {
	case screenSplash:
		if a.splashLeaving {
			return renderSplashLoading(a.width, a.height)
		}
		return renderSplash(a.width, a.height)
	case screenSetup:
		return wrapWithBanner(a.width, renderSetup(a.width, a.height, a.setupValues, a.setupCursor, a.setupError, a.showAPIKey))
	case screenWorkshop:
		return wrapWithBanner(a.width, a.renderWorkshop())
	case screenComplete:
		certPath := ""
		if a.sessionData != nil {
			certPath = a.sessionData.CertificatePath
		}
		return wrapWithBanner(a.width, renderCompletion(a.width, a.height, a.states, certPath, a.completionMsg))
	default:
		return ""
	}
}

func (a *App) renderWorkshop() string {
	leftWidth := a.width/2 - 2
	if leftWidth < 30 {
		leftWidth = 30
	}

	var list strings.Builder
	list.WriteString(subtitleStyle.Render("Lab Progress Checklist"))
	list.WriteString("\n\n")

	currentModule := ""
	for i, st := range a.states {
		if st.Step.Module != currentModule {
			currentModule = st.Step.Module
			list.WriteString(guideStyle.Render(currentModule))
			list.WriteString("\n")
		}

		icon := statusIcon(int(st.Status))
		mark := " "
		if st.Marked {
			mark = "▸"
		}

		label := st.Step.Label
		if st.Step.Kind == steps.KindGuide {
			label += " (guide)"
		}

		line := fmt.Sprintf("%s %s %s", mark, icon, label)
		switch {
		case i == a.cursor:
			line = selectedStyle.Render("→ " + strings.TrimSpace(line) + " ◀")
		case st.Step.Kind == steps.KindGuide:
			line = guideStyle.Render(line)
		default:
			line = statusStyle(int(st.Status)).Render(line)
		}
		list.WriteString(line)
		list.WriteString("\n")
	}

	left := panelStyle.Width(leftWidth).Height(a.height - bannerHeight - 4).Render(list.String())

	rightHeader := headerStyle.Render("Instructions")
	rightBody := a.viewport.View()
	right := panelStyle.Width(a.width-leftWidth-6).Height(a.height-bannerHeight-4).
		Render(rightHeader + "\n\n" + rightBody)

	footer := footerStyle.Render("↑↓ step · PgUp/PgDn scroll · y code · c text · o image · O open image · g lab guide · Space · Enter · r · q quit")
	passed, total := steps.ProgressCounts(a.states)
	footer = footerStyle.Render(fmt.Sprintf("Progress %d/%d · ", passed, total)) + footer
	if a.verifyMsg != "" {
		footer = footerStyle.Render(a.verifyMsg) + "\n" + footer
	}

	return lipgloss.JoinHorizontal(lipgloss.Top, left, " ", right) + "\n\n" + footer
}

func (a *App) loadSession() {
	var cursor int
	a.sessionData, a.states, cursor = session.LoadOrCreate(a.states)
	a.cursor = cursor
}

func (a *App) persistSession() {
	if a.sessionData == nil {
		a.sessionData = &session.Data{Steps: map[string]session.StepRecord{}}
	}
	certPath := a.sessionData.CertificatePath
	a.sessionData = session.Merge(a.sessionData, a.states, a.cursor, certPath)
	_ = session.Save(a.sessionData)
}

func (a *App) scheduleSave() tea.Cmd {
	a.saveGen++
	gen := a.saveGen
	return tea.Tick(300*time.Millisecond, func(time.Time) tea.Msg {
		return saveSessionMsg{gen: gen}
	})
}

func (a *App) warmInstructionCache() tea.Cmd {
	cursor := a.cursor
	width := max(40, a.viewport.Width-2)
	ids := make([]string, len(a.states))
	for i, st := range a.states {
		ids[i] = st.Step.ID
	}
	return func() tea.Msg {
		guide.WarmCache(ids, cursor, width)
		return nil
	}
}

func (a *App) copyStepCode() tea.Cmd {
	if a.cursor < 0 || a.cursor >= len(a.states) {
		return nil
	}
	st := a.states[a.cursor]
	return func() tea.Msg {
		text := guide.CopyCode(st.Step.ID, st.Step.Instructions)
		if text == "" {
			return clipboardMsg{errText: "no code block for this step"}
		}
		if err := clipboard.Write(text); err != nil {
			return clipboardMsg{errText: err.Error()}
		}
		lines := strings.Count(text, "\n") + 1
		return clipboardMsg{ok: true, detail: fmt.Sprintf("Copied code to clipboard (%d lines) — paste into Kibana", lines)}
	}
}

func (a *App) copyStepText() tea.Cmd {
	if a.cursor < 0 || a.cursor >= len(a.states) {
		return nil
	}
	st := a.states[a.cursor]
	return func() tea.Msg {
		text := guide.PlainSection(st.Step.ID, st.Step.Instructions)
		if err := clipboard.Write(text); err != nil {
			return clipboardMsg{errText: err.Error()}
		}
		return clipboardMsg{ok: true, detail: "Copied step instructions to clipboard"}
	}
}

func (a *App) copyStepImageURL() tea.Cmd {
	if a.cursor < 0 || a.cursor >= len(a.states) {
		return nil
	}
	st := a.states[a.cursor]
	idx := a.imageCopyIdx
	return func() tea.Msg {
		urls := guide.ImageURLs(st.Step.ID)
		if len(urls) == 0 {
			return clipboardMsg{errText: "no images for this step"}
		}
		url := urls[idx%len(urls)]
		if err := clipboard.Write(url); err != nil {
			return clipboardMsg{errText: err.Error()}
		}
		return clipboardMsg{
			ok:           true,
			detail:       fmt.Sprintf("Copied image %d/%d — paste in browser", idx%len(urls)+1, len(urls)),
			advanceImage: len(urls) > 1,
		}
	}
}

func (a *App) openStepImageInBrowser() tea.Cmd {
	if a.cursor < 0 || a.cursor >= len(a.states) {
		return nil
	}
	st := a.states[a.cursor]
	idx := a.imageCopyIdx
	return func() tea.Msg {
		urls := guide.ImageURLs(st.Step.ID)
		if len(urls) == 0 {
			return clipboardMsg{errText: "no images for this step"}
		}
		url := urls[idx%len(urls)]
		if err := clipboard.OpenURL(url); err != nil {
			// Fall back to clipboard if browser open fails
			if clipErr := clipboard.Write(url); clipErr != nil {
				return clipboardMsg{errText: err.Error()}
			}
			return clipboardMsg{
				ok:           true,
				detail:       fmt.Sprintf("Could not open browser — copied image %d/%d to clipboard instead", idx%len(urls)+1, len(urls)),
				advanceImage: len(urls) > 1,
			}
		}
		return clipboardMsg{
			ok:           true,
			detail:       fmt.Sprintf("Opened image %d/%d in browser", idx%len(urls)+1, len(urls)),
			advanceImage: len(urls) > 1,
		}
	}
}

func (a *App) openLabGuideInBrowser() tea.Cmd {
	return func() tea.Msg {
		url := guide.LabGuideWebURL
		if err := clipboard.OpenURL(url); err != nil {
			if clipErr := clipboard.Write(url); clipErr != nil {
				return clipboardMsg{errText: err.Error()}
			}
			return clipboardMsg{ok: true, detail: "Could not open browser — copied lab guide URL to clipboard"}
		}
		return clipboardMsg{ok: true, detail: "Opened lab guide in browser"}
	}
}

func (a *App) handleCompletionKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "ctrl+c", "q":
		a.persistSession()
		return a, tea.Quit
	case "b":
		a.screen = screenWorkshop
		a.completionMsg = ""
		return a, nil
	case "d", "enter":
		return a, a.downloadCertificate()
	case "g":
		return a, a.openLabGuideInBrowser()
	}
	return a, nil
}

func (a *App) downloadCertificate() tea.Cmd {
	states := a.states
	sessionID := ""
	if a.sessionData != nil {
		sessionID = a.sessionData.SessionID
	}
	return func() tea.Msg {
		path, err := session.WriteCertificate(states, sessionID)
		return certSavedMsg{path: path, err: err}
	}
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
