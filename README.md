# keycloak-pkce

This is a small test suite to verify that Keycloak supports PKCE. 
There's a very brief note about it in the [documentation](https://www.keycloak.org/docs/latest/server_admin/index.html#_oidc-auth-flows):

> Keycloak also supports the optional Proof Key for Code Exchange specification.

but no other mention. 

To run the tests, do the following:

- `make keycloak`: stands up an instance of Keycloak 4.8.3.Final on 8080
- `make client`: to create the `test` realm, `test-pkce` client and a user
- `make pkce`: to run the actual tests.

Assuming everything goes correctly, you should see the following printed:

```
Finished authorization code flow with PKCE
Verified that tokens cannot be exchanged when code verifier is invalid
Verified that tokens cannot be exchange when code verifier is not present
```