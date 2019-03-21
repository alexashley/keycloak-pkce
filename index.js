const assert = require('assert');
const crypto = require('crypto');
const qs = require('querystring');
const URL = require('url');

const cheerio = require('cheerio');
const fetch = require('node-fetch');

const clientId = "pkce-test";
const redirectUri = 'http://localhost:1111/fake';
const keycloakUrl = "http://localhost:8080/auth/realms/test";

const urlBase64 = (content) => {
    content = content.toString('base64');
    const urlSafeReplacements = [
        [/\+/g, '-'],
        [/\//g, '_'],
        [/=/g, '']
    ];

    urlSafeReplacements.forEach(([test, replacement]) => {
        content = content.replace(test, replacement);
    });

    return content;
};

const createCodeVerifier = () => urlBase64(crypto.randomBytes(32));

const createCodeChallenge = (verifier) => {
    const hash = crypto.createHash('sha256').update(verifier).digest();

    return urlBase64(hash);
};

const getAuthorizationCode = async (challenge) => {
    const params = qs.stringify({
        response_type: 'code',
        scope: 'openid profile email',
        client_id: clientId,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        redirect_uri: redirectUri
    });

    const loginPageResponse = await fetch(`${keycloakUrl}/protocol/openid-connect/auth?${params}`);

    assert.strictEqual(loginPageResponse.status, 200, "Failed to retrieve login page");

    const document = cheerio.load(await loginPageResponse.text());
    const formAction = document('form').attr('action');

    assert(formAction, "Failed to get form submission uri.");

    const body = qs.stringify({
        username: 'test@fake.org',
        password: 'password'
    });
    const login = await fetch(formAction, {
        body,
        headers: {
            'Cookie': loginPageResponse.headers.get('Set-Cookie'),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        method: 'POST',
        redirect: 'manual'
    });

    assert.strictEqual(login.status, 302, `Error submitting login form: ${await login.clone().text()}`);

    const redirect = login.headers.get('location');
    const authorizationCode = new URL.URLSearchParams(redirect).get('code');

    assert(authorizationCode, "Authorization code not present in redirect uri");

    return authorizationCode;
};

const exchangeCodeForTokens = (code, verifier, removeVerifier = false) => {
    const body = {
        grant_type: 'authorization_code',
        client_id: clientId,
        code_verifier: verifier,
        code,
        redirect_uri: redirectUri
    };

    if (removeVerifier) {
        delete body.code_verifier;
    }

    return fetch(`${keycloakUrl}/protocol/openid-connect/token`, {
        body: qs.stringify(body),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        method: 'POST',
        redirect: 'manual'
    });
};

const assertAuthorizationCodeFlowWithPkce = async () => {
    const verifier = createCodeVerifier();
    const challenge = createCodeChallenge(verifier);

    const authorizationCode = await getAuthorizationCode(challenge);

    const response = await exchangeCodeForTokens(authorizationCode, verifier);

    assert.strictEqual(response.status, 200, "Failed to exchange code for tokens");
};

const assertExchangeWithIncorrectVerifier = async () => {
    const verifier = createCodeVerifier();
    const challenge = createCodeChallenge(verifier);
    const authorizationCode = await getAuthorizationCode(challenge);

    const response = await exchangeCodeForTokens(authorizationCode, "foobar");

    assert.strictEqual(response.status, 400, "Should have failed exchange -- code verifier was invalid");

    const {error_description} = await response.json();

    assert.strictEqual(error_description, "PKCE invalid code verifier");
};

const assertExchangeWithNoVerifier = async () => {
    const verifier = createCodeVerifier();
    const challenge = createCodeChallenge(verifier);
    const authorizationCode = await getAuthorizationCode(challenge);

    const response = await exchangeCodeForTokens(authorizationCode, null, true);

    assert.strictEqual(response.status, 400, "Should have failed exchange -- code verifier was not present");

    const {error_description} = await response.json();

    assert.strictEqual(error_description, "PKCE code verifier not specified");
};

(async () => {
    try {
        await assertAuthorizationCodeFlowWithPkce();

        console.log('Finished authorization code flow with PKCE');

        await assertExchangeWithIncorrectVerifier();

        console.log('Verified that tokens cannot be exchanged when code verifier is invalid');

        await assertExchangeWithNoVerifier();

        console.log('Verified that tokens cannot be exchange when code verifier is not present');

    } catch (error) {
        console.log(error.message);
        process.exit(1);
    }
})();