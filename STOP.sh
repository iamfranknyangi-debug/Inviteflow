#!/bin/bash
# ============================================================
#  InviteFlow - STOP Script
# ============================================================
echo ""
echo "  Stopping InviteFlow..."
docker-compose down
echo ""
echo "  InviteFlow stopped. Your data is saved."
echo "  Run START script to launch again."
echo ""
