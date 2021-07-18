var state = {
    rpcUser: "user",
    rpcPass: "pass",
    rpcPort: "31050",
    ipfsPort: "8081",
    customIdentifier: "chain",
    ready: 0 // ready on 5
};

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
    
        state.ready++;
    });
}

function saveSettings() {
    // TODO_ADOT_MEDIUM validations

    chrome.storage.sync.set({ "rpcPort": document.forms["settings-form"]["wallet-port"].value });
    chrome.storage.sync.set({ "rpcUser": document.forms["settings-form"]["wallet-user"].value });
    chrome.storage.sync.set({ "rpcPass": document.forms["settings-form"]["wallet-pass"].value });
    chrome.storage.sync.set({ "ipfsPort": document.forms["settings-form"]["ipfs-port"].value });
    chrome.storage.sync.set({ "customIdentifier": document.forms["settings-form"]["custom-identifier"].value });
}

function fillInitialFormData() {
    console.log("fillInitialFormData begin");

    if (state.ready != 5) {
        setTimeout(() => {
            fillInitialFormData();
        }, 100);

        return;
    }

    document.forms["settings-form"]["wallet-port"].value = state.rpcPort;
    document.forms["settings-form"]["wallet-user"].value = state.rpcUser;
    document.forms["settings-form"]["wallet-pass"].value = state.rpcPass;
    document.forms["settings-form"]["ipfs-port"].value = state.ipfsPort;
    document.forms["settings-form"]["custom-identifier"].value = state.customIdentifier;
}

function init() {
    syncState();

    document.addEventListener('DOMContentLoaded', function () {
        document.getElementById("save-button").addEventListener('click', saveSettings);

        fillInitialFormData();
    });
}

init();
