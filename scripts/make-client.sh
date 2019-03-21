#!/usr/bin/env bash

set -eu

KEYCLOAK=http://localhost:8080
ADMIN_USER=keycloak
ADMIN_PASS=password
CLIENT_ID=pkce-test
REALM=test

accessToken=$(curl "${KEYCLOAK}/auth/realms/master/protocol/openid-connect/token" \
                -H "Content-Type: application/x-www-form-urlencoded" \
                -s \
                --fail \
                -d "client_id=admin-cli" \
                -d "grant_type=password" \
                -d "username=${ADMIN_USER}" \
                -d "password=${ADMIN_PASS}" | jq -r '.access_token')

curl "${KEYCLOAK}/auth/admin/realms" \
                -H "Content-Type: application/json" \
                -H "Authorization: bearer ${accessToken}" \
                -v \
                --fail \
                -d '{"enabled": true, "realm": "'${REALM}'", "displayName": "'${REALM}'"}'

curl "${KEYCLOAK}/auth/admin/realms/${REALM}/clients" \
                -H "Content-Type: application/json" \
                -H "Authorization: bearer ${accessToken}" \
                -v \
                --fail \
                -d '{"enabled": true, "clientId": "'${CLIENT_ID}'", "publicClient": true, "standardFlowEnabled": true, "redirectUris": ["http://localhost:1111/fake"]}'

curl "${KEYCLOAK}/auth/admin/realms/${REALM}/users" \
                -H "Content-Type: application/json" \
                -H "Authorization: bearer ${accessToken}" \
                -v \
                --fail \
                -d '{"enabled": true, "username": "test@fake.org", "credentials": [{"value": "password", "temporary": false, "type": "password"}]}'
