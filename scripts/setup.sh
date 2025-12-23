#!/bin/bash

# Quick Start Script for CareerCompass-UG
# This script helps you set up the project quickly

set -e

echo "🚀 CareerCompass-UG Quick Start"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm $(npm -v) detected"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo ""
    echo "⚠️  No .env.local file found"
    echo "📝 Creating from .env.example..."
    cp .env.example .env.local
    echo ""
    echo "⚠️  IMPORTANT: Edit .env.local and add your Supabase credentials:"
    echo "   - VITE_SUPABASE_URL"
    echo "   - VITE_SUPABASE_PUBLISHABLE_KEY"
    echo ""
    read -p "Press Enter when you've updated .env.local..."
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo ""
    echo "⚠️  Supabase CLI not found"
    echo "📝 To deploy Edge Functions, install it:"
    echo "   npm install -g supabase"
else
    echo "✅ Supabase CLI $(supabase --version) detected"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start development server: npm run dev"
echo "2. Open http://localhost:8080"
echo "3. For database setup: See DEPLOYMENT.md"
echo "4. For production deploy: See PRODUCTION_READY.md"
echo ""
echo "Happy coding! 🎉"
