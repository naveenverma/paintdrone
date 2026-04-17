#!/bin/bash
# Paintdrone Quick Demo Setup Script
# Automates backend and frontend startup

set -e

PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "🎨 Paintdrone Quick Demo Setup"
echo "=========================================="
echo ""

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Python version: $python_version"

# Setup backend
echo ""
echo "📦 Setting up backend..."
cd "$BACKEND_DIR"

if [ ! -d ".venv" ]; then
    echo "  Creating virtual environment..."
    python3 -m venv .venv
fi

if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "  Activating venv (Windows)..."
    source .venv/Scripts/activate
else
    echo "  Activating venv (Linux/macOS)..."
    source .venv/bin/activate
fi

echo "  Installing dependencies..."
pip install -q -r requirements.txt

echo "✓ Backend ready!"

# Frontend check
echo ""
echo "🌐 Checking frontend..."
if [ ! -d "$FRONTEND_DIR/models" ]; then
    echo "  Creating models directory..."
    mkdir -p "$FRONTEND_DIR/models"
fi
echo "✓ Frontend ready!"

# Instructions
echo ""
echo "=========================================="
echo "🚀 Ready to start! Run in separate terminals:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd $BACKEND_DIR"
echo "  source .venv/bin/activate"
echo "  uvicorn main:app --reload"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd $FRONTEND_DIR"
echo "  python3 -m http.server 5500"
echo ""
echo "Then open: http://127.0.0.1:5500"
echo "=========================================="
