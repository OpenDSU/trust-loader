import "./../loader-config.js";
import {Spinner, createFormElement, prepareViewContent} from "./services/UIService.js";
import WalletService from "./services/WalletService.js";
import FileService from "./services/FileService.js";
import WalletRunner from "./services/WalletRunner.js";
import getVaultDomain from "../utils/getVaultDomain.js";
import {generateRandom, createXMLHttpRequest, getCookie, decrypt} from "../utils/utils.js";

const fileService = new FileService();

function MainController() {

  let USER_DETAILS_FILE = "user-details.json";
  const DEVELOPMENT_EMAIL = "dev@autoslogin.dev";
  const DEVELOPMENT_USERNAME = "autologin";

  const walletService = new WalletService();
  this.spinner = null;

  this.formFields = [];
  const self = this;


  function getSecretLocalToken(development, mobile, storageKey) {
    if (mobile) {
      return "SuperUserSecurePassword1!";
    }
    if (typeof storageKey === "undefined") {
      storageKey = "secretToken";
    }

    if (development) {
      return generateRandom(32); //new key each time
    }
    let secret = localStorage.getItem(storageKey);
    if (!secret) {
      secret = generateRandom(32);
      localStorage.setItem(storageKey, secret);
    }
    return secret;
  }

  function getWalletSecretArrayKey() {
    let arr = Object.values(LOADER_GLOBALS.credentials).filter(elem => typeof elem !== "boolean");
    arr.push(LOADER_GLOBALS.environment.appName);
    return arr;
  }

  /**
   * Run the loader using credentials provided from external source
   * These credentials should be stored in the localStorage before
   */
  const runExternalAutologin = () => {
    this.spinner.attachToView();
    LOADER_GLOBALS.loadCredentials();
    const secretArrayKey = getWalletSecretArrayKey();
    const isArrayEmpty = secretArrayKey.filter(el => el && el.trim().length !== 0).length === 0;

    if (isArrayEmpty) {
      return console.warn("Array of secrets is not loaded yet...", secretArrayKey);
    }

    walletService.create(getVaultDomain(), secretArrayKey, (err, wallet) => {
      if (err) {
        throw createOpenDSUErrorWrapper(`Failed to create wallet in domain ${getVaultDomain()}`, err);
      }
      console.log("A new wallet got initialised...", wallet.getCreationSSI(true));
      return self.openWallet();
    });
  }

  /**
   * Run the loader in development mode
   *
   * Create a default wallet with a default password if none exists
   * and load it
   */
  function runInDevelopment() {
    runInAutologin(true);
  }

  /**
   * Run the loader in autologing mode
   *
   * Create a default wallet with a default password if none exists
   * and load it
   */
  const runInAutologin = (development, mobile) => {
    self.spinner.attachToView();
    if (!LOADER_GLOBALS.credentials.isValid) {
      try {
        let credentials = {};

        //config provided-credentials
        //written to keep backwards-compatibility
        //TODO why we use different email/username constants?
        if (typeof LOADER_GLOBALS.DEFAULT_CREDENTIALS !== "object") {
          if (!development) {
            credentials.email = "wallet@invisible";
            credentials.password = getSecretLocalToken(development, mobile);
            credentials.username = "private";
            credentials.company = "OpenDSU Development INC.";
          } else {
            credentials.email = DEVELOPMENT_EMAIL;
            credentials.password = getSecretLocalToken(development, mobile);
            credentials.username = DEVELOPMENT_USERNAME;
            credentials.company = "OpenDSU Development INC.";
          }
          LOADER_GLOBALS.credentials = credentials;
        } else {
          let defaultCredentials = JSON.parse(JSON.stringify(LOADER_GLOBALS.DEFAULT_CREDENTIALS));
          defaultCredentials.password = getSecretLocalToken(development, mobile, defaultCredentials.password);
          LOADER_GLOBALS.credentials = defaultCredentials;
        }

        LOADER_GLOBALS.credentials.isValid = true;

        if (!development) {
          LOADER_GLOBALS.saveCredentials();
        }
      } catch (err) {
        document.getElementById("register-details-error").innerText = err.message || "Something wrong with credentials";
      }

    }

    walletService.create(getVaultDomain(), getWalletSecretArrayKey(), (err, wallet) => {

      if (err) {
        throw createOpenDSUErrorWrapper(`Failed to create wallet in domain ${getVaultDomain()}`, err);
      }
      wallet.safeBeginBatch(err => {
        if (err) {
          return callback(err);
        }
          wallet.writeFile(USER_DETAILS_FILE, JSON.stringify(LOADER_GLOBALS.credentials), (err) => {
              if (err) {
                  throw createOpenDSUErrorWrapper("Failed to write user details in wallet", err);
              }


              wallet.commitBatch(err => {
                  if (err) {
                      return callback(err);
                  }
                  console.log("A new wallet got initialised...", wallet.getCreationSSI(true));
                  return self.openWallet();
              })
          });
      });
    });
  }

  const runInMobileAutologin = () => {
    return runInAutologin(false, true);
  }

  this.initSpinner = function () {
    this.spinner = new Spinner(document.getElementsByTagName("body")[0]);
  }

  this.init = function () {
    this.initSpinner()

    if (LOADER_GLOBALS.environment.mode === "external-autologin") {
      return runExternalAutologin();
    }

    if (LOADER_GLOBALS.environment.mode === "dev-autologin") {
      return runInDevelopment();
    }

    if (LOADER_GLOBALS.environment.mode === "mobile-autologin") {
      return runInMobileAutologin();
    }

    if (LOADER_GLOBALS.environment.mode === "autologin") {
      return runInAutologin();
    }

    if (!(LOADER_GLOBALS.environment.mode === "secure" || LOADER_GLOBALS.environment.mode === "dev-secure")) {
      return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Unknown mode in environment.js"));
    }

    if (LOADER_GLOBALS.environment.mode === "dev-secure" && !LOADER_GLOBALS.credentials.username) {
      LOADER_GLOBALS.credentials.username = "devuser"
      LOADER_GLOBALS.credentials.email = "dev@user.dev";
      LOADER_GLOBALS.credentials.company = LOADER_GLOBALS.environment.companyName || "Company Inc";
      LOADER_GLOBALS.credentials.password = "SuperUserSecurePassword1!";
    }

    let windowUrl = new URL(window.location.href);
    if (windowUrl.searchParams.get("login") !== null) {
      return this.displayContainer(LOADER_GLOBALS.PASSWORD_CONTAINER_ID);
    }
    this.displayContainer(LOADER_GLOBALS.NEW_OR_RESTORE_CONTAINER_ID);
  };

  this.goToLandingPage = function () {
    window.location.replace("./");
  };

  this.displayContainer = function (containerId) {
    document.getElementById(containerId).style.display = "block";
  };

  this.formIsValid = function () {
    return validator.validateForm(self.formFields);
  }

  this.pinCheckboxHandler = function (event) {
    LOADER_GLOBALS.loadPinCodeCredentials(LOADER_GLOBALS.getLastPinCode());
    document.getElementById("pin-container").classList.add("d-none");

    this.createForm();
    this.populateForm();
    this.loginWithPin = false;
    document.getElementById("register-details-error").innerText = "";
  }

  this.createForm = function () {
    let formElement = document.getElementsByClassName("credentials-panel-action-box")[0];
    LOADER_GLOBALS.REGISTRATION_FIELDS.slice().reverse().forEach(field => {
      if (field.visible && field.fieldId !== "confirm-password") {
        self.formFields.unshift(field.fieldId);
        formElement.prepend(createFormElement(field, {inputType: "simpleInput"}));
      }
    })
  }

  this.populateForm = function () {
    this.formFields.forEach(item => {
      if (document.getElementById(item)) {
        let htmlElem = document.getElementById(item);
        htmlElem.value = LOADER_GLOBALS.credentials[item] || "";
      }
    });
  }

  this.writeUserDetailsToFile = function (wallet, callback) {
    let objectToWrite = {};
    Object.keys(LOADER_GLOBALS.credentials).forEach(key => {
      if (typeof LOADER_GLOBALS.credentials[key] !== "boolean" && key !== "password") {
        objectToWrite[key] = LOADER_GLOBALS.credentials[key]
      }
    })
    wallet.safeBeginBatch(err => {
        if (err) {
            return callback(err);
        }
        wallet.writeFile(USER_DETAILS_FILE, JSON.stringify(objectToWrite), (err) => {
            if (err) {
            return callback(err);
            }
            wallet.commitBatch(callback);
        });
    })
  }

  this.getUserDetailsFromFile = function (wallet, callback) {
    wallet.readFile(USER_DETAILS_FILE, (err, data) => {
      if (err) {
        return callback(err);
      }
      const dataSerialization = data.toString();
      callback(undefined, JSON.parse(dataSerialization))
    });
  }

  this.errorAlert = function (errSource, errCode, err) {
    console.error(`${errSource} Operation failed. Error: ${err} `);
    alert(`Operation failed.\u000AError code ${errCode}\u000APlease try again. If problem persists contact your support team.`);
    this.goToLandingPage();
  }

  this.loadWallet = function () {
    walletService.load(getVaultDomain(), getWalletSecretArrayKey(), (err, wallet) => {
      if (err) {
        this.spinner.removeFromView();
        console.error("Failed to load the wallet in domain:", getVaultDomain(), getWalletSecretArrayKey(), err.message);
        const errText = err.type === "ServiceWorkerError" ? err.message : "Invalid credentials";
        if (document.getElementById("register-details-error")) {
          document.getElementById("register-details-error").innerText = errText
        }
        if (document.getElementById("sso-pin-error")) {
          document.getElementById("sso-pin-error").innerText = errText
        }
        return;
      }

      let writableWallet = wallet;

      writableWallet.getKeySSIAsString((err, keySSIString) => {
        if (err) {
          this.errorAlert("getKeySSIAsString", "01", err);
          return
        }

        console.log(`Loading wallet ${keySSIString}`);

        writableWallet.getKeySSIAsObject((err, keySSI) => {
          if (err) {
            this.errorAlert("getKeySSIAsObject", "02", err);
            return
          }

          keySSI.getAnchorId((err, anchorId) => {
            if (err) {
              this.errorAlert("getAnchorId", "03", err);
              return
            }

            this.setSSAppToken(anchorId, keySSIString, (err) => {
              if (err) {
                this.errorAlert("setSSAppToken", "04", err);
                return
              }

              new WalletRunner({
                seed: keySSIString,
                anchorId,
                spinner: self.spinner
              }).run();
            })
          });
        });
      });
    });
  }

  this.setSSAppToken = function (walletAnchorId, sReadSSI, callback) {
    let url = fileService.getBaseURL(`cloud-wallet/setSSAPPToken/${walletAnchorId}`);
    createXMLHttpRequest(url, "PUT", {sReadSSI}, (err, result) => {
      callback(err, result);
    });
  }

  this.openWallet = function (event) {
    if (this.loginWithPin) {
      LOADER_GLOBALS.clearCredentials();
      const pinCode = document.getElementById("pincode").value;
      if (LOADER_GLOBALS.pinCodeExists(pinCode)) {
        LOADER_GLOBALS.loadPinCodeCredentials(pinCode);
      }
    }

    if (event) {
      event.preventDefault();
    }
    if (this.spinner) {
      this.spinner.attachToView();
      this.spinner.setStatusText("Opening wallet...");
    }

    this.formFields.forEach(field => {
      if (field !== "confirm-password") {
        LOADER_GLOBALS.credentials[field] = document.getElementById(field).value;
      }
    })
    this.loadWallet();

  };

  this.toggleShowPin = function () {
    this.showPin = !this.showPin;
    this.pinUpdate("");
  }

  this.clearPin = function () {
    this.pinInput.value = "";
    this.pinUpdate("");
  }

  this.pinUpdate = function (value) {
    this.pinInput = document.getElementById('sso-pincode');

    if (value !== 'del' && this.pinInput.value.length < 6) {
      this.pinInput.value = this.pinInput.value + value;
    }

    if (value === 'del' && this.pinInput.value.length <= 6) {
      this.pinInput.value = this.pinInput.value.slice(0, -1);
    }

    if (this.pinInput.value.length <= 6) {
      Array.from(document.getElementsByClassName('number-input')).forEach((item, index) => {
        if (this.showPin) {
          this.pinInput.value[index] ? item.innerText = this.pinInput.value[index] : item.innerText = "";
        } else {
          this.pinInput.value[index] ? item.innerText = "*" : item.innerText = "";
        }
      })
    }
  }

  this.openSSOWallet = function (userId, secret) {
    LOADER_GLOBALS.clearCredentials();
    LOADER_GLOBALS.credentials.username = getCookie("SSODetectedId");
    LOADER_GLOBALS.credentials.userId = userId;
    LOADER_GLOBALS.credentials.ssokey = secret;
    this.loadWallet();
  }

  this.submitSSOPin = function (event) {
    let pin = document.getElementById('sso-pincode').value;
    try {
      let secret = decrypt(pin, this.ssoEncryptedSecret);
      this.openSSOWallet(this.userId, secret);
    } catch (e) {
      if (document.getElementById("sso-pin-error")) {
        document.getElementById("sso-pin-error").innerText = "Invalid credentials"
      }
    }
  };

  this.sendSSOGetRequest = function (userId) {
    let url = fileService.getBaseURL(`getSSOSecret/${LOADER_GLOBALS.environment.appName}`);
    createXMLHttpRequest(url, "GET", (err, result) => {
      if (err || !result) {
        const basePath = window.location.href.split("loader")[0];
        window.location.replace(basePath + "loader/newWallet.html");
      } else {
        if (LOADER_GLOBALS.environment.mode === "sso-pin") {
          this.ssoEncryptedSecret = result;
          this.spinner.removeFromView();
          document.getElementById("pin-numpad").classList.remove("d-none");
          document.addEventListener('keydown', (event) => {
            switch (event.key) {
              case '0':
              case '1':
              case '2':
              case '3':
              case '4':
              case '5':
              case '6':
              case '7':
              case '8':
              case '9':
                document.getElementById('btn-' + event.key).focus();
                document.getElementById('btn-' + event.key).click();
                setTimeout(() => {
                  document.getElementById('btn-' + event.key).blur()
                }, 300)

                break;
              case 'Delete':
              case 'Backspace':
                document.getElementById('btn-del').focus();
                document.getElementById('btn-del').click();
                setTimeout(() => {
                  document.getElementById('btn-del').blur();
                }, 300)
                break;
            }
          });
        } else {
          let secret = decrypt(LOADER_GLOBALS.DEFAULT_PIN, result);
          this.openSSOWallet(this.userId, secret);
        }
      }
    }).send();
  }

}

const controller = new MainController();


document.addEventListener("DOMContentLoaded", function () {
  if (LOADER_GLOBALS.environment.mode === "sso-direct" || LOADER_GLOBALS.environment.mode === "sso-pin") {
    //to do get form ssooauth
    controller.userId = getCookie("SSOUserId");
    if (!controller.userId) {
      alert("UserId not found!!!!");
      return;
    }
    controller.initSpinner();
    controller.spinner.attachToView();
    controller.sendSSOGetRequest(controller.userId);
  } else {
    if (LOADER_GLOBALS.hasPinCodes()) {
      document.getElementById("pin-container").classList.remove("d-none");
      document.getElementById("open-wallet-btn").removeAttribute("disabled");
      controller.init();
      controller.loginWithPin = true;
    } else {
      controller.createForm();
      controller.init();
      controller.populateForm();
      controller.loginWithPin = false
    }

    prepareViewContent();
  }
});


window.controller = controller;
