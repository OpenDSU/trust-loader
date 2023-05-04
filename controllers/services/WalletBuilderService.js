'use strict';

import FileService from "./FileService.js";
import getVaultDomain from "../../utils/getVaultDomain.js";

//if (!LOADER_GLOBALS) {
import "./../../loader-config.js";

//}

/**
 * @param {RawDossier} wallet
 * @param {object} options
 * @param {string} options.codeFolderName
 * @param {string} options.walletTemplateFolderName
 * @param {string} options.appFolderName
 * @param {string} options.appsFolderName
 */
function WalletBuilderService(options) {
    const defaultOptions = LOADER_GLOBALS.WALLET_BUILDER_SERVICE;

    if (options) {
        options = Object.assign(defaultOptions, options);
    } else {
        options = defaultOptions;
    }

    const CODE_FOLDER = options.CODE_FOLDER_NAME;
    const WALLET_TEMPLATE_FOLDER = options.WALLET_TEMPLATE_FOLDER_NAME;
    const APP_FOLDER = options.APP_FOLDER_NAME;
    const APPS_FOLDER = options.APPS_TEMPLATE_FOLDER_NAME;
    const SSI_FILE_NAME = options.SSI_FILE_NAME;

    if (!CODE_FOLDER) {
        throw new Error('Code folder name is required');
    }

    if (!WALLET_TEMPLATE_FOLDER) {
        throw new Error('The wallet template folder name is required');
    }

    if (!APP_FOLDER) {
        throw new Error('The app folder name is required');
    }

    if (!APPS_FOLDER) {
        throw new Error('The apps folder name is required');
    }

    const VAULT_DOMAIN = getVaultDomain();


    const fileService = new FileService();

    this.walletTypeSeed = null;
    this.dossierFactory = options.dossierFactory;
    this.dossierLoader = options.dossierLoader;


    /**
     * Get the list of file and their contents
     * from the wallet template folder
     *
     * @param {callback} callback
     */
    const getWalletTemplateContent = (callback) => {
        fileService.getFolderContentAsJSON(WALLET_TEMPLATE_FOLDER, (err, data) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to get content for " + WALLET_TEMPLATE_FOLDER, err));
            }

            let content;
            try {
                content = JSON.parse(data);
            } catch (e) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to parse content for " + WALLET_TEMPLATE_FOLDER, e));
            }

            callback(undefined, content);
        });
    };

    /**
     * @param {object} walletTemplateFolderName
     * @return {Array.Object}
     */
    const dirSummaryAsArray = (walletTemplateContent) => {
        let files = [];
        for (let directory in walletTemplateContent) {
            let directoryFiles = walletTemplateContent[directory];
            for (let fileName in directoryFiles) {
                files.push({
                    path: directory + "/" + fileName,
                    content: directoryFiles[fileName]
                });
            }
        }
        return files;
    };

    /**
     * Write the files into the DSU under /prefix
     *
     * @param {DSU} dsu
     * @param {Array.Object} files
     * @param {string} prefix
     * @param {callback} callback
     */
    const customizeDSU = (dsu, files, prefix, callback) => {
        if (typeof prefix === "function") {
            callback = prefix;
            prefix = undefined;
        }
        if (files.length === 0) {
            return callback();
        }
        let file = files.pop();
        let targetPath = file.path;

        if (typeof prefix !== 'undefined') {
            targetPath = `${prefix}/${targetPath}`;
        }

        let fileContent;
        if (Array.isArray(file.content)) {
            let Buffer = require("buffer").Buffer;

            let arrayBuffer = new Uint8Array(file.content).buffer;
            let buffer = new Buffer(arrayBuffer.byteLength);
            let view = new Uint8Array(arrayBuffer);
            for (let i = 0; i < buffer.length; ++i) {
                buffer[i] = view[i];
            }
            fileContent = buffer;
        } else {
            fileContent = file.content;
        }
        dsu.safeBeginBatch(err => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to begin batch", err));
            }
            dsu.writeFile(targetPath, fileContent, (err) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to write file in DSU at path ", targetPath, err));
                }
                dsu.commitBatch(err => {
                    if (err) {
                        return dsu.cancelBatch(err => {
                           if(err){
                               return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to cancel batch", err));
                           }

                            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to commit batch", err));
                        });
                    }
                    customizeDSU(dsu, files, prefix, callback);
                });
            });
        });
    };

    /**
     * @param {callback} callback
     */
    const getListOfAppsForInstallation = (callback) => {
        fileService.getFolderContentAsJSON(APPS_FOLDER, function (err, data) {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to get content for folder " + APPS_FOLDER, err));
            }

            let apps;

            try {
                apps = JSON.parse(data);
            } catch (e) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to parse content for folder " + APPS_FOLDER, err));
            }

            callback(undefined, apps);
        });
    };

    /**
     * @param {string} appName
     * @param {string} seed
     * @param {Boolean} hasTemplate
     * @param {callback} callback
     */
    const buildApp = (appName, seed, hasTemplate, callback) => {
        if (typeof hasTemplate === "function") {
            callback = hasTemplate;
            hasTemplate = true;
        }

        const instantiateNewDossier = (files) => {
            let resolver = require("opendsu").loadApi("resolver");
            let keyssi = require("opendsu").loadApi("keyssi");
            resolver.createDSU(keyssi.createTemplateSeedSSI(VAULT_DOMAIN), (err, appDSU) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to create DSU ", err));
                }

                appDSU.mount('/' + CODE_FOLDER, seed, (err) => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to mount in /code seedSSI ", seed, err));
                    }
                    customizeDSU(appDSU, files, `/${APP_FOLDER}`, (err) => {
                        if (err) {
                            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to customize DSU", err));
                        }
                        appDSU.safeBeginBatch(err => {
                            if (err) {
                                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to begin batch", err));
                            }

                            appDSU.writeFile("/code/initialization.js", `require("/code/${APP_FOLDER}/initialization.js")`, (err) => {
                                if (err) {
                                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to write initialization file", err));
                                }
                                appDSU.commitBatch(err => {
                                    if (err) {
                                        return appDSU.cancelBatch(err => {
                                            if(err){
                                                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to cancel batch", err));
                                            }

                                            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to commit batch", err));
                                        });
                                    }
                                    appDSU.getKeySSIAsString(callback);
                                });
                            })
                        })
                    })
                })
            });
        };

        if (hasTemplate) {
            const templatePath = APPS_FOLDER || "apps-patch";
            return fileService.getFolderContentAsJSON(`${templatePath}/${appName}`, (err, data) => {
                let files;

                try {
                    files = JSON.parse(data);
                } catch (e) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to get content for folder" + `apps/${appName}`, err));
                }

                files = dirSummaryAsArray(files);
                instantiateNewDossier(files);
            })
        }
        instantiateNewDossier([]);


    };

    /**
     * @param {object} apps
     * @param {Array.String} appsList
     * @param {callback} callback
     */
    const performInstallation = (walletDSU, apps, appsList, callback) => {
        if (!appsList.length) {
            return callback();
        }
        let appName = appsList.pop();
        const appInfo = apps[appName];

        if (appName[0] === '/') {
            appName = appName.replace('/', '');
        }

        const mountApp = (newAppSeed) => {
            walletDSU.mount('/apps/' + appName, newAppSeed, (err) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to mount in folder" + `/apps/${appName}`, err));
                }

                performInstallation(walletDSU, apps, appsList, callback);
            })
        };

        //by default ssapps have a template
        let hasTemplate = appInfo.hasTemplate !== false;
        let newInstanceIsDemanded = appInfo.newInstance !== false;
        if (newInstanceIsDemanded) {
            return buildApp(appName, appInfo.seed, hasTemplate, (err, newAppSeed) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to build app " + `${appName}`, err));
                }
                mountApp(newAppSeed);
            });
        }
        mountApp(appInfo.seed);

    };

    /**
     * @param {string} appName
     * @param {string} seed
     * @param {callback} callback
     */
    const rebuildApp = (appName, seed, callback) => {
        const templatePath = APPS_FOLDER || "apps-patch";
        fileService.getFolderContentAsJSON(`${templatePath}/${appName}`, (err, data) => {
            let files;

            try {
                files = JSON.parse(data);
            } catch (e) {
                return callback(e);
            }

            files = dirSummaryAsArray(files);

            const appDossier = this.dossierLoader(seed);
            customizeDSU(appDossier, files, `/${APP_FOLDER}`, (err) => {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to customize DSU", err));
            })
        })

    };

    /**
     * @param {object} apps
     * @param {Array.String} appsList
     * @param {callback} callback
     */
    const performApplicationsRebuild = (apps, appsList, callback) => {
        if (!appsList.length) {
            return callback();
        }

        let appName = appsList.pop();
        const appInfo = apps[appName];

        if (appName[0] === '/') {
            appName = appName.replace('/', '');
        }

        rebuildApp(appName, appInfo.seed, (err) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to rebuild app" + `${appName}`, err));
            }

            performApplicationsRebuild(apps, appsList, callback);
        })
    };

    /**
     * Get list of installed applications
     * and rebuild them
     *
     * @param {callback} callback
     */
    const rebuildApplications = (callback) => {
        getListOfAppsForInstallation((err, apps) => {
            if (err) {
                return callback();
            }

            const appsList = [];

            wallet.listMountedDossiers('/', (err, data) => {
                const mountedApps = [];
                for (const mountPoint of data) {
                    const appName = '/' + mountPoint.path.split('/').pop();
                    const appSeed = mountPoint.dossierReference;

                    if (!apps[appName]) {
                        continue;
                    }

                    appsList.push(appName);
                    apps[appName].seed = appSeed;
                }

                if (!appsList) {
                    return;
                }

                performApplicationsRebuild(apps, appsList, callback);
            });

        })

    };

    const getSSAppsFromInstallationURL = (callback) => {
        let url = new URL(window.location.href);
        let searchParams = url.searchParams;
        let apps = {};

        searchParams.forEach((paramValue, paramKey) => {
            if (paramKey === "appName") {
                let seedKey = paramValue + "Seed";
                let appSeed = searchParams.get(seedKey);
                if (appSeed) {
                    apps[paramValue] = appSeed;
                }
            }
        });

        if (Object.keys(apps)) {
            return callback(apps);
        }

        callback();

    };


    /**
     * Install applications found in the /apps folder
     * into the wallet
     *
     * @param {DSU} walletDSU
     * @param {callback} callback
     */
    const installApplications = (walletDSU, callback) => {

        getListOfAppsForInstallation((err, apps) => {

            let appsToBeInstalled = apps || {};

            getSSAppsFromInstallationURL((apps) => {
                let externalAppsList = Object.keys(apps);
                if (externalAppsList.length > 0) {
                    externalAppsList.forEach(appName => {
                        appsToBeInstalled[appName] = {
                            hasTemplate: false,
                            newInstance: false,
                            seed: apps[appName]
                        };
                    });
                    let landingApp = {name: externalAppsList[0]};
                    walletDSU.safeBeginBatch(err => {
                        if (err) {
                            return callback(err);
                        }
                        walletDSU.writeFile("apps-patch/.landingApp", JSON.stringify(landingApp), () => {
                            walletDSU.commitBatch(err => {
                                if (err) {
                                    return walletDSU.cancelBatch(err => {
                                        if (err) {
                                            return callback(err);
                                        }
                                        return callback(err);
                                    })
                                }
                                console.log(`Written landingApp [${landingApp.name}]. `)
                            });
                        });
                    });
                }
            });

            const appsList = Object.keys(appsToBeInstalled);

            if (appsList.length === 0) {
                return callback();
            }
            console.log('Installing the following applications: ', appsToBeInstalled, appsList);

            performInstallation(walletDSU, appsToBeInstalled, appsList, callback);
        })
    }

    /**
     * Mount the wallet template code
     * and install necessary applications
     *
     * @param {object} files
     * @param {callback} callback
     */
    const install = (wallet, files, callback) => {
        // Copy any files found in the WALLET_TEMPLATE_FOLDER on the local file system
        // into the wallet's app folder
        files = dirSummaryAsArray(files);
        customizeDSU(wallet, files, `/${APP_FOLDER}`, (err) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to customize DSU", err));
            }

            installApplications(wallet, callback);
        });
    }

    /**
     * @param {callback} callback
     */
    this.build = function (options, callback) {
        let resolver = require("opendsu").loadApi("resolver");
        let keySSISpace = require("opendsu").loadApi("keyssi");
        let domain = getVaultDomain();

        let _build = () => {
            fileService.getFile(WALLET_TEMPLATE_FOLDER + "/" + SSI_FILE_NAME, (err, dsuType) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to read wallet dsu type from ${WALLET_TEMPLATE_FOLDER + "/" + SSI_FILE_NAME}`, err));
                }
                resolver.createDSU(keySSISpace.createTemplateWalletSSI(domain, options['secret']), {
                    useSSIAsIdentifier: true,
                    dsuTypeSSI: dsuType,
                    walletKeySSI: options['walletKeySSI']
                }, (err, walletDSU) => {
                    if (err) {
                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to create wallet of type  ${dsuType}`, err));
                    }
                    console.log("ConstDSU Wallet has SSI:", walletDSU.getCreationSSI(true));
                    walletDSU = walletDSU.getWritableDSU();
                    getWalletTemplateContent((err, files) => {
                        if (err) {
                            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to read wallet template`, err));
                        }

                        // we need to remove dsu type identifier from the file list
                        files['/'][SSI_FILE_NAME] = undefined;
                        delete files['/'][SSI_FILE_NAME];
                        if (!options.walletKeySSI) {
                            install(walletDSU, files, (err) => {
                                if (err) {
                                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to install`, err));
                                }
                                walletDSU.beginSafeBatch((err) => {
                                    if (err) {
                                        return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to begin safe batch`, err));
                                    }
                                    walletDSU.writeFile("/environment.json", JSON.stringify(LOADER_GLOBALS.environment), (err) => {
                                        if (err) {
                                            return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Could not write Environment file into wallet.", err));
                                        }
                                        walletDSU.commitBatch((err) => {
                                            if (err) {
                                                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to commit batch`, err));
                                            }
                                            callback(undefined, walletDSU);
                                        });
                                    })
                                })
                            });
                        } else {
                            callback(undefined, walletDSU);
                        }
                    });

                });
            });
        }

        resolver.loadDSU(keySSISpace.createTemplateWalletSSI(domain, options['secret']), (err, walletDSU) => {
            if (err) {
                _build();
            } else {
                console.log("Possible security issue. It is ok during development if you use the same credentials. Just do a npm run clean to remove APIHub cache in this case...");
                walletDSU = walletDSU.getWritableDSU();
                callback(err, walletDSU);
            }
        });
    };

    /**
     * @param {callback}
     */
    this.rebuild = function (callback) {
        getWalletTemplateContent((err, files) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to read wallet template`, err));
            }

            // Remove the seed file in order to prevent copying it into the new dossier
            delete files['/'].seed;

            // Copy any files found in the WALLET_TEMPLATE_FOLDER on the local file system
            // into the wallet's app folder
            files = dirSummaryAsArray(files);
            customizeDSU(wallet, files, `/${APP_FOLDER}`, (err) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper("Failed to customize DSU", err));
                }

                console.trace('Rebuilding');
                rebuildApplications(callback);
            })
        })

    }
}

export default WalletBuilderService;
