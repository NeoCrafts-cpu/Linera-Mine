#!/bin/bash
# Simple health check for Render

curl -sf http://localhost:${LINERA_PORT:-8081}/ > /dev/null || exit 1
echo "OK"
