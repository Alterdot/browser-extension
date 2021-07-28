var state = {
    useDebug: false,
    rpcUser: "user",
    rpcPass: "pass",
    rpcPort: "31050",
    ipfsPort: "8081",
    saveResultTimer: null, // handler of save result timeout
    customIdentifier: "chain",
    ready: 0 // ready on 6
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
    
        state.ready++;
    });
}

function validateSimpleString(str) {
    return str.match("^[A-Za-z0-9]+$");
}

function clearErrors() {
    clearError(document.forms["settings-form"]["wallet-port"], "wallet-port-error");
    clearError(document.forms["settings-form"]["wallet-user"], "wallet-user-error");
    clearError(document.forms["settings-form"]["wallet-pass"], "wallet-pass-error");
    clearError(document.forms["settings-form"]["ipfs-port"], "ipfs-port-error");
    clearError(document.forms["settings-form"]["custom-identifier"], "custom-identifier-error");
}

function saveSettings() {
    clearErrors();
    let hasErrors = false;

    let rpcPortField = document.forms["settings-form"]["wallet-port"];
    let rpcPort = parseInt(rpcPortField.value);

    if (typeof rpcPort !== "number" || isNaN(rpcPort)) {
        displayError(rpcPortField, "wallet-port-error", "The port must be a number.");
        hasErrors = true;
    } else if (rpcPort < 0 || rpcPort > 65535) {
        displayError(rpcPortField, "wallet-port-error", "Ports can have a value between 0 and 65335.");
        hasErrors = true;
    }

    let rpcUserField = document.forms["settings-form"]["wallet-user"];

    if (!validateSimpleString(rpcUserField.value)) {
        displayError(rpcUserField, "wallet-user-error", "The RPC username must contain only letters and digits, special characters are not allowed.");
        hasErrors = true;
    }

    let rpcPassField = document.forms["settings-form"]["wallet-pass"];

    if (!validateSimpleString(rpcPassField.value)) {
        displayError(rpcPassField, "wallet-pass-error", "The RPC password must contain only letters and digits, special characters are not allowed.");
        hasErrors = true;
    }

    let ipfsPortField = document.forms["settings-form"]["ipfs-port"];
    let ipfsPort = parseInt(ipfsPortField.value);

    if (typeof ipfsPort !== "number" || isNaN(ipfsPort)) {
        displayError(ipfsPortField, "ipfs-port-error", "The port must be a number.");
        hasErrors = true;
    } else if (ipfsPort < 0 || ipfsPort > 65535) {
        displayError(ipfsPortField, "ipfs-port-error", "Ports can have a value between 0 and 65335.");
        hasErrors = true;
    }

    let customIdField = document.forms["settings-form"]["custom-identifier"];

    if (!validateSimpleString(customIdField.value)) {
        displayError(customIdField, "custom-identifier-error", "The custom domain identifier must contain only letters and digits, special characters are not allowed.");
        hasErrors = true;
    }

    if (!hasErrors) {
        chrome.storage.sync.set({ "rpcPort": rpcPortField.value });
        chrome.storage.sync.set({ "rpcUser": rpcUserField.value });
        chrome.storage.sync.set({ "rpcPass": rpcPassField.value });
        chrome.storage.sync.set({ "ipfsPort": ipfsPortField.value });
        chrome.storage.sync.set({ "customIdentifier": customIdField.value });
        chrome.storage.sync.set({ "useDebug": document.forms["settings-form"]["use-debug"].checked });
        
        saveResult("success");
    } else {
        saveResult("error");
    }
}

function displayError(field, errorId, errMsg) {
    document.getElementById(errorId).innerHTML = errMsg;
    field.classList.add("error");
}

function clearError(field, errorId) {
    document.getElementById(errorId).innerHTML = "";
    field.classList.remove("error");
}

// type can be success or error
function saveResult(type) {
    // ensures that the save result will not be cleared if a new one popped up and the last result has a running timer
    hideResult();

    let result = document.querySelector(`.save-result.${type}`);

    if (result) {
        result.classList.add("active");
    }

    state.saveResultTimer = setTimeout(hideResult, 10000);
}

function hideResult() {
    // the previous running timer is no longer needed
    clearTimeout(state.saveResultTimer);

    let result = document.querySelector('.save-result.active');
    
    if (result) {
        result.classList.remove("active");
    }
}

function fillInitialFormData() {
    if (state.useDebug) {
        console.log("fillInitialFormData begin");
    }

    if (state.ready != 6) {
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
    document.forms["settings-form"]["use-debug"].checked = state.useDebug;
}

function init() {
    syncState();

    document.addEventListener('DOMContentLoaded', function () {
        document.getElementById("save-button").addEventListener('click', saveSettings);

        fillInitialFormData();
    });
}

init();
