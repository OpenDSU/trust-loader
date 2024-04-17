import NavigatorUtils from "../../controllers/services/NavigatorUtils.js";

const paths = window.location.pathname.split("/iframe/");
const myIdentity = paths[1];
const swName = "swBoot.js";
let loadingInterval;

function startLoadingProgressInterval(initialLoadingProgress) {
    sendLoadingProgress(initialLoadingProgress, `Loading`);
    let loadingProgress = initialLoadingProgress;
    loadingInterval = setInterval(() => {
        let increment = 10;
        if (loadingProgress >= 90) {
            increment = 1;
        }

        loadingProgress += increment;

        if (loadingProgress >= 100) {
            clearInterval(loadingInterval);
            return;
        }
        sendLoadingProgress(loadingProgress, `Loading`);
    }, 1000);
}

window.frameElement.setAttribute("app-placeholder", "true");
startLoadingProgressInterval(10);

if (NavigatorUtils.canUseServiceWorkers()) {
    window.document.addEventListener(myIdentity, (e) => {
        const data = e.detail || {};

        if (data.seed) {
            const seed = data.seed;
            const swConfig = {
                name: swName,
                path: `../${swName}`,
                scope: myIdentity
            };

            NavigatorUtils.loadSSAppOrWallet(seed, swConfig, (err) => {
                if (err) {
                    clearInterval(loadingInterval);
                    sendLoadingProgress(100, 'Error loading wallet');
                    console.error(err);
                    return sendMessage({
                        status: 'error'
                    });
                }
                sendMessage({
                    status: 'completed'
                });
            })

        }
    });

    sendMessage({
        query: 'seed'
    });
} else {
    console.log(`Skipping registering ${swName} due to service workers being disabled`);
}

function sendMessage(message) {
    const event = new CustomEvent(myIdentity, {
        detail: message
    });
    window.parent.document.dispatchEvent(event);
}

function sendLoadingProgress(progress, status) {
    if (LOADER_GLOBALS.environment.showLoadingProgress === false) {
        return;
    }

    let currentWindow = window;
    let parentWindow = currentWindow.parent;

    while (currentWindow !== parentWindow) {
        currentWindow = parentWindow;

        //same-origin policy applies here
        try {
            if (currentWindow.parent.document) {
                parentWindow = currentWindow.parent;
            }
        } catch (e) {
        }
    }

    parentWindow.document.dispatchEvent(new CustomEvent('ssapp:loading:progress', {
        detail: {
            progress,
            status
        }
    }));
}
