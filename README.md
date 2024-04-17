# trust-loader

Web Loader for the Wallet User Interface

## Running the loader in development mode

Create a copy of the `loader-config.local.json-template` file and rename it to `loader-config.local.json`.

Set the loader MODE configuration option to "development", set a wallet pin then reload the loader.

```javascript
// loader-config.local.json
{
    "MODE": "development",
    "DEVELOPMENT_EMAIL": "test@test.com"
    "DEVELOPMENT_USERNAME": "test.username"
    "DEVELOPMENT_PASSWORD": "testPassword123"
}
```

**After changing the MODE configuration make sure you clear your local storage before reloading the loader**

<br />
<br />

```
npm run build
```
