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
    ready: 0 // ready on 4
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
        console.log(`Warning: In background, the old value of ${name} in state, ${state[name].toString()}, doesn't match the old value ${value.oldValue} from storage.`);

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
        { urls: [`*://*/*search?q=*.${state.customIdentifier}*`] }, ["blocking"]);
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
    if (state.onlineIPFS === true && state.ready === 4) {
        chrome.tabs.update(tabId, { url: `${getIpfsBaseUrl(state.ipfsPort)}${ipfsHash}` });
    } else {
        chrome.tabs.update(tabId, { url: `https://ipfs.io/ipfs/${ipfsHash}` });
    }
}

function resolveDomain(domainName, tabId) {
    if (state.onlineADOT === true && state.ready === 4) {
        const walletUrl = getWalletBaseUrl(state.rpcUser, state.rpcPass, state.rpcPort);

        sendCommand(walletUrl, "resolvedomain", [domainName],
            (ipfsHash) => { 
                if (ipfsHash !== "Blockchain domain name not found!") {
                    redirectTab(tabId, ipfsHash);
                } else {
                    domainNotFound(domainName);
                }
            },
            (command) => {
                sendCommandFailed(command, "resolveDomain");
            }
        );
    } else {
        serverResolveDomain(domainName,
            (ipfsHash) => {
                redirectTab(tabId, ipfsHash);
            },
            (serverAddress, request, statusCode) => {
                serverRequestFailed(serverAddress, request, statusCode, "resolveDomain"); 
            }
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

    let domainStartIndex = url.indexOf("search?q=");
    let sectionUrl = url.substr(domainStartIndex + 9);
    let domainEndIndex = sectionUrl.indexOf("&"); // search?q=a.domain& if the domain contains "&" this will break
    let domainParts = sectionUrl.slice(0, domainEndIndex).split('.');

    let supportedIdentifiers = defaultSupportedIdentifiers.slice();
    supportedIdentifiers.push(state.customIdentifier);
    console.log("got this intercept", supportedIdentifiers);

    if (supportedIdentifiers.includes(domainParts[domainParts.length - 1])) {
        domainParts.pop();
    } else if (domainParts[0] == 'a') {
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
            console.log("checkIpfsConn success");

            handleSuccess(req.responseText);
        } else if (this.readyState === XMLHttpRequest.DONE) {
            console.log("checkIpfsConn fail");

            handleFail();
        }
    }

    req.send();
}

function checkIpfsSuccess(result) {
    console.log("checkIpfsSuccess with: ", result);

    if (state.onlineIPFS === "none" || state.onlineIPFS === false) {
        chrome.storage.sync.set({ "onlineIPFS": true });
    }
}

function checkIpfsFail() {
    console.log("checkIpfsFail");

    if (state.onlineIPFS === "none" || state.onlineIPFS === true) {
        chrome.storage.sync.set({ "onlineIPFS": false });
    }
}

// also sets the latest number of connections to the Alterdot network
function checkWalletSuccess(result) {
    console.log("checkWalletSuccess with: ", result);

    chrome.browserAction.setBadgeText({ text: result["connections"].toString() });

    if (state.onlineADOT === "none" || state.onlineADOT === false) {
        chrome.storage.sync.set({ "onlineADOT": true });
    }
}

function checkWalletFail() {
    console.log("checkWalletFail");

    chrome.browserAction.setBadgeText({ text: "" });

    if (state.onlineADOT === "none" || state.onlineADOT === true) {
        chrome.storage.sync.set({ "onlineADOT": false });
    }
}

async function loopWalletConn() {
    console.log("loopWalletConn");

    let url = getWalletBaseUrl(state.rpcUser, state.rpcPass, state.rpcPort);
    sendCommand(url, "getinfo", [], checkWalletSuccess, checkWalletFail);
    //getInfo(checkWalletSuccess, checkWalletFail);
    setTimeout(loopWalletConn, 4000);
}

async function loopIpfsConn() {
    console.log("loopIpfsConn");

    checkIpfsConn(checkIpfsSuccess, checkIpfsFail);

    setTimeout(loopIpfsConn, 4000);
}

function startLoops() {
    if (state.ready != 4) {
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
        { urls: ["*://*/*search?q=*.a*", "*://*/*search?q=*.adot*", "*://*/*search?q=a.*"] }, ["blocking"]);
}

// removes the old listener if any and adds a new one
function renewDefaultOnErrorRedirect() {
    browser.webRequest.onErrorOccurred.removeListener(redirectAlterdotDomainRequestError);

    browser.webRequest.onErrorOccurred.addListener(redirectAlterdotDomainRequestError,
        { urls: ["*://*.a/*", "*://*.adot/*"], types: ['main_frame'] }); // MetaMask style
}

function init() {
    syncState();

    // state changes listener
    chrome.storage.onChanged.addListener(function (changes, area) {
        console.log("storage changed");
    
        if (area == "sync") {
            for (const key of Object.keys(changes)) {
                console.log(key);
    
                if (Object.keys(state).includes(key)) {
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
        if (request.msg == "minimize-toolbar" || request.msg == "maximize-toolbar" || request.msg == "hide-toolbar" || request.msg == "show-toolbar") {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, request, (response) => {
                if (response) {
                    console.log("background bdns: received ", response, " from ", sender, " ... relaying it");
        
                    if (response.minimized != undefined) {
                    this.minimizedToolbar = response.minimized;
                    console.log(this.minimizedToolbar);
                    }
        
                    sendResponse(response);
                }
                });
            }
            });
        }
        return true;
    });
}

init();
