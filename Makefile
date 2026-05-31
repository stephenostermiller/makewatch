build/.test: build/.install $(wildcard src/*.js) $(wildcard test/*.js)
	mkdir -p build
	npm test
	@touch build/.test

build/.install:
	mkdir -p build
	npm install
	@touch build/.install

.PHONY: install
install: build/.install

.PHONY: watch
watch:
	node bin/makewatch.js --tee build/test-results.txt build/.test

.PHONY: test
test: build/.test

.PHONY: clean
clean:
	rm -rf build/
	@echo "✓ Cleaned"

.PHONY: patch
patch:
	./scripts/bump-version.sh patch

.PHONY: minor
minor:
	./scripts/bump-version.sh minor

.PHONY: major
major:
	./scripts/bump-version.sh major
