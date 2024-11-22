FLAGS += -f tar-mini

install:
	@echo "Using berry to install dependencies..."
	corepack enable
	pnpm install

test:
	@echo "Running tests..."
	@pnpm exec vitest

lint:
	@echo "Linting code..."
	@pnpm run lint

format:
	@echo "Formatting code..."
	pnpm exec dprint fmt

build:
	@echo "Building project..."
	-rm -rf dist
	./node_modules/.bin/jiek $(FLAGS) build -om

publish: build
	@echo "Publishing project..."
	./node_modules/.bin/jiek $(FLAGS) pub -no-b