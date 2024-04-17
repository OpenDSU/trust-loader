import "./../loader-config.js";
import {Spinner, prepareViewContent} from "./services/UIService.js";
import WalletService from "./services/WalletService.js";
import getVaultDomain from "../utils/getVaultDomain.js";

function ChangePasswordController() {
    let spinner;
    let USER_DETAILS_FILE = "user-details.json";
    const walletService = new WalletService();
    let self = this;

    this.displayContainer = function (containerId) {
        document.getElementById(containerId).style.display = "block";
    };

    this.showErrorOnField = function (fieldId, fieldHelpId) {
        document.getElementById(fieldId).style.border = "2px solid red";
        document.getElementById(fieldHelpId).setAttribute('style', 'color:red !important;');
    }

    this.removeErrorFromField = function (fieldId, fieldHelpId) {
        document.getElementById(fieldId).style.border = "1px solid #ced4da";
        document.getElementById(fieldHelpId).setAttribute('style', '#6c757d !important');
    }

    this.validateCredentials = function (event) {
        window.validator.regexValidator(event, LOADER_GLOBALS.PASSWORD_REGEX)
    };

    this.validatePasswords = function (event) {
        let oldPassword = document.getElementById("old-password");
        let password = document.getElementById("password");
        let passwordConfirm = document.getElementById("confirm-password");
        if (event) {
            if (event.target.id === "old-password") {
                window.validator.equalValueValidator(event, LOADER_GLOBALS.credentials.password);
            }
            if (event.target.id === "password") {
                window.validator.regexValidator(event, LOADER_GLOBALS.PASSWORD_REGEX)
                passwordConfirm.dispatchEvent(new Event("input"));
            }
            if (event.target.id === "confirm-password") {
                window.validator.equalValueValidator(event, password.value);
            }
        }
        return oldPassword.value === LOADER_GLOBALS.credentials.password && password.getAttribute('valid') && passwordConfirm.getAttribute('valid');
    }
    this.init = function () {
        spinner = new Spinner(document.getElementsByTagName("body")[0]);
        this.displayContainer("credentials-container");
    };

    this.getUserDetailsFromFile = function (wallet, callback) {
        wallet.readFile(USER_DETAILS_FILE, (err, data) => {
            if (err) {
                return callback(err);
            }
            const dataSerialization = data.toString();
            callback(undefined, JSON.parse(dataSerialization))
        });
    }

    this.writeUserDetailsToFile = function (wallet, callback) {
        wallet.safeBeginBatch(err => {
            if (err) {
                return callback(err);
            }
            wallet.writeFile(USER_DETAILS_FILE, JSON.stringify(LOADER_GLOBALS.credentials), err => {
                if (err) {
                    return callback(err);
                }

                wallet.commitBatch(callback);
            });
        })
    }

    /*  this.toggleViewPassword = function (event) {
        const inputId = event.target.getAttribute("input-id");
        event.target.classList.toggle("fa-eye-slash");
        let inputField = document.getElementById(inputId);
        if (inputField.getAttribute("type") === "password") {
          inputField.setAttribute("type", "text");
        } else {
          inputField.setAttribute("type", "password");
        }
      }*/

    this.goBack = function () {
        const basePath = window.location.href.split("loader")[0];
        window.location.replace(basePath + "loader/?login");
    };

    this.openWallet = function (event) {
        if (!this.validatePasswords()) {
            return;
        }
        if (event) {
            event.preventDefault();
        }
        spinner.attachToView();
        spinner.setStatusText("Opening wallet...");

        walletService.load(getVaultDomain(), getOldSecretArrKey(), (err, wallet) => {
            if (err) {
                spinner.removeFromView();
                console.error("Failed to load the wallet in domain:", getVaultDomain(), getOldSecretArrKey(), err);
                return (document.getElementById("register-details-error").innerText = "Invalid credentials");
            }

            let writableWallet = wallet;

            writableWallet.getKeySSIAsString((err, keySSI) => {
                if (err) {
                    console.error(err);
                    return console.error("Operation failed. Try again");
                }

                walletService.createWithKeySSI(getVaultDomain(), {
                    secret: getWalletSecretArrayKey(),
                    walletKeySSI: keySSI
                }, (err, newWallet) => {
                    if (err) {
                        return console.error(err);
                    }
                    self.writeUserDetailsToFile(newWallet, (err) => {
                        if (err) {
                            return console.log(err);
                        }

                        self.getUserDetailsFromFile(newWallet, (err, data) => {
                            if (err) {
                                return console.log(err);
                            }
                            console.log("Logged user", data);
                        })
                    });
                    LOADER_GLOBALS.saveCredentials();
                    let pinCode = LOADER_GLOBALS.getLastPinCode();
                    if (pinCode) {
                        LOADER_GLOBALS.savePinCodeCredentials(pinCode, LOADER_GLOBALS.credentials)
                    }
                    const basePath = window.location.href.split("loader")[0];
                    window.location.replace(basePath + "loader/?login");
                });
            });
        });
    };
}

function getWalletSecretArrayKey() {
    LOADER_GLOBALS.credentials.password = document.getElementById("password").value;
    let arr = Object.values(LOADER_GLOBALS.credentials).filter(elem => typeof elem !== "boolean");
    return arr;
}

function getOldSecretArrKey() {
    let arr;
    if (LOADER_GLOBALS.credentials.password === document.getElementById("old-password").value) {
        arr = Object.values(LOADER_GLOBALS.credentials).filter(elem => typeof elem !== "boolean");
    }
    return arr;
}

let controller = new ChangePasswordController();

document.addEventListener("DOMContentLoaded", function () {

    prepareViewContent();
    controller.init();

    //for test
    /*  document.getElementById("old-password").value = LOADER_GLOBALS.credentials.password;
      document.getElementById("password").value = LOADER_GLOBALS.credentials.password + 1;
      document.getElementById("confirm-password").value = LOADER_GLOBALS.credentials.password + 1;*/

});
window.controller = controller;
