#!/bin/bash

# ==============================================================================
# Setup Script for VPS - ft_transcendence
# ==============================================================================

# Exit on error
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Setup VPS for ft_transcendence ===${NC}"

# 1. Update system
echo -e "${GREEN}[1/6] Updating system...${NC}"
sudo apt-get update
# sudo apt-get upgrade -y

# 2. Install dependencies
echo -e "${GREEN}[2/6] Installing dependencies...${NC}"
sudo apt-get install -y git make curl nginx build-essential

# 2.5 Install Node.js
echo -e "${GREEN}[2.5/6] Installing Node.js...${NC}"
if ! command -v node &> /dev/null || [[ $(node -v) != v24* ]]; then
    echo "Installing Node.js 24..."
    curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo -e "${GREEN}Node.js 24 already installed.${NC}"
fi

# 3. Install Docker
if ! command -v docker &> /dev/null; then
    echo -e "${GREEN}[3/6] Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "Docker installed."
else
    echo -e "${GREEN}[3/6] Docker already installed.${NC}"
fi

# 4. Install pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${GREEN}[4/6] Installing pnpm...${NC}"
    curl -fsSL https://get.pnpm.io/install.sh | sh -
    if [ -f "$HOME/.bashrc" ]; then source "$HOME/.bashrc"; fi
else
    echo -e "${GREEN}[4/6] pnpm already installed.${NC}"
fi

# 5. Setup Project
echo -e "${GREEN}[5/6] Setting up project...${NC}"
git submodule update --init --recursive --remote

if command -v pnpm &> /dev/null; then
    echo "Installing project dependencies..."
    pnpm install
else
    if [ -f "$HOME/.local/share/pnpm/pnpm" ]; then
        "$HOME/.local/share/pnpm/pnpm" install
    else
        echo "WARNING: pnpm not found in path."
    fi
fi

# 6. Configure Nginx
echo -e "${GREEN}[6/6] Configuring Nginx...${NC}"
if [ -f "infrastructure/vps-nginx.conf" ]; then
    echo "Copying nginx configuration..."
    sudo cp infrastructure/vps-nginx.conf /etc/nginx/sites-available/ft_transcendence
    sudo ln -sf /etc/nginx/sites-available/ft_transcendence /etc/nginx/sites-enabled/
    
    if [ -f "/etc/nginx/sites-enabled/default" ]; then
        sudo rm /etc/nginx/sites-enabled/default
    fi
    
    sudo nginx -t
    sudo systemctl restart nginx
    echo "Nginx configured."
else
    echo "infrastructure/vps-nginx.conf not found. Skipping Nginx config."
fi

echo -e "${BLUE}=== Setup Complete ===${NC}"
echo "To start the application:"
echo "  make up"
