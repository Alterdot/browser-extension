var state = {
    onlineADOT: false,
    onlineIPFS: false,
    rpcUser: "user",
    rpcPass: "pass",
    rpcPort: "31050",
    ipfsPort: "8080",
    ready: 0 // ready on 4
};

function syncState() {
    chrome.storage.sync.get("onlineADOT", function (result) {
        if (result) {
            state.onlineADOT = result["onlineADOT"];
        }
    });
    
    chrome.storage.sync.get("onlineIPFS", function (result) {
        if (result) {
            state.onlineIPFS = result["onlineIPFS"];
        }
    });
    
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
}

function processUpdatedStorageElement(name, value) {
    if (state[name] != value.oldValue)
        console.log(`Warning: In toolbar, the old value of ${name} in state, ${state[name].toString()}, doesn't match the old value ${value.oldValue} from storage.`);

    state[name] = value.newValue;
}

function minimizeToolbar() {
    chrome.runtime.sendMessage({ msg: "minimize-toolbar" }, (response) => {
        if (response && response["success"]) {
            setMinimizedStyles();
        }
    });
}

function setMinimizedStyles() {
    setTimeout(function () {
        document.getElementById("main").style.display = "none";
        document.getElementById("minimized").style.display = "flex";
    }, 20);
}

function maximizeToolbar() {
    chrome.runtime.sendMessage({ msg: "maximize-toolbar" }, (response) => {
        if (response && response["success"]) {
            setMaximizedStyles();
        }
    });
}

function setMaximizedStyles() {
    setTimeout(function () {
        document.getElementById("minimized").style.display = "none";
        document.getElementById("main").style.display = "flex";
    }, 20);
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

function init() {
    syncState();

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

    document.addEventListener('DOMContentLoaded', function () {
        let toolbarMinimize = document.getElementById("toolbar-minimize");
        let toolbarMaximize = document.getElementById("toolbar-maximize");
        let searchBar = document.getElementById("toolbar-input");
    
        if (toolbarMinimize) {
            toolbarMinimize.onclick = function () {
                minimizeToolbar();
            }
        }
    
        if (toolbarMaximize) {
            toolbarMaximize.onclick = function () {
                maximizeToolbar();
            }
        }
    
        if (searchBar) {
            searchBar.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    console.log("toolbar searched value: ", searchBar.value);
                    let domain = searchBar.value;
                    searchBar.value = null;

                    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                        if (tabs[0]) {
                            resolveDomain(domain, tabs[0].tabId);
                        }
                    });
                }
            });
        }
    });
}

init();
