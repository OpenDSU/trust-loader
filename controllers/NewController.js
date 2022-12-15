import "./../loader-config.js";
import {createFormElement, prepareView, prepareViewContent, Spinner} from "./services/UIService.js";
import WalletService from "./services/WalletService.js";
import NavigatorUtils from "./services/NavigatorUtils.js";
import getVaultDomain from "../utils/getVaultDomain.js";
import {createXMLHttpRequest, getCookie, encrypt, generateRandom} from "../utils/utils.js";
import FileService from "./services/FileService.js";

function NewController() {

  const USER_DETAILS_FILE = "user-details.json";
  let formFields = [];
  const walletService = new WalletService();
  let self = this;

  if (LOADER_GLOBALS.environment.mode === "dev-secure") {
    if (!LOADER_GLOBALS.credentials.isValid) {
      LOADER_GLOBALS.credentials.isValid = true;
      LOADER_GLOBALS.credentials.username = "devuser"
      LOADER_GLOBALS.credentials.email = "dev@user.dev";
      LOADER_GLOBALS.credentials.company = LOADER_GLOBALS.environment.companyName || "Company Inc";
      LOADER_GLOBALS.credentials.password = "SuperUserSecurePassword1!";
      LOADER_GLOBALS.credentials['confirm-password'] = "SuperUserSecurePassword1!";
      LOADER_GLOBALS.saveCredentials();
      console.log("Initialising credentials for develoment mode");
    }
  }

  this.printCode = function () {
    window.print();
  }

  this.copyCode = function copy() {
    let range = document.createRange();
    range.selectNode(document.getElementById("recovery-code"));
    let selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("copy");
  }

  this.pinCheckboxHandler = function (event) {
    document.getElementById("pin-input-container").classList.toggle("d-none");
    document.getElementById('pincode-help').innerHTML = LOADER_GLOBALS.LABELS_DICTIONARY.PINCODE_HELP;
  }

  this.writeUserDetailsToFile = function (wallet, callback) {
    wallet.writeFile(USER_DETAILS_FILE, JSON.stringify(LOADER_GLOBALS.credentials), callback);
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
  this.hasInstallationUrl = function () {
    let windowUrl = new URL(window.location.href);
    return windowUrl.searchParams.get("appName") !== null;
  };

  this.init = function () {
    NavigatorUtils.hasRegisteredServiceWorkers((error, hasServiceWorker) => {
      if (error) {
        return (document.getElementById("register-details-error").innerText = error.message);
      }
      if (hasServiceWorker) {
        NavigatorUtils.unregisterAllServiceWorkers(() => {
          window.location.reload();
        });
      } else {
        this.spinner = new Spinner(document.getElementsByTagName("body")[0]);
        this.wizard = new Stepper(document.getElementById("psk-wizard"));
      }
    });
  };

  //TODO Refactore and restructure the whole bs...
  function getWalletSecretArrayKey(usePin) {
    let arr = Object.values(LOADER_GLOBALS.credentials).filter(elem => typeof elem !== "boolean");
    arr.push(LOADER_GLOBALS.environment.appName);
    return arr;
  }

  this.createWallet = function (type) {

    this.spinner.attachToView();
    try {
      console.log("Creating wallet...");
      LOADER_GLOBALS.saveCredentials();

      walletService.create(getVaultDomain(), getWalletSecretArrayKey(), (err, wallet) => {
        if (err) {
          document.getElementById("register-details-error").innerText = "An error occurred. Please try again.";
          self.spinner.removeFromView();
          return console.error(err);
        }
        let writableWallet = wallet;

        writableWallet.getKeySSIAsString((err, keySSI) => {
          console.log(`Wallet created. Seed: ${keySSI}`);

          self.writeUserDetailsToFile(writableWallet, (err, data) => {
            if (err) {
              return console.log(err);
            }

            self.getUserDetailsFromFile(writableWallet, (err, data) => {
              if (err) {
                return console.log(err);
              }
              console.log("Logged user", data);
              document.getElementById("recovery-code").innerHTML = keySSI;

              if (type && type === "sso") {
                const basePath = window.location.href.split("loader")[0];
                window.location.replace(basePath + "loader/?login");
              } else {
                self.spinner.removeFromView();
                this.wizard.next();
              }
            })

          });


        });
      });
    } catch (e) {
      document.getElementById("register-details-error").innerText = e.message || "Seed is not valid.";
    }
  }

  this.previous = function (event) {
    event.preventDefault();
    //document.getElementById("seed").value = "";
    document.getElementById("restore-seed-btn").setAttribute("disabled", "disabled");
    this.wizard.previous();
  };

  this.submitPassword = function (event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (this.formIsValid()) {
      LOADER_GLOBALS.clearCredentials();
      formFields.forEach(field => {
        if (field !== "confirm-password") {
          LOADER_GLOBALS.credentials[field] = document.getElementById(field).value;
        }
      })
      this.createWallet();
    }
  };

  this.errorAlert = function (errSource, errCode, err) {
    console.error(`${errSource} Operation failed. Error: ${err} `);
    alert(`Operation failed.\u000AError code ${errCode}\u000APlease try again. If problem persists contact your support team.`);
    this.goToLandingPage();
  }

  this.loadWallet = function () {
    walletService.load(getVaultDomain(), getWalletSecretArrayKey(), (err, wallet) => {
      if (err) {
        self.spinner.removeFromView();
        console.error("Failed to load the wallet in domain:", getVaultDomain(), getWalletSecretArrayKey(), err);
        if (err.type === "ServiceWorkerError") {
          return (document.getElementById("open-walet-error").innerText = err.message);
        } else {
          return (document.getElementById("register-details-error").innerText = "Invalid credentials");
        }
      }

      wallet.getKeySSIAsString((err, keySSI) => {
        if (err) {
          this.errorAlert("getKeySSIAsString", "01", err);
          return
        }

        console.log(`Loading wallet ${keySSI}`);
        self.spinner.removeFromView();
        const basePath = window.location.href.split("loader")[0];
        window.location.replace(basePath + "loader/?login");
      });
    });
  }

  this.submitAfterRegistration = function (event) {
    if (document.getElementById("pin-checkbox").checked && document.getElementById("pincode").getAttribute('valid')) {
      LOADER_GLOBALS.savePinCodeCredentials(document.getElementById("pincode").value, LOADER_GLOBALS.credentials);
      console.log('decrypt ', LOADER_GLOBALS.loadPinCodeCredentials(document.getElementById("pincode").value))
    }
    this.loadWallet();

  }
  this.goToLandingPage = function () {
    LOADER_GLOBALS.clearCredentials();
    window.location.replace("./");
  };

  this.formIsValid = function () {
    return validator.validateForm(formFields);
  }

  this.createForm = function () {
    let formElement = document.getElementsByClassName("form-content-container")[0];
    LOADER_GLOBALS.REGISTRATION_FIELDS.slice().reverse().forEach(field => {
      if (field.visible) {
        formFields.unshift(field.fieldId);
        formElement.prepend(createFormElement(field, {inputType: "helperInput"}));
      }
    })
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
        item.innerText = this.pinInput.value[index] || "";
      })
    }
  }

  this.submitSSOPin = function (event) {
    let pin = document.getElementById('sso-pincode').value;
    this.sendSSOPutRequest(pin);
  };

  this.sendSSOPutRequest = function (encryptionKey) {
    const fileService = new FileService();
    let userId = getCookie("SSOUserId");
    let userEmail = getCookie("SSODetectedId");
    let url = fileService.getBaseURL(`putSSOSecret/${LOADER_GLOBALS.environment.appName}`);
    console.log("=====================================================================================================")
    console.log(url);
    console.log("=====================================================================================================")
    let secret = generateRandom(32);
    let encrypted = encrypt(encryptionKey, secret);
    let putData = {secret: JSON.stringify(JSON.parse(encrypted).data)};
    createXMLHttpRequest(url, "PUT", (err) => {
      if (err) {
        alert(`Something went wrong. Couldn't crete credentials for ${userId}.`)
        return (document.getElementById("register-details-error").innerText = "Invalid credentials");
      }
      LOADER_GLOBALS.clearCredentials();
      this.spinner = new Spinner(document.getElementsByTagName("body")[0]);
      this.wizard = new Stepper(document.getElementById("psk-wizard"));
      LOADER_GLOBALS.credentials.username = userEmail;
      LOADER_GLOBALS.credentials.userId = userId;
      LOADER_GLOBALS.credentials.ssokey = secret;
      this.createWallet("sso");
    }).send(JSON.stringify(putData));
  }
}

