function FileService() {

    function getApplicationName() {
        let location = window.location;
        const paths = location.pathname.split("/");
        while (paths.length > 0) {
            if (paths[0] === "") {
                paths.shift();
            } else {
                break;
            }
        }
        return paths[0];
    }

    this.getApplicationBaseURL = function (prefix) {
        let applicationName = getApplicationName();
        let url = this.getBaseURL(prefix);
        url = `${url}${applicationName}`;
        return url;
    }

    this.getBaseURL = function (prefix) {
        let location = window.location;
        prefix = prefix || "";
        let url = `${location.protocol}//${location.host}/${prefix}`;
        return url;
    }

    this.createRequest = function (url, method, callback) {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.onload = function () {
            if (xhr.status != 200) {
                callback(`Error ${xhr.status}: ${xhr.statusText}`);
            } else {
                callback(undefined, xhr.response);
            }
        };
        xhr.onerror = function () {
            callback("Request failed");
        };
        return xhr;
    }

    this.getFile = function (url, callback) {
        url = this.getApplicationBaseURL() + "/" + url;
        this.createRequest(url, "GET", callback).send();
    };

    this.getFolderContentAsJSON = function (url, callback) {
        url = this.getApplicationBaseURL("directory-summary/") + "/" + url;
        this.createRequest(url, "GET", callback).send();
    }
}

export default FileService;
