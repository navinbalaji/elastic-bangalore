package session

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/elastic-bangalore/workshop/internal/steps"
)

func TestMergeAndLoadRoundTrip(t *testing.T) {
	states := steps.InitialStates()
	states[0].Status = steps.StatusPass
	states[0].Reason = "ok"

	s := Merge(&Data{Steps: map[string]StepRecord{}}, states, 2, "")
	if s.SessionID == "" {
		t.Fatal("expected session id")
	}
	if s.Steps["m1-embeddings"].Status != "pass" {
		t.Fatalf("expected pass, got %s", s.Steps["m1-embeddings"].Status)
	}
	if s.Cursor != 2 {
		t.Fatalf("expected cursor 2, got %d", s.Cursor)
	}

	dir := t.TempDir()
	oldHome := os.Getenv("HOME")
	t.Setenv("HOME", dir)
	// session uses UserHomeDir which respects HOME on unix
	_ = oldHome

	if err := Save(s); err != nil {
		t.Fatal(err)
	}

	path, _ := Path()
	if _, err := os.Stat(path); err != nil {
		t.Fatalf("session file not written: %v", err)
	}

	loaded, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	fresh := steps.InitialStates()
	fresh = loaded.ApplyToStates(fresh)
	if fresh[0].Status != steps.StatusPass {
		t.Fatal("restore failed")
	}
	if loaded.Cursor != 2 {
		t.Fatalf("expected cursor 2 in file, got %d", loaded.Cursor)
	}
}

func TestWriteCertificate(t *testing.T) {
	dir := t.TempDir()
	// patch via temp home
	t.Setenv("HOME", dir)

	states := steps.InitialStates()
	for i := range states {
		if states[i].Step.Kind == steps.KindVerifiable {
			states[i].Status = steps.StatusPass
		} else {
			states[i].Marked = true
		}
	}

	path, err := WriteCertificate(states, "eb-test")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(path); err != nil {
		t.Fatal(err)
	}
	certDir, _ := CertificatesDirPath()
	if filepath.Dir(path) != certDir {
		t.Fatalf("expected cert in %s, got %s", certDir, path)
	}
}
