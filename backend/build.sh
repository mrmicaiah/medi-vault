#!/usr/bin/env bash
# build.sh - Render build script

set -e

# Install system dependencies for WeasyPrint
apt-get update
apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info \
    libcairo2 \
    fonts-liberation

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt
