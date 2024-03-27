const CHECK_IF_SESSION_HAS_EXPIRED_URL = `${window.location.origin}/checkIfSessionHasExpired`;
const LOGOUT_WAS_TRIGGERED_URL = `${window.location.origin}/logoutWasTriggered`;

window.sessionHandler = setInterval(async () => {
    let response = await fetch(CHECK_IF_SESSION_HAS_EXPIRED_URL);
    const sessionHasExpired = await response.text();
    response = await fetch(LOGOUT_WAS_TRIGGERED_URL);
    const logout = await response.text();

    document.body.style.setProperty("visibility","visible");
    if (sessionHasExpired === "true") {
        clearInterval(window.sessionHandler);
        window.disableRefreshSafetyAlert = true;
        sessionStorage.setItem("initialURL", window.location.href);
        window.location = "/logout"
        return
    }

    if(logout === "true"){
        document.body.style.setProperty("visibility","hidden");
        alert("A Single Sign-On (SSO) login process is detected to be in progress across multiple browser instances. If this assessment is incorrect, kindly terminate all browser instances and recommence the login procedure.");
    }
}, 10000);
