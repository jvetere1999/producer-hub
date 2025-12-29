#!/bin/bash
# Deploy to GitHub Pages script

echo "🚀 Building for GitHub Pages..."

# Set base path for GitHub Pages (replace 'daw-shortcuts' with your repo name)
REPO_NAME="daw-shortcuts"
export BASE_PATH="/$REPO_NAME"

# Build the project
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📁 Built files are in ./build directory"
    echo ""
    echo "Next steps:"
    echo "1. Commit and push your changes to the main branch"
    echo "2. Go to your GitHub repository settings"
    echo "3. Navigate to Pages section"
    echo "4. Set Source to 'GitHub Actions'"
    echo "5. The deployment workflow will run automatically"
    echo ""
    echo "Your site will be available at: https://[username].github.io/$REPO_NAME"
else
    echo "❌ Build failed!"
    exit 1
fi
