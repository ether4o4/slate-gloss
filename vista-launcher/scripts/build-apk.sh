#!/bin/bash

# Build script for VistaLauncher APK

set -e

echo "============================================"
echo "VistaLauncher APK Build Script"
echo "============================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to project directory
cd "$(dirname "$0")/.."

echo -e "${YELLOW}Step 1: Installing npm dependencies...${NC}"
npm install

echo -e "${YELLOW}Step 2: Cleaning previous build...${NC}"
cd android
./gradlew clean

echo -e "${YELLOW}Step 3: Building Release APK...${NC}"
./gradlew assembleRelease

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Build completed successfully!${NC}"
echo -e "${GREEN}============================================${NC}"

# Show output location
echo -e "${YELLOW}APK location:${NC}"
find app/build/outputs/apk/release -name "*.apk" -exec ls -lh {} \;

cd ..
