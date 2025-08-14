#!/bin/bash

# Script to check all webhook secrets from Webflow API
# REPLACE THESE VALUES WITH YOUR ACTUAL DATA:

WEBFLOW_API_TOKEN="PASTE_YOUR_API_TOKEN_HERE"
SITE_ID="PASTE_YOUR_SITE_ID_HERE"

echo "🔍 Fetching all webhooks for site: $SITE_ID"
echo "================================================"

curl -X GET "https://api.webflow.com/v2/sites/${SITE_ID}/webhooks" \
  -H "Authorization: Bearer ${WEBFLOW_API_TOKEN}" \
  -H "Accept: application/json" | jq '.'

echo ""
echo "📋 INSTRUKCJE:"
echo "1. Sprawdź czy wszystkie 4 webhooks mają ten sam 'secretKey'"
echo "2. Jeśli tak - użyj JEDNEGO secretKey jako WEBFLOW_WEBHOOK_SECRET"
echo "3. Jeśli różne - będziemy musieli zmodyfikować kod na multiple secrets"
