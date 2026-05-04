.PHONY: build test deploy-devnet init-devnet app-dev app-build clean toolchain

# Top-level workflow:
#   make toolchain        # one-time install of solana, anchor, node deps
#   make build            # anchor build → target/{deploy,idl,types}
#   make test             # anchor test against local validator
#   make deploy-devnet    # anchor deploy --provider.cluster devnet
#   make init-devnet      # one-shot Config PDA initialization
#   make app-dev          # cd app && npm run dev

ANCHOR ?= anchor
SOLANA ?= solana
TS_NODE ?= npx ts-node

build:
	$(ANCHOR) build

test:
	$(ANCHOR) test

deploy-devnet:
	$(SOLANA) airdrop 2 || true
	$(ANCHOR) deploy --provider.cluster devnet
	$(ANCHOR) idl init -f target/idl/invoiceflow.json $$($(SOLANA) address -k target/deploy/invoiceflow-keypair.json) --provider.cluster devnet || \
		$(ANCHOR) idl upgrade -f target/idl/invoiceflow.json $$($(SOLANA) address -k target/deploy/invoiceflow-keypair.json) --provider.cluster devnet

init-devnet:
	ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
	ANCHOR_WALLET=$(HOME)/.config/solana/id.json \
	$(TS_NODE) scripts/init-protocol.ts --cluster devnet --fee-bps 50

app-dev: build
	cd app && npm install && npm run sync-idl && npm run dev

app-build: build
	cd app && npm install && npm run sync-idl && npm run build

clean:
	rm -rf target node_modules app/node_modules app/.next .anchor

toolchain:
	@echo "Install Solana CLI:"
	@echo "  sh -c \"\$$(curl -sSfL https://release.anza.xyz/stable/install)\""
	@echo "Install Anchor (avm):"
	@echo "  cargo install --git https://github.com/coral-xyz/anchor avm --tag v0.31.1 --locked"
	@echo "  avm install 0.31.1 && avm use 0.31.1"
	@echo "Install Node 20+ (nvm):"
	@echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash"
	@echo "  nvm install --lts && nvm use --lts"
