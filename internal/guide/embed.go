package guide

import _ "embed"

// Embedded lab guide — used when lab-guide.md is not on disk (e.g. downloaded release binary).
//
//go:embed assets/lab-guide.md
var embeddedLabGuide string
