package guide

import (
	"os"
	"path/filepath"
	"strings"
)

// Default workshop screenshots on elastic/meetups (viewable in browser).
const defaultImagesBaseURL = "https://github.com/elastic/meetups/blob/main/Mumbai/27-06-2026_Jina-Elastic-Genai-A2A-Workshop/"

// ImagesBaseURL returns the prefix for resolving images/foo.png links.
func ImagesBaseURL() string {
	if u := strings.TrimSpace(os.Getenv("LAB_GUIDE_IMAGES_BASE_URL")); u != "" {
		return strings.TrimSuffix(u, "/") + "/"
	}
	return defaultImagesBaseURL
}

// ImageWebURL resolves a lab-guide image reference to a browser-openable URL.
func ImageWebURL(ref string) string {
	ref = strings.TrimSpace(ref)
	if strings.HasPrefix(ref, "http://") || strings.HasPrefix(ref, "https://") {
		return ref
	}
	ref = strings.TrimPrefix(ref, "./")
	ref = filepath.ToSlash(ref)
	if strings.HasPrefix(ref, "images/") {
		return ImagesBaseURL() + ref
	}
	return ImagesBaseURL() + "images/" + filepath.Base(ref)
}

func rewriteImageLinks(md string) string {
	return imageRE.ReplaceAllStringFunc(md, func(match string) string {
		sub := imageRE.FindStringSubmatch(match)
		if len(sub) != 3 {
			return match
		}
		return "![" + sub[1] + "](" + ImageWebURL(sub[2]) + ")"
	})
}

// ImageURLs returns browser-openable image URLs for a workshop step.
func ImageURLs(stepID string) []string {
	md, ok := cachedSectionMarkdown(stepID)
	if !ok {
		return nil
	}
	md = rewriteImageLinks(md)
	matches := imageRE.FindAllStringSubmatch(md, -1)
	urls := make([]string, 0, len(matches))
	for _, m := range matches {
		if len(m) >= 3 {
			urls = append(urls, strings.TrimSpace(m[2]))
		}
	}
	return urls
}
