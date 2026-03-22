#!/bin/bash
# ============================================================
#  InviteFlow - Start Script for Mac / Linux
#  Double-click this file OR run: bash START-MAC-LINUX.sh
# ============================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

clear
echo ""
echo -e "${BLUE}  =============================================="
echo -e "    InviteFlow - Digital Invitation System"
echo -e "  ==============================================${NC}"
echo ""

# Check Docker installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}  ERROR: Docker is not installed!${NC}"
    echo ""
    echo "  Please install Docker Desktop from:"
    echo "  https://www.docker.com/products/docker-desktop/"
    echo ""
    echo "  On Mac: download the .dmg and drag to Applications"
    echo "  On Linux: sudo apt install docker.io docker-compose"
    echo ""
    exit 1
fi

# Check Docker is running
if ! docker ps &> /dev/null; then
    echo -e "${YELLOW}  Docker is installed but not running.${NC}"
    echo ""
    echo "  Please open Docker Desktop and wait for the"
    echo "  whale icon to appear in your menu bar."
    echo "  Then run this script again."
    echo ""
    exit 1
fi

echo -e "${GREEN}  [1/3] Docker is ready!${NC}"
echo ""
echo -e "${GREEN}  [2/3] Starting InviteFlow...${NC}"
echo "        (First launch takes 3-5 minutes to build)"
echo ""

# Build and start
docker-compose up --build -d

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}  Something went wrong! See error above.${NC}"
    echo "  Try: docker-compose logs"
    exit 1
fi

echo ""
echo -e "${GREEN}  [3/3] Waiting for system to be ready...${NC}"
sleep 15

# Wait for frontend to be available
echo "        Checking if app is up..."
MAX_WAIT=60
COUNT=0
while ! curl -s http://localhost:3000 > /dev/null 2>&1; do
    sleep 3
    COUNT=$((COUNT+3))
    if [ $COUNT -ge $MAX_WAIT ]; then
        echo "        App is taking longer than expected..."
        break
    fi
    echo "        Still starting... ($COUNT s)"
done

echo ""
echo -e "${BLUE}  =============================================="
echo ""
echo -e "    ${GREEN}InviteFlow is RUNNING!${NC}"
echo ""
echo "    Open your browser and go to:"
echo -e "    ${YELLOW}http://localhost:3000${NC}"
echo ""
echo "    Login with:"
echo "    Username:  admin"
echo "    Password:  admin123"
echo ""
echo -e "${BLUE}  ==============================================${NC}"
echo ""

# Open browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://localhost:3000"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open "http://localhost:3000" 2>/dev/null || true
fi

echo "  Press Ctrl+C to stop viewing logs"
echo "  (System keeps running even if you close this)"
echo ""

docker-compose logs --tail=30 -f