let controller = new NewController();


document.addEventListener("DOMContentLoaded", function () {

  if (LOADER_GLOBALS.environment.mode === "sso-direct" || LOADER_GLOBALS.environment.mode === "sso-pin") {
    if (LOADER_GLOBALS.environment.mode === "sso-pin") {
      document.getElementById("pin-numpad").classList.remove("d-none");
      document.getElementById("register-details-step").classList.add("d-none");
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
      document.getElementsByClassName("wizard-container")[0].classList.add("d-none");
      controller.sendSSOPutRequest(LOADER_GLOBALS.DEFAULT_PIN);
    }
  } else {

    let LABELS = LOADER_GLOBALS.LABELS_DICTIONARY;
    const page_labels = [
      {title: LABELS.APP_NAME},
      {"#step-register-details": LABELS.REGISTER_DETAILS},
      {"#step-complete": LABELS.COMPLETE},
      {"#back-btn": LABELS.BACK_BUTTON_MESSAGE},
      {"#register-btn": LABELS.REGISTER_BUTTON_MESSAGE},
      {"#register-successfully": LABELS.REGISTER_SUCCESSFULLY},
      {"#seed_print": LABELS.SEED_PRINT},
      {"#open-wallet-btn": LABELS.OPEN_WALLET}

    ];
    if (controller.hasInstallationUrl()) {
      page_labels.push({"#more-information": LOADER_GLOBALS.NEW_WALLET_MORE_INFORMATION});
    } else {
      document.querySelector("#more-information").remove();
    }

    controller.createForm();
    prepareView(page_labels);
    prepareViewContent();

    if (LOADER_GLOBALS.environment.allowPinLogin) {
      document.getElementById("pin-container").classList.remove("d-none");
    }

    controller.init();

//populate fields with existing values
    LOADER_GLOBALS.REGISTRATION_FIELDS.forEach(item => {
      if (document.getElementById(item.fieldId)) {
        let htmlElem = document.getElementById(item.fieldId);
        htmlElem.value = LOADER_GLOBALS.credentials[item.fieldId] || "";
      }
    });
  }
})

window.controller = controller;
