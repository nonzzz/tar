ROLLUP_CMD = pnpm exec rollup --config rollup.config.mts --configPlugin swc3

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
	$(ROLLUP_CMD)

dev:
	@echo "Building project..."
	$(ROLLUP_CMD) --watch