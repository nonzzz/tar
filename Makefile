install:
	@echo "Using berry to install dependencies..."
	corepack enable
	pnpm install

test:
	@echo "Running tests..."
	@pnpm run test

lint:
	@echo "Linting code..."
	@pnpm run lint

format:
	@echo "Formatting code..."
	pnpm exec dprint fmt
