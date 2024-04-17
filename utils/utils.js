/**
 * Return path to file relative to the `loader` folder
 *
 * @param {string} file
 * @return {string}
 */
function getUrl(file) {
    let pathSegments = window.location.pathname.split("/");
    let loaderPath = pathSegments.pop();
    if (!loaderPath) {
        loaderPath = pathSegments.pop();
    }

    return `${loaderPath}/${file}`;
}

function hash(arr) {
    const crypto = require("opendsu").loadApi("crypto");
    let hsh = crypto.sha256(encodeURI(arr.join("/")));
    return hsh;
}

const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generateRandom(length) {
    let charactersSet = characters;
    let result = '';
    const charactersLength = charactersSet.length;
    for (let i = 0; i < length; i++) {
        result += charactersSet.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function goToLandingPage() {
    window.location.replace("./");
}

function encrypt(key, dataObj) {
    if (typeof require !== 'undefined') {
        const crypto = require("opendsu").loadAPI("crypto");
        const encryptionKey = crypto.deriveEncryptionKey(key);
        const encryptedCredentials = crypto.encrypt(JSON.stringify(dataObj), encryptionKey);
        return JSON.stringify(encryptedCredentials);
    }
}

function decrypt(key, encryptedData) {
    if (typeof require !== 'undefined') {
        const crypto = require("opendsu").loadAPI("crypto");
        const encryptionKey = crypto.deriveEncryptionKey(key);
        const decryptData = crypto.decrypt($$.Buffer.from(JSON.parse(encryptedData)), encryptionKey);
        return JSON.parse(decryptData.toString());
    }

}

function createXMLHttpRequest(url, method, body, callback) {
    if (typeof body === "function") {
        callback = body;
        body = null;
    }

    let xhr = new XMLHttpRequest();
    xhr.open(method, url);
    if (body) {
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    }

    xhr.onload = function () {
        if (xhr.status != 200) {
            callback({errorStatus: xhr.status});
        } else {
            callback(undefined, xhr.response);
        }
    };
    xhr.onerror = function () {
        callback("Request failed");
    };

    if (body) {
        xhr.send(JSON.stringify(body));
    }

    return xhr;
}


function getCookie(cookieName) {
    const name = cookieName + "=";
    let res;
    try {
        const cookiesArr = decodeURIComponent(document.cookie).split('; ');
        cookiesArr.forEach(val => {
            if (val.indexOf(name) === 0) res = val.substring(name.length);
        })
    } catch (e) {
        console.log("error on get cookie ", e);
    }
    return res
}

function getSSOId(ssoIdFieldName) {
    let ssoDetectedId = localStorage.getItem(ssoIdFieldName);
    if (!ssoDetectedId) {
        ssoDetectedId = getCookie(ssoIdFieldName);
    }
    return ssoDetectedId;
}

export {
    getUrl,
    hash,
    generateRandom,
    goToLandingPage,
    encrypt,
    decrypt,
    createXMLHttpRequest,
    getCookie,
    getSSOId
}
