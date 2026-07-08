package guide

import (
	"strings"
	"testing"
)

func TestImageWebURL(t *testing.T) {
	got := ImageWebURL("images/image-1.png")
	want := defaultImagesBaseURL + "images/image-1.png"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}

	absolute := "https://example.com/a.png"
	if ImageWebURL(absolute) != absolute {
		t.Fatal("expected absolute URL unchanged")
	}
}

func TestRewriteImageLinks(t *testing.T) {
	md := "![alt](images/image.png)\n\n![x](https://keep.me/x.png)"
	out := rewriteImageLinks(md)
	if !containsAll(out, defaultImagesBaseURL+"images/image.png") {
		t.Fatalf("missing rewritten url: %q", out)
	}
	if !containsAll(out, "https://keep.me/x.png") {
		t.Fatal("absolute url should be preserved")
	}
}

func TestImageURLs(t *testing.T) {
	_, _, err := Load()
	if err != nil {
		t.Skip("lab-guide.md not available:", err)
	}
	urls := ImageURLs("m1-embeddings")
	if len(urls) == 0 {
		t.Fatal("expected image URLs for m1-embeddings")
	}
	if !strings.HasPrefix(urls[0], "https://github.com/elastic/meetups") {
		t.Fatalf("unexpected url: %s", urls[0])
	}
}
