.PHONY: build clean run test install prepare-embed

BINARY := elastic-bangalore

# macOS 15+ (Sequoia/Tahoe) requires LC_UUID in Mach-O binaries.
# Go 1.21's internal linker omits it; external linking fixes dyld abort.
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
  BUILD_LDFLAGS := -ldflags="-linkmode=external"
else
  BUILD_LDFLAGS :=
endif

internal/guide/assets/lab-guide.md: lab-guide.md
	cp lab-guide.md internal/guide/assets/lab-guide.md

prepare-embed: internal/guide/assets/lab-guide.md

build: internal/guide/assets/lab-guide.md
	go build $(BUILD_LDFLAGS) -o $(BINARY) ./cmd/elastic-bangalore/

clean:
	rm -f $(BINARY)

run: build
	./$(BINARY)

test:
	go test ./...

install:
	go build $(BUILD_LDFLAGS) -o $(BINARY) ./cmd/elastic-bangalore/
	go install $(BUILD_LDFLAGS) ./cmd/elastic-bangalore/
