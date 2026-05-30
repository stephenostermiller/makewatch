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

.PHONY: test-watch
test-watch:
	node bin/makewatch.js test

.PHONY: run
run:
	node bin/makewatch.js

.PHONY: test
test: build/.test

.PHONY: clean
clean:
	rm -rf build/
	@echo "✓ Cleaned"
