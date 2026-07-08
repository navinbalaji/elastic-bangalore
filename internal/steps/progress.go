package steps

import "time"

// WorkshopComplete returns true when every verifiable step passed and every
// guide step was acknowledged (Space).
func WorkshopComplete(states []StepState) bool {
	for _, st := range states {
		switch st.Step.Kind {
		case KindVerifiable:
			if st.Status != StatusPass {
				return false
			}
		case KindGuide:
			if !st.Marked {
				return false
			}
		}
	}
	return len(states) > 0
}

func VerifiableComplete(states []StepState) bool {
	for _, st := range states {
		if st.Step.Kind == KindVerifiable && st.Status != StatusPass {
			return false
		}
	}
	return true
}

func ProgressCounts(states []StepState) (passed, total int) {
	for _, st := range states {
		total++
		if st.Step.Kind == KindVerifiable {
			if st.Status == StatusPass {
				passed++
			}
		} else if st.Marked {
			passed++
		}
	}
	return passed, total
}

func StepCompleted(st StepState) bool {
	if st.Step.Kind == KindVerifiable {
		return st.Status == StatusPass
	}
	return st.Marked
}

func StepStatusLabel(st StepState) string {
	switch {
	case st.Step.Kind == KindVerifiable && st.Status == StatusPass:
		return "verified"
	case st.Step.Kind == KindVerifiable && st.Status == StatusFail:
		return "failed"
	case st.Step.Kind == KindGuide && st.Marked:
		return "acknowledged"
	case st.Step.Kind == KindGuide:
		return "pending"
	default:
		return "pending"
	}
}

// Exported for session timestamps
func NowRFC3339() string {
	return time.Now().UTC().Format(time.RFC3339)
}
