package session

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/elastic-bangalore/workshop/internal/steps"
)

const (
	FileName        = "session.json"
	CertificatesDir = "certificates"
	SessionVersion  = 1
)

type StepRecord struct {
	Status     string `json:"status"`
	Reason     string `json:"reason,omitempty"`
	Marked     bool   `json:"marked"`
	VerifiedAt string `json:"verified_at,omitempty"`
	UpdatedAt  string `json:"updated_at,omitempty"`
}

type Data struct {
	Version         int                   `json:"version"`
	SessionID       string                `json:"session_id"`
	StartedAt       string                `json:"started_at"`
	LastUpdated     string                `json:"last_updated"`
	CompletedAt     string                `json:"completed_at,omitempty"`
	Cursor          int                   `json:"cursor"`
	CertificatePath string                `json:"certificate_path,omitempty"`
	Steps           map[string]StepRecord `json:"steps"`
}

func Dir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".elastic-bangalore"), nil
}

func Path() (string, error) {
	dir, err := Dir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, FileName), nil
}

func CertificatesDirPath() (string, error) {
	dir, err := Dir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, CertificatesDir), nil
}

func Load() (*Data, error) {
	path, err := Path()
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var s Data
	if err := json.Unmarshal(data, &s); err != nil {
		return nil, fmt.Errorf("parse session: %w", err)
	}
	return &s, nil
}

func Save(s *Data) error {
	if s == nil {
		return nil
	}
	s.Version = SessionVersion
	s.LastUpdated = time.Now().UTC().Format(time.RFC3339)
	if s.SessionID == "" {
		s.SessionID = newSessionID()
	}
	if s.StartedAt == "" {
		s.StartedAt = s.LastUpdated
	}
	if s.Steps == nil {
		s.Steps = map[string]StepRecord{}
	}

	path, err := Path()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	raw, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, raw, 0o600)
}

func newSessionID() string {
	return fmt.Sprintf("eb-%d", time.Now().UnixNano())
}

func statusToString(s steps.Status) string {
	switch s {
	case steps.StatusPass:
		return "pass"
	case steps.StatusFail:
		return "fail"
	case steps.StatusRunning:
		return "running"
	default:
		return "pending"
	}
}

func stringToStatus(s string) steps.Status {
	switch s {
	case "pass":
		return steps.StatusPass
	case "fail":
		return steps.StatusFail
	case "running":
		return steps.StatusRunning
	default:
		return steps.StatusPending
	}
}

func (s *Data) ApplyToStates(states []steps.StepState) []steps.StepState {
	if s == nil || len(s.Steps) == 0 {
		return states
	}
	for i := range states {
		rec, ok := s.Steps[states[i].Step.ID]
		if !ok {
			continue
		}
		states[i].Status = stringToStatus(rec.Status)
		states[i].Reason = rec.Reason
		states[i].Marked = rec.Marked
	}
	return states
}

// Merge updates session data from current UI state.
func Merge(base *Data, states []steps.StepState, cursor int, certPath string) *Data {
	if base == nil {
		base = &Data{Steps: map[string]StepRecord{}}
	}
	if base.Steps == nil {
		base.Steps = map[string]StepRecord{}
	}
	base.Cursor = cursor
	if certPath != "" {
		base.CertificatePath = certPath
	}
	now := time.Now().UTC().Format(time.RFC3339)
	for _, st := range states {
		rec := StepRecord{
			Status:    statusToString(st.Status),
			Reason:    st.Reason,
			Marked:    st.Marked,
			UpdatedAt: now,
		}
		if st.Step.Kind == steps.KindVerifiable && st.Status == steps.StatusPass {
			if prev, ok := base.Steps[st.Step.ID]; ok && prev.VerifiedAt != "" {
				rec.VerifiedAt = prev.VerifiedAt
			} else {
				rec.VerifiedAt = now
			}
		}
		base.Steps[st.Step.ID] = rec
	}
	if base.SessionID == "" {
		base.SessionID = newSessionID()
	}
	if base.StartedAt == "" {
		base.StartedAt = now
	}
	if steps.WorkshopComplete(states) && base.CompletedAt == "" {
		base.CompletedAt = now
	}
	return base
}

// LoadOrCreate loads session.json and restores step progress and cursor.
func LoadOrCreate(states []steps.StepState) (*Data, []steps.StepState, int) {
	s, err := Load()
	if err != nil || s == nil {
		return &Data{Steps: map[string]StepRecord{}}, states, 0
	}
	states = s.ApplyToStates(states)
	cursor := s.Cursor
	if cursor < 0 || cursor >= len(states) {
		cursor = 0
	}
	return s, states, cursor
}
