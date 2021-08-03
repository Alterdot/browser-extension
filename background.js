var browser = browser || chrome;

var state = {
    onlineADOT: "none",
    onlineIPFS: "none",
    rpcUser: "user",
    rpcPass: "pass",
    rpcPort: "31050",
    ipfsPort: "8080",
    customIdentifier: "chain",
    useInterceptedSearch: true,
    ready: 0, // ready on 5
    useDebug: false
};

const defaultSupportedIdentifiers = ["a", "adot"];

function syncState() {
    chrome.storage.sync.get("ipfsPort", function (result) {
        if (result && result["ipfsPort"]) {
            state.ipfsPort = result["ipfsPort"];
        }
    
        state.ready++;
    });
    
    chrome.storage.sync.get("rpcPort", function (result) {
        if (result && result["rpcPort"]) {
            state.rpcPort = result["rpcPort"];
        }
    
        state.ready++;
    });
    
    chrome.storage.sync.get("rpcUser", function (result) {
        if (result && result["rpcUser"]) {
            state.rpcUser = result["rpcUser"];
        }
    
        state.ready++;
    });
    
    chrome.storage.sync.get("rpcPass", function (result) {
        if (result && result["rpcPass"]) {
            state.rpcPass = result["rpcPass"];
        }
    
        state.ready++;
    });
    
    chrome.storage.sync.get("useDebug", function (result) {
        if (result && "useDebug" in result) {
            state.useDebug = result["useDebug"];
        }
    
        state.ready++;
    });

    chrome.storage.sync.get("customIdentifier", function (result) {
        if (result && result["customIdentifier"]) {
            state.customIdentifier = result["customIdentifier"];
        }
    
        processUpdatedCustomIdentifier();
    });
    
    chrome.storage.sync.get("useInterceptedSearch", function (result) {
        if (result && "useInterceptedSearch" in result) {
            state.useInterceptedSearch = result["useInterceptedSearch"];
        }
    
        updateInterceptedSearch();
    });
}

// wrappers for easier removal and identification of listener functions
function redirectCustomIdentifierInterceptedSearch(request) {
    redirectAlterdotDomainInterceptedSearch(request);
}

function redirectCustomIdentifierRequestError(requestError) {
    redirectAlterdotDomainRequestError(requestError);
}

function processUpdatedStorageElement(name, value) {
    if (state[name] != value.oldValue)
        console.log(`Warning: In background, the old value of ${name} in state doesn't match the old value from storage.`);

    state[name] = value.newValue;
    
    switch (name) {
        case "customIdentifier":
            processUpdatedCustomIdentifier();
            break;
        case "useInterceptedSearch":
            updateInterceptedSearch();
            break;
        default:
            break;
    }
}

function processUpdatedCustomIdentifier() {
    if (state.useInterceptedSearch === true) {
        renewCustomInterceptedSearch();
    }

    renewCustomOnErrorRedirect();
}

// removes the old listener if any and adds a new one with the latest customIdentifier
function renewCustomInterceptedSearch() {
    browser.webRequest.onBeforeRequest.removeListener(redirectCustomIdentifierInterceptedSearch);

    browser.webRequest.onBeforeRequest.addListener(redirectCustomIdentifierInterceptedSearch,
        { urls: [`*://*/*?q=*.${state.customIdentifier}*`] }, ["blocking"]);
}

// removes the old listener if any and adds a new one with the latest customIdentifier
function renewCustomOnErrorRedirect() {
    browser.webRequest.onErrorOccurred.removeListener(redirectCustomIdentifierRequestError);

    browser.webRequest.onErrorOccurred.addListener(redirectCustomIdentifierRequestError,
        { urls: [`*://*.${state.customIdentifier}/*`], types: ['main_frame'] }); // MetaMask style
}

function updateInterceptedSearch() {
    if (state.useInterceptedSearch === true) {
        renewDefaultInterceptedSearch();
        renewCustomInterceptedSearch();
    } else if (state.useInterceptedSearch === false) {
        browser.webRequest.onBeforeRequest.removeListener(redirectAlterdotDomainInterceptedSearch);
        browser.webRequest.onBeforeRequest.removeListener(redirectCustomIdentifierInterceptedSearch);
    }
}

function newTab(ipfsHash) {
    chrome.tabs.create({ url: `${getIpfsBaseUrl(state.ipfsPort)}${ipfsHash}` });
}

function redirectTab(tabId, ipfsHash) {
    if (state.onlineIPFS === true && state.ready === 5) {
        chrome.tabs.update(tabId, { url: `${getIpfsBaseUrl(state.ipfsPort)}${ipfsHash}` });
    } else {
        chrome.tabs.update(tabId, { url: `https://ipfs.io/ipfs/${ipfsHash}` });
    }
}

function domainNotFound(domainName) {
    console.log(`Alterdot domain ${domainName} not found.`);
    // TODO_ADOT_MEDIUM redirect to "domain not found" IPFS page
}

function resolveDomain(domainName, tabId) {
    if (state.onlineADOT === true && state.ready === 5) {
        const walletUrl = getWalletBaseUrl(state.rpcUser, state.rpcPass, state.rpcPort);

        sendCommand(walletUrl, "resolvedomain", [domainName],
            (ipfsHash) => { 
                if (ipfsHash !== "Blockchain domain name not found!") {
                    redirectTab(tabId, ipfsHash);
                } else {
                    domainNotFound(domainName);
                }
            },
            (reqStatus, errMessage) => {
                processRequestFail(state.useDebug, reqStatus, errMessage, "wallet resolve domain");
            },
            state.useDebug
        );
    } else {
        serverResolveDomain(domainName,
            (ipfsHash) => {
                if (ipfsHash !== "Blockchain domain name not found!") {
                    redirectTab(tabId, ipfsHash);
                } else {
                    domainNotFound(domainName);
                }
            },
            (reqStatus, errMessage) => {
                processRequestFail(state.useDebug, reqStatus, errMessage, "explorer resolve domain");
            },
            state.useDebug
        );
    }
}

function redirectAlterdotDomainRequestError(requestError) {
    const { tabId, url } = requestError;

    // ignore requests that are not associated with tabs
    if (tabId === -1) {
        return;
    }

    const { hostname } = new URL(url);
    let domainParts = hostname.split('.');
    const identifier = domainParts.pop();

    let supportedIdentifiers = defaultSupportedIdentifiers.slice();
    supportedIdentifiers.push(state.customIdentifier);

    if (!supportedIdentifiers.includes(identifier)) {
        return;
    }

    resolveDomain(domainParts.join('.'), tabId);
}

function redirectAlterdotDomainInterceptedSearch(request) {
    const { tabId, url } = request;

    // ignore requests that are not associated with tabs
    if (tabId === -1) {
        return;
    }

    let domainStartIndex = url.indexOf("?q=");
    let sectionUrl = url.substr(domainStartIndex + 3);
    let domainEndIndex = sectionUrl.indexOf("&"); // search?q=a.domain& if the domain contains "&" this will break
    let domainParts = sectionUrl.slice(0, domainEndIndex).split('.');

    let supportedIdentifiers = defaultSupportedIdentifiers.slice();
    supportedIdentifiers.push(state.customIdentifier);

    if (state.useDebug) {
        console.log("interceptedSearch supportedIdentifiers", supportedIdentifiers);
    }

    if (supportedIdentifiers.includes(domainParts[domainParts.length - 1])) {
        domainParts.pop();
    } else if (domainParts[0] === "") {
        domainParts.shift();
    } else {
        return;
    }

    resolveDomain(domainParts.join('.'), tabId);
}

// TODO_ADOT_FUTURE check three different ports by default: 8080 (IPFS primary), 8081 (IPFS secondary) and 48084 (Brave IPFS)
function checkIpfsConn(handleSuccess, handleFail) {
    let req = new XMLHttpRequest();
    let url = `${getIpfsBaseUrl(state.ipfsPort)}bafybeifx7yeb55armcsxwwitkymga5xf53dxiarykms3ygqic223w5sk3m`;

    req.open("GET", url, true);
    req.setRequestHeader("Cache-Control", "no-cache");

    req.onreadystatechange = function () { // Call a function when the state changes.
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            if (state.useDebug) {
                console.log("checkIpfsConn successful with response", req.responseText);
            }

            handleSuccess(req.responseText);
        } else if (this.readyState === XMLHttpRequest.DONE) {
            if (state.useDebug) {
                console.log("checkIpfsConn failed with response", req.responseText);
            }

            handleFail(this.status, req.responseText);
        }
    }

    req.send();
}

function checkIpfsSuccess(response) {
    if (state.onlineIPFS === "none" || state.onlineIPFS === false) {
        chrome.storage.sync.set({ "onlineIPFS": true });
    }
}

function checkIpfsFail(reqStatus, errMessage) {
    processRequestFail(state.useDebug, reqStatus, errMessage, "checkIpfsFail");

    if (state.onlineIPFS === "none" || state.onlineIPFS === true) {
        chrome.storage.sync.set({ "onlineIPFS": false });
    }
}

// also sets the latest number of connections to the Alterdot network
function checkWalletSuccess(result) {
    if ("connections" in result) {
        chrome.browserAction.setBadgeText({ text: result["connections"].toString() });
    }

    if (state.onlineADOT === "none" || state.onlineADOT === false) {
        chrome.storage.sync.set({ "onlineADOT": true });
    }
}

function checkWalletFail() {
    chrome.browserAction.setBadgeText({ text: "" });

    if (state.onlineADOT === "none" || state.onlineADOT === true) {
        chrome.storage.sync.set({ "onlineADOT": false });
    }
}

async function loopWalletConn() {
    let url = getWalletBaseUrl(state.rpcUser, state.rpcPass, state.rpcPort);

    sendCommand(url, "getinfo", [], checkWalletSuccess, (reqStatus, errMessage) => {
        processRequestFail(state.useDebug, reqStatus, errMessage, "loopWalletConn getinfo");
        checkWalletFail();
    }, state.useDebug);

    setTimeout(loopWalletConn, 4000);
}

async function loopIpfsConn() {
    checkIpfsConn(checkIpfsSuccess, checkIpfsFail);

    setTimeout(loopIpfsConn, 4000);
}

function startLoops() {
    if (state.ready != 5) {
        setTimeout(() => {
            startLoops();
        }, 100);
    
        return;
    }

    loopIpfsConn();
    loopWalletConn();
}

// removes the old listener if any and adds a new one
function renewDefaultInterceptedSearch() {
    browser.webRequest.onBeforeRequest.removeListener(redirectAlterdotDomainInterceptedSearch);

    browser.webRequest.onBeforeRequest.addListener(redirectAlterdotDomainInterceptedSearch,
        { urls: ["*://*/*?q=*.a*", "*://*/*?q=*.adot*", "*://*/*?q=.*"] }, ["blocking"]);
}

// removes the old listener if any and adds a new one
function renewDefaultOnErrorRedirect() {
    browser.webRequest.onErrorOccurred.removeListener(redirectAlterdotDomainRequestError);

    browser.webRequest.onErrorOccurred.addListener(redirectAlterdotDomainRequestError,
        { urls: ["*://*.a/*", "*://*.adot/*"], types: ['main_frame'] }); // MetaMask style
}

function init() {
    chrome.runtime.onInstalled.addListener(function (object) {
        if (object.reason === "install") {
            openSettings();
        }
    });

    syncState();

    // state changes listener
    chrome.storage.onChanged.addListener(function (changes, area) {
        if (area == "sync") {
            for (const key of Object.keys(changes)) {
                if (Object.keys(state).includes(key)) {
                    if (state.useDebug) {
                        console.log(`storage ${key} changed`);
                    }

                    processUpdatedStorageElement(key, changes[key]);
                }
            }
        }
    });

    startLoops(); // start main loops that check if connections to IPFS and ADOT networks are alive

    chrome.browserAction.setBadgeBackgroundColor({ color: [179, 56, 92, 1] }); // background color of number of ADOT connections

    renewDefaultOnErrorRedirect(); // OnError redirect listeners are on by default

    // communication between the toolbar that resides in an opened tab and the toolbar initializer/controller, messages have to be passed through background as they can't communicate directly
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.resolveDomain) {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0]) {
                    resolveDomain(request.resolveDomain, tabs[0].id);
                }
            });
        }

        return true;
    });
}

init();
