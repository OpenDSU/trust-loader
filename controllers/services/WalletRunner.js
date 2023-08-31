"use strict";

import NavigatorUtils from "./NavigatorUtils.js";
import EventMiddleware from "./EventMiddleware.js";
import ActionsRegistry from "./ActionsRegistry.js";

const crypto = require("opendsu").loadApi("crypto");

function getIFrameBase() {
  let iPath = window.location.pathname;
  if (LOADER_GLOBALS.environment && LOADER_GLOBALS.environment.sw) {
    return iPath.replace("index.html", "") + "iframe/";
  }
  return iPath.split("loader/")[0] + "loader/cloud-wallet/";
}


function WalletRunner(options) {
  options = options || {};

  if (!options.seed && !options.anchorId) {
    throw new Error("Missing seed or anchorId");
  }
  this.seed = options.seed;
  this.anchorId = options.anchorId;
  this.hash = crypto.sha256(this.seed);
  this.spinner = options.spinner;

  /**
   * Builds the iframe container for the SSApp
   * @return {HTMLIFrameElement}
   */
  const createContainerIframe = (useSeedForIframeSource) => {
    const iframe = document.createElement("iframe");

    iframe.setAttribute("sandbox", "allow-modals allow-scripts allow-same-origin allow-forms allow-top-navigation allow-popups allow-popups-to-escape-sandbox allow-downloads");
    iframe.setAttribute("frameborder", "0");

    iframe.style.overflow = "hidden";
    iframe.style.height = "100%";
    iframe.style.width = "100%";
    iframe.style.display = "block";
    iframe.style.zIndex = "100";
    iframe.width = "100%";
    iframe.height = "100%";

    iframe.setAttribute("identity", this.hash);

    // This request will be intercepted by swLoader.js
    // and will make the iframe load the app-loader.js script
    const iframeSuffix = useSeedForIframeSource ? this.anchorId || this.seed : this.hash;
    iframe.src = window.location.origin + getIFrameBase() + iframeSuffix;
    return iframe;
  };

  const createTimerElement = () => {
    const script = document.createElement('script');
    script.src = "./controllers/services/Timer.js";
    return script;
  }

  const setupLoadEventsListener = (iframeElement) => {
    const removeElementsFromUI = (elements) => {
      const removeSpinner = () => {
        const spinnerElement = document.querySelector('.loader-parent-container');
        if (spinnerElement) {
          spinnerElement.remove();
        }
        this.spinner.removeFromView();
      }

      let {iframe, spinner, rest} = elements || {};

      if (typeof iframe !== 'boolean') {
        iframe = false;
      }
      if (typeof spinner !== 'boolean') {
        spinner = false;
      }
      if (typeof rest !== 'boolean') {
        rest = true;
      }

      if (iframe && spinner && rest) {
        document.body.innerHTML = '';
        return;
      }

      if (iframe) {
        iframeElement.remove();
      }

      if (spinner) {
        removeSpinner();
      }

      try {
        if (rest) {
          document
            .querySelectorAll("body > *:not(iframe):not(.loader-parent-container)")
            .forEach((node) => node.remove());
        }
      } catch (error) {
        // some UI Elements could not be found
      }
    }

    const appendElementsToUI = (elements) => {
      const appendActionButtonToUI = () => {
        let node = document.createElement("div");
        node.className = "app-action-button";
        let options = document.createElement("ul");
        options.className = "hidden";
        LOADER_GLOBALS.saveCredentials();
        Object.keys(LOADER_GLOBALS.ACTION_BUTTON_OPTIONS).forEach(key => {
          let liElem = document.createElement("li");
          liElem.onclick = ActionsRegistry.getAction([(LOADER_GLOBALS.ACTION_BUTTON_OPTIONS[key].action)]);
          liElem.innerHTML = `<div>${LOADER_GLOBALS.ACTION_BUTTON_OPTIONS[key].label}</div>`;
          options.appendChild(liElem);
        })
        let actionButton = document.createElement("div");
        actionButton.className = "float";
        actionButton.id = "menu-share";
        actionButton.innerHTML = "...";
        node.appendChild(actionButton);
        node.appendChild(options);
        actionButton.addEventListener('click', (event) => {
          document.querySelector(".app-action-button div#menu-share + ul").classList.toggle('hidden');
        });
        setTimeout(function () {
          document.body.appendChild(node);
        }, 3000)
      }

      let {actionButton} = elements || {};

      if (typeof actionButton !== 'boolean') {
        actionButton = false;
      }

      if (actionButton) {
        appendActionButtonToUI();
      }
    }

    const eventMiddleware = new EventMiddleware(iframeElement, this.hash);

    eventMiddleware.registerQuery("seed", () => {
      return {seed: this.seed};
    });

    eventMiddleware.onStatus("completed", () => {
      // "app-placeholder" is injected by service worker
      // in that case 2 completed events are emitted
      if (iframeElement.hasAttribute("app-placeholder")) {
        removeElementsFromUI({iframe: true, spinner: false, rest: false});
        iframeElement.removeAttribute("app-placeholder");
        document.body.prepend(iframeElement);
        return;
      }

      removeElementsFromUI({spinner: true});
      iframeElement.hidden = false;
      appendElementsToUI({actionButton: !!LOADER_GLOBALS.SHOW_ACTION_BUTTON});
    });

    eventMiddleware.onStatus("sign-out", (data) => {
      NavigatorUtils.unregisterAllServiceWorkers(() => {
        // TODO: clear vault instead of seedCage
        if (data.deleteSeed === true) {
          localStorage.removeItem("seedCage");
        }
        window.location.reload();
      });
    });

    eventMiddleware.onStatus("error", () => {
      throw new Error("Unable to load application");
    });

    iframeElement.hidden = true;
  };

  const sendCompletedEvent = (iframeElement) => {
    const iframeDocument = iframeElement.contentDocument || iframeElement.contentWindow.document;
    if (iframeDocument.readyState !== 'complete') {
      console.log('Event "completed" can be emitted only when iframe is loaded!');
      return;
    }

    const iframeIdentity = iframeElement.getAttribute('identity');
    if (!iframeIdentity) {
      console.log('Event "completed" can not be emitted if no identity was found!');
      return;
    }

    const isWebCardinalRoot = !!iframeDocument.querySelector('webc-app-root');
    if (isWebCardinalRoot) {
      // WebCardinal sends completed event automatically, when the app is fully loaded
      return;
    }

    const CompletedEvent = new CustomEvent(iframeIdentity, {detail: {status: 'completed'}});

    const pskCardinalRoot = iframeDocument.querySelector('psk-app-root');
    if (pskCardinalRoot) {
      // Send completed event when psk-app-root is "on ready"
      pskCardinalRoot.componentOnReady().then(() => document.dispatchEvent(CompletedEvent));
    }
  }

  /**
   * Post back the seed if the service worker requests it
   */
  const setupSeedRequestListener = () => {
    NavigatorUtils.addServiceWorkerEventListener("message", (e) => {
      if (!e.data || e.data.query !== "seed") {
        return;
      }

      const swWorkerIdentity = e.data.identity;
      if (swWorkerIdentity === this.hash) {
        e.source.postMessage({
          seed: this.seed,
        });
      }
    });
  };

  /**
   * Toggle the loading spinner based on the loading progress of ssapps
   */
  const setupLoadingProgressEventListener = () => {
    document.addEventListener('ssapp:loading:progress', (e) => {
      const data = e.detail;
      const progress = data.progress;
      const statusText = data.status;

      if (progress < 100) {
        this.spinner.attachToView();
      }
      this.spinner.setStatusText(statusText);

      if (progress === 100) {
        this.spinner.removeFromView();
      }
    });
  }

  this.run = () => {
    const areServiceWorkersEnabled = typeof LOADER_GLOBALS === "undefined" || !!LOADER_GLOBALS.environment.sw;
    if (areServiceWorkersEnabled && !NavigatorUtils.areServiceWorkersSupported) {
      return alert("You current browser doesn't support running this application");
    }

    const iframeElement = createContainerIframe(!areServiceWorkersEnabled);

    setupLoadEventsListener(iframeElement);

    if (!areServiceWorkersEnabled) {
      let loadingInterval, loadingProgress = 10;

      this.spinner.setStatusText(`Loading ...`);

      /*      loadingInterval = setInterval(() => {
              loadingProgress += loadingProgress >= 90 ? 1 : 10;
              if (loadingProgress >= 100) {
                clearInterval(loadingInterval);
                return;
              }
              this.spinner.setStatusText(`Loading `);
            }, 1000);*/

      iframeElement.addEventListener('load', () => {
        //  clearInterval(loadingInterval);
        sendCompletedEvent(iframeElement);
      });

      document.body.appendChild(iframeElement);
      const timerElement = createTimerElement();
      document.body.appendChild(timerElement);
      NavigatorUtils.registerPwaServiceWorker();
      return;
    }

    setupSeedRequestListener();

    setupLoadingProgressEventListener();

    NavigatorUtils.unregisterAllServiceWorkers(() => {
      NavigatorUtils.registerSW(
        {name: "swLoader.js", path: "swLoader.js", scope: getIFrameBase()},
        (error) => {
          if (error) {
            throw error;
          }
          iframeElement.addEventListener('load', () => {
            NavigatorUtils.registerPwaServiceWorker();
            sendCompletedEvent(iframeElement);
          });
          document.body.appendChild(iframeElement);
        }
      );
    });
  };
}

export default WalletRunner;
