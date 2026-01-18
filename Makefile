# ==============================================================================
# Root Makefile - ft_transcendence
# ==============================================================================

# Include the infrastructure Makefile
include infrastructure/Makefile.dev.mk

# Expose infrastructure targets explicitly (optional, but good for autocomplete in some shells)
.PHONY: dev prod setup

# Alias for up
dev: up

# Install dependencies locally (helper)
install:
	@echo "Installing dependencies locally..."
	@pnpm install
	@echo "Dependencies installed."

# Helper to update submodules
update-submodules:
	@echo "Updating git submodules..."
	@git submodule update --remote
	@echo "Submodules updated."
