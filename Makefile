JK = ./node_modules/.bin/jiek

install:
	@echo "Using berry to install dependencies..."
	corepack enable
	pnpm install

test:
	@echo "Running tests..."
	@pnpm exec vitest

lint:
	@echo "Linting code..."
	@pnpm exec eslint --fix .

format:
	@echo "Formatting code..."
	pnpm exec dprint fmt

build:
	@echo "Building project..."
	-rm -rf dist
	$(JK) build -f tar-mini --noMin

publish: build
	@echo "Publishing project..."
	$(JK) prepublish && $(JK) publish -no-b && $(JK) postpublish