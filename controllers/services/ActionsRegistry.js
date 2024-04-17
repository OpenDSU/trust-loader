function logout() {
    localStorage.removeItem(LOADER_GLOBALS.LOCALSTORAGE_CREDENTIALS_KEY);
    const basePath = window.location.href.split("loader")[0];
    window.location.replace(basePath + "loader");
}

function changePassword() {
    console.log('opt2 click', window.location.href);
    const basePath = window.location.href.split("loader")[0];
    window.location.replace(basePath + "loader/changePassword.html");
}

function changePin() {
    console.log('opt3 click', window.location.href);
    const basePath = window.location.href.split("loader")[0];
    window.location.replace(basePath + "loader/changePin.html");
}

const registry = {
    logout,
    changePassword,
    changePin
};

export default {
    getAction: function (actionName) {
        return registry[actionName];
    },
    registerAction: function (actionName, fnc) {
        registry[actionName] = fnc;
    }
}
