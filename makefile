MAKEFLAGS += --silent

.PHONY: keycloak client pkce deps

default:
	echo "No default"

deps:
	yarn install -s

keycloak:
	docker run -d -p 8080:8080 -e KEYCLOAK_USER=keycloak -e KEYCLOAK_PASSWORD=password jboss/keycloak:4.8.3.Final

client:
	./scripts/make-client.sh

pkce: deps
	node index.js