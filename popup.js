var state = {
    onlineADOT: false,
    onlineIPFS: false,
    walletOpen: false,
    decentralized: false,
    toolbarVisible: false,
    useInterceptedSearch: true,
    selectedOperation: "send",
    rpcUser: "user",
    rpcPass: "pass",
    rpcPort: "31050",
    ipfsPort: "8080",
    ready: 0, // ready on 7
    readyDOM: false
}

function toggleWallet() {
    let changeViewButton = document.getElementsByClassName('change-view-button')[0];
    let changeViewLayer0 = document.getElementsByClassName('change-view-layer-0')[0];
    let changeViewLayer1 = document.getElementsByClassName('change-view-layer-1')[0];
    let changeViewText = document.getElementById("change-view-text");
    let initialView = document.getElementsByClassName("home-container")[0];
    let walletView = document.getElementsByClassName("wallet-container")[0];

    // TODO_ADOT_LOW decide whether or not to add the transition
    /*
    changeViewButton.classList.add("no-click");

    changeViewLayer0.classList.remove("no-trans");
    changeViewLayer1.classList.remove("no-trans");

    changeViewButton.classList.add("start-trans");
    changeViewLayer0.classList.add("start-trans");
    changeViewLayer1.classList.add("start-trans");

    changeViewText.style.opacity = "0";
    */
    setTimeout(() => {
        if (changeViewText.innerHTML == "Wallet") {
            initialView.style.display = "none";
            walletView.style.display = "flex";
            
            state.walletOpen = true;
            loopRefreshWallet();
        } else if (changeViewText.innerHTML == "Home") {
            initialView.style.display = "flex";
            walletView.style.display = "none";
            
            state.walletOpen = false;
        }
        /*
        changeViewButton.classList.remove("start-trans");
        
        changeViewLayer0.classList.remove("start-trans");
        changeViewLayer0.classList.add("end-trans");
    
        changeViewLayer1.classList.remove("start-trans");
        changeViewLayer1.classList.add("end-trans");
        */
    }, 10);

    setTimeout(() => {
        if (changeViewText.innerHTML == "Wallet") {
            changeViewText.innerHTML = "Home";
        } else if (changeViewText.innerHTML == "Home") {
            changeViewText.innerHTML = "Wallet";
        }

        changeViewText.style.opacity = "1";
    }, 10);

    /*
    setTimeout(() => {
        changeViewLayer0.classList.add("no-trans");
        changeViewLayer1.classList.add("no-trans");
        changeViewLayer0.classList.remove("end-trans");
        changeViewLayer1.classList.remove("end-trans");
        changeViewButton.classList.remove("no-click");
    }, 1100);
    */
}

function refreshBalance(value) {
    if (typeof value === "number") {
        let balance = document.getElementById("balance-holder");
        balance.innerHTML = (Math.floor(value * 100) / 100).toFixed(2);
    }
}

function processLatestTransactions(latestTransactions = []) {
    if (latestTransactions.length >= 1) {
        for (let i = latestTransactions.length - 1; i >= 0; i--) {
            txInfo = document.getElementById("tx-info-" + (latestTransactions.length - 1 - i));
            txType = document.getElementById("tx-type-" + (latestTransactions.length - 1 - i));

            txInfo.innerHTML = ((latestTransactions[i].amount * 100) / 100).toFixed(2) + " to ";

            if (latestTransactions[i].account != "") {
                txInfo.innerHTML += " " + latestTransactions[i].account;
            }

            txInfo.innerHTML += "<br>" + latestTransactions[i].address;

            if (latestTransactions[i].category == "generate" || latestTransactions[i].category == "receive") {
                txType.innerHTML = "IN";
                txType.style.color = "rgb(50, 205, 50)";
            } else if (latestTransactions[i].category == "send") {
                txType.innerHTML = "OUT";
                txType.style.color = "rgb(255, 0, 0)";
            } else if (latestTransactions[i].category == "immature") {
                txType.innerHTML = "IMM";
                txType.style.color = "rgb(192,192,192)";
            } else if (latestTransactions[i].category == "orphan") {
                txType.innerHTML = "OPH";
                txType.style.color = "rgb(192,192,192)";
            }
        }
    }
}

function updateDecentralized() {
    if (state.onlineADOT && state.onlineIPFS) {
        decentContainer = document.getElementsByClassName("decent-container")[0];
        decentText = document.getElementsByClassName("decent-text")[0];

        decentContainer.style.transition = "background-color 1.5s ease"; // add the transition effect only when first 
        decentContainer.style.backgroundColor = "rgba(44, 175, 44, 0.8)";
        decentText.style.color = "rgba(255, 255, 255, 0.9)";
    } else {
        decentContainer = document.getElementsByClassName("decent-container")[0];
        decentText = document.getElementsByClassName("decent-text")[0];

        decentContainer.style.transition = "background-color 1.5s ease";
        decentContainer.style.backgroundColor = "rgba(162, 162, 162, 0.2)";
        decentText.style.color = "rgba(162, 162, 162, 0.6)";
    }
}

function hideToolbar() {
    document.getElementsByClassName("toggle-toolbar-button")[0].style.backgroundColor = "#20072F";
    chrome.storage.sync.set({ "toolbarVisible": false });
}

function showToolbar() {
    document.getElementsByClassName("toggle-toolbar-button")[0].style.backgroundColor = "rgba(44, 175, 44, 0.6)";
    chrome.storage.sync.set({ "toolbarVisible": true });
}

function toggleToolbar() {
    state.toolbarVisible ? hideToolbar() : showToolbar();
}

function executeOperation() {
    console.log(state.selectedOperation);
    let command = "cancel";
    let params = [];

    switch (state.selectedOperation) {
        case "send":
            let address = document.forms["wallet-action-form"]["address"].value;
            let amount = document.forms["wallet-action-form"]["amount"].value;
            
            console.log(address, amount);
            
            amount = parseFloat(amount);

            if (typeof amount !== "number") {
                // error
                return;
            }

            // TODO_ADOT_MEDIUM validations

            command = "sendtoaddress";
            params = [address, amount];
            break;
        case "register":
            let domainNameReg = document.forms["wallet-action-form"]["domain"].value;
            let ipfsHashReg = document.forms["wallet-action-form"]["hash"].value;

            console.log(domainNameReg, ipfsHashReg);

            // TODO_ADOT_MEDIUM validations

            command = "registerdomain";
            params = [domainNameReg, ipfsHashReg];
            break;
        case "update":
            let domainNameUpd = document.forms["wallet-action-form"]["domain"].value;
            let ipfsHashUpd = document.forms["wallet-action-form"]["hash"].value;

            console.log(domainNameUpd, ipfsHashUpd);

            // TODO_ADOT_MEDIUM validations

            command = "updatedomain";
            params = [domainNameUpd, ipfsHashUpd];
            break;
        case "unlock":
            let password = document.forms["wallet-action-form"]["password"].value;
            let duration = document.forms["wallet-action-form"]["duration"].value;

            console.log(password, duration);

            duration = parseInt(duration);

            if (typeof duration !== "number") {
                // error
                return;
            }

            // TODO_ADOT_MEDIUM validations

            command = "walletpassphrase";
            params = [password, duration];
            break;
        default:
            console.log("Error: Selected operation doesn't exist!");
            break;
    }

    document.forms["wallet-action-form"].reset();
    let url = getWalletBaseUrl(state.rpcUser, state.rpcPass, state.rpcPort);
    sendCommand(url, command, params, operationSuccess, operationFailed);
}

// TODO_ADOT_HIGH success/fail operation popup

function operationSuccess(result) {

}

function operationFailed() {
    
}

async function loopRefreshWallet() {
    console.log("loopRefreshWallet");

    if (state.walletOpen === true) {
        let url = getWalletBaseUrl(state.rpcUser, state.rpcPass, state.rpcPort);

        sendCommand(url, "getbalance", [], refreshBalance, (command) => { sendCommandFailed(command, "loopRefreshWallet"); });
        sendCommand(url, "listtransactions", ["*", 6, 0], processLatestTransactions, (command) => { sendCommandFailed(command, "loopRefreshWallet"); });

        setTimeout(loopRefreshWallet, 4000);
    }
}

function updateOperation(operation) {
    state.selectedOperation = operation;
    let selected = operation;

    if (selected === "update") {
        selected = "register";
    }
    
    document.forms["wallet-action-form"].reset();
    document.querySelector("#wallet-action-form .wallet-action:not(.invisible)").classList.toggle("invisible");
    document.querySelector(`#wallet-action-form .wallet-action.${selected}-action`).classList.toggle("invisible");
}

function openSettings() {
    if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
    } else {
        window.open(chrome.runtime.getURL('options.html'));
    }
}

function syncState() {
    chrome.storage.sync.get("onlineADOT", function (result) {
        if (result) {
            state.onlineADOT = result["onlineADOT"];

            doWhenDOMReady(updateAdotStatus);
        }
    
        state.ready++;
    });
    
    chrome.storage.sync.get("onlineIPFS", function (result) {
        if (result) {
            state.onlineIPFS = result["onlineIPFS"];
            
            doWhenDOMReady(updateIpfsStatus);
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
    
    chrome.storage.sync.get("useInterceptedSearch", function (result) {
        if (result && "useInterceptedSearch" in result) {
            state.useInterceptedSearch = result["useInterceptedSearch"];

            doWhenDOMReady(() => {
                if (state.useInterceptedSearch === false) {
                    document.getElementById("intercepted-search-toggle").checked = false;
                }
            });
        }
    
        state.ready++;
    });

    chrome.storage.sync.get("toolbarVisible", function (result) {
        if (result && "toolbarVisible" in result) {
            state.toolbarVisible = result["toolbarVisible"];

            doWhenDOMReady(() => {
                if (state.toolbarVisible) {
                    document.getElementsByClassName("toggle-toolbar-button")[0].style.backgroundColor = "rgba(44, 175, 44, 0.6)";
                }
            });
        }

        state.ready++;
    });
}

function doWhenDOMReady(toDo, noTry = 0) {
    if (state.readyDOM === false) {
        if (noTry > 100) // prevent never-ending loops, if readyDOM is not true after 10 seconds then there's most probably some other problem going on
            return;

        setTimeout(() => {
            doWhenDOMReady(toDo, noTry++);
        }, 100);
    
        return;
    }

    toDo();
}

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

function processUpdatedStorageElement(name, value) {
    if (state[name] != value.oldValue)
        console.log(`Warning: In popup, the old value of ${name} in state, ${state[name].toString()}, doesn't match the old value ${value.oldValue} from storage.`);

    state[name] = value.newValue;
    
    switch (name) {
        case "onlineADOT":
            doWhenDOMReady(updateAdotStatus);
            break;
        case "onlineIPFS":
            doWhenDOMReady(updateIpfsStatus);
            break;
        default:
            break;
    }
}

function updateAdotStatus() {
    let walletStatus = document.getElementById("wallet-status");
    let walletButton = document.getElementById("wallet-button");

    if (state.onlineADOT === true) {
        walletStatus.classList.add("active");

        walletButton.classList.add("active");
        walletButton.addEventListener("click", toggleWallet);
    } else if (state.onlineADOT === false) {
        walletStatus.classList.remove("active");

        walletButton.classList.remove("active");
        walletButton.removeEventListener("click", toggleWallet);
    }

    updateDecentralized();
}

function updateIpfsStatus() {
    let ipfsStatus = document.getElementById("ipfs-status");

    if (state.onlineIPFS) {
        ipfsStatus.classList.add("active");
    } else if (state.onlineIPFS === false) {
        ipfsStatus.classList.remove("active");
    }

    updateDecentralized();
}

function toggleInterceptedSearch(action) {
    if (action.target && (action.target.checked === true || action.target.checked === false)) {
        chrome.storage.sync.set({ "useInterceptedSearch": action.target.checked });
    }
}

syncState();

document.addEventListener('DOMContentLoaded', function () {
    setTimeout(() => {
        document.getElementsByTagName("body")[0].classList.remove("on-init");
    }, 400); // transitions are cancelled on popup initialization

    state.readyDOM = true;

    document.getElementById("execute-button").addEventListener("click", executeOperation);
    document.getElementById("toolbar-button").addEventListener("click", toggleToolbar);
    document.getElementById("settings-button").addEventListener("click", openSettings);
    document.getElementById("intercepted-search-toggle").addEventListener("click", toggleInterceptedSearch);

    document.querySelector('.action-select-wrapper').addEventListener('click', function () {
        this.querySelector('.action-select').classList.toggle('open');
    });

    for (const option of document.querySelectorAll(".action-option")) {
        option.addEventListener('click', function () {
            if (!this.classList.contains('selected')) {
                console.log(this.dataset.value);
                updateOperation(this.dataset.value);
                this.parentNode.querySelector('.action-option.selected').classList.remove('selected');
                this.classList.add('selected');
                this.closest('.action-select').querySelector('.action-select__trigger span').textContent = this.textContent;
            }
        });
    }
}, false);
