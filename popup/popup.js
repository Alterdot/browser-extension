var state = {
    onlineADOT: false,
    onlineIPFS: false,
    walletOpen: false,
    decentralized: false,
    toolbarState: "hidden",
    useInterceptedSearch: true,
    selectedOperation: "send",
    notifTimer: null, // handler of notification timeout
    rpcUser: "user",
    rpcPass: "pass",
    rpcPort: "31050",
    ready: 0, // ready on 8
    readyDOM: false,
    useDebug: false,
    transactionsToFetch: 100,
    transactionsReturned: 0,
    transactionsAddedOnScroll: 50
};

function toggleWallet() {
    let changeViewText = document.getElementById("change-view-text");
    let initialView = document.getElementById("home-container");
    let walletView = document.getElementById("wallet-container");

    if (changeViewText.innerHTML == "Wallet") {
        initialView.style.display = "none";
        walletView.style.display = "flex";
        changeViewText.innerHTML = "Home";

        document.getElementById('transactions-loading').style.display = "flex";
        state.walletOpen = true;

        refreshWallet();
        addScrollListener();
        setInterval(refreshWallet, 4000);
    } else if (changeViewText.innerHTML == "Home") {
        initialView.style.display = "flex";
        walletView.style.display = "none";
        changeViewText.innerHTML = "Wallet";

        state.walletOpen = false;
    }
}

function refreshBalance(value) {
    if (typeof value === "number") {
        let balance = document.getElementById("balance-holder");
        balance.innerHTML = (Math.floor(value * 100) / 100).toFixed(2);
    }
}

function addScrollListener() {
    var container = document.getElementById("transactions-container");
    container.addEventListener('scroll', function (event) {
        var element = event.target;
        if (element.scrollHeight - element.scrollTop === element.clientHeight && state.transactionsReturned == state.transactionsToFetch) {
            document.getElementById("transactions-loading").style.display = "flex";
            state.transactionsToFetch = state.transactionsToFetch + state.transactionsAddedOnScroll;
            refreshWallet();
        }
    });
}


function processLatestTransactions(latestTransactions = []) {
    const transactionsNumber = latestTransactions.length;
    state.transactionsReturned = transactionsNumber;
    if (transactionsNumber >= 1) {
        let divNumber = 0;
        //TODO_ADOT_LOW add date-time to the transaction to be more precise about the ordering ?
        for (let i = transactionsNumber - 1; i >= 0; i--, divNumber++) {

            const address = latestTransactions[i].address;
            const category = latestTransactions[i].category;
            const amount = latestTransactions[i].amount;
            const fee = latestTransactions[i].fee;
            const account = latestTransactions[i].account;

            createTxContainerDiv(divNumber);
            let txInfo = document.getElementById("tx-info-" + divNumber);
            let txType = document.getElementById("tx-type-" + divNumber);

            txInfo.innerHTML = ((amount * 100) / 100).toFixed(2) + " to ";

            if (account != "") {
                txInfo.innerHTML += " " + account;
            }

            txInfo.innerHTML += "<br>";

            if (address != undefined) {
                txInfo.innerHTML += address;
            } else if (category == "send") {
                if (amount === -0.1 && fee === -0.1) {
                    updateTx(txInfo, txType, "REG", "rgb(30, 118, 210)", "16px", "BlockchainDNS Registration");
                    continue;
                } else if (amount === -0.005 && fee === -0.005) {
                    updateTx(txInfo, txType, "UPD", "rgb(30, 118, 210)", "16px", "BlockchainDNS Update");
                    continue;
                }
            }

            switch (category) {
                case "generate":
                    updateTx(txInfo, txType, getMiningIconLink("green"));
                    break;
                case "receive":
                    updateTx(txInfo, txType, receiveTransactionIcon);
                    break;
                case "send":
                    if (isToSelf(i, address, amount)) {
                        updateTx(txInfo, txType, selfTransactionIcon);
                        i--;
                    } else {
                        updateTx(txInfo, txType, receiveTransactionIcon);
                    }
                    break;
                case "immature":
                    updateTx(txInfo, txType, getMiningIconLink("gray"));
                    break;
                case "orphan":
                    updateTx(txInfo, txType, getMiningIconLink("red"));
                    break;
                default:
                    updateTx(txInfo, txType, "ERR", "rgb(255, 0, 0)", "16px");
            }
        }
    } else {
        document.getElementById("tx-info-0").innerHTML = "&emsp;&emsp;&emsp;&emsp;No transaction history.";
    }

    document.getElementById("transactions-loading").style.display = "none";

    function isToSelf(transactionIndex, currentTransactionAddress, currentTransactionAmount) {
        return transactionIndex >= 1 &&
            currentTransactionAddress == latestTransactions[transactionIndex - 1].address &&
            Math.abs(currentTransactionAmount) ==
            Math.abs(latestTransactions[transactionIndex - 1].amount);
    }

    function createTxContainerDiv(index) {
        const newDivId = "tx-" + index;
        if (document.getElementById(newDivId) != null)
            return;

        var div = document.createElement('div');
        div.id = newDivId;
        div.className = "transaction";

        div.appendChild(createTxInnerDiv(index, "tx-type"));
        div.appendChild(createTxInnerDiv(index, "tx-info"));

        document.getElementById("transactions-container").appendChild(div);
    }

    function createTxInnerDiv(i, tx_data) {
        var tx = document.createElement('div');
        tx.id = tx_data + "-" + i;
        tx.className = tx_data;
        return tx;
    }

    function updateTx(txInfo, txType, txTypeContent, txTypeColor, txTypeFontSize, txInfoText) {
        if (txInfoText != undefined) {
            txInfo.innerHTML += txInfoText;
        }

        txType.innerHTML = txTypeContent;
        if (txTypeColor != undefined) {
            txType.style.color = txTypeColor;
        }
        if (txTypeFontSize != undefined) {
            txType.style.fontSize = txTypeFontSize;
        }
    }

    function getMiningIconLink(color) {
        return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" width="1em" height="1em" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path d="M14.79 10.62L3.5 21.9l-1.4-1.4L13.38 9.21l1.41 1.41m4.48-2.89l.59-.59l-.79-.79l.64-.64l-1.42-1.42l-.64.64l-.79-.79l-.59.59c-1.74-1.42-3.7-2.56-5.8-3.36l-.83 1.79c1.75.92 3.36 2.03 4.86 3.34L14 7l3 3l.5-.5c1.31 1.5 2.42 3.11 3.34 4.86l1.79-.83c-.8-2.1-1.94-4.06-3.36-5.8z" fill="' + color + '"/></svg>'
    }
}

function updateDecentralized() {
    let decentContainer = document.getElementsByClassName("decent-container")[0];
    let decentText = document.getElementsByClassName("decent-text")[0];

    if (state.onlineADOT && state.onlineIPFS) {
        decentContainer.style.transition = "background-color 1.5s ease"; // add the transition effect only when first changing the Decentralized status 
        decentContainer.style.backgroundColor = "rgba(44, 175, 44, 0.8)";
        decentText.style.color = "rgba(255, 255, 255, 0.9)";
    } else {
        decentContainer.style.transition = "background-color 1.5s ease";
        decentContainer.style.backgroundColor = "rgba(162, 162, 162, 0.2)";
        decentText.style.color = "rgba(162, 162, 162, 0.6)";
    }
}

function hideToolbar() {
    document.getElementById("toolbar-button").classList.remove("active");
    chrome.storage.sync.set({ "toolbarState": "hidden" });
}

function showToolbar() {
    document.getElementById("toolbar-button").classList.add("active");
    chrome.storage.sync.set({ "toolbarState": "maximized" });
}

// if the toolbar is hidden it should always get displayed maximized after toggling
function toggleToolbar() {
    if (state.toolbarState === "hidden") {
        showToolbar()
    } else {
        hideToolbar();
    }
}

function executeOperation() {
    if (state.useDebug) {
        console.log("selected operation", state.selectedOperation);
    }

    let command = "cancel";
    let params = [];

    switch (state.selectedOperation) {
        case "send":
            let address = document.forms["wallet-action-form"]["address"].value;
            let amount = document.forms["wallet-action-form"]["amount"].value;

            amount = parseFloat(amount);

            if (typeof amount !== "number" || isNaN(amount)) {
                displayNotification("error", "The sent amount must be a number.");
                return;
            }

            if (address.length != 34) {
                displayNotification("error", "The inserted address doesn't have the mandatory length of 34 characters.");
                return;
            }

            command = "sendtoaddress";
            params = [address, amount];
            break;
        case "register":
            let domainNameReg = document.forms["wallet-action-form"]["domain"].value;
            let ipfsHashReg = document.forms["wallet-action-form"]["hash"].value;

            if (domainNameReg.indexOf('/') > -1 || domainNameReg.indexOf(' ') > -1) {
                displayNotification("error", "Domain names should not contain the '/' character or spaces, certain functionalities might fail. You can override this by using your wallet to register the domain.");
                return;
            }

            if (ipfsHashReg.length < 46) {
                displayNotification("error", "The inserted IPFS/IPNS hash must have at least 46 characters.");
                return;
            }

            command = "registerdomain";
            params = [domainNameReg, ipfsHashReg];
            break;
        case "update":
            let domainNameUpd = document.forms["wallet-action-form"]["domain"].value;
            let ipfsHashUpd = document.forms["wallet-action-form"]["hash"].value;

            if (ipfsHashUpd.length < 46) {
                displayNotification("error", "The inserted IPFS/IPNS hash must have at least 46 characters.");
                return;
            }

            command = "updatedomain";
            params = [domainNameUpd, ipfsHashUpd];
            break;
        case "unlock":
            let password = document.forms["wallet-action-form"]["password"].value;
            let duration = document.forms["wallet-action-form"]["duration"].value;

            duration = parseInt(duration);

            if (!Number.isInteger(duration)) {
                displayNotification("error", "The set duration must be an integer number.");
                return;
            }

            command = "walletpassphrase";
            params = [password, duration];
            break;
        default:
            if (state.useDebug) {
                console.log("The selected operation doesn't exist!");
            }

            break;
    }

    document.forms["wallet-action-form"].reset();
    let url = getWalletBaseUrl(state.rpcUser, state.rpcPass, state.rpcPort);
    sendCommand(url, command, params, (message) => {
        if (command == "walletpassphrase") { // only possible operation that doesn't return a txHash
            displayNotification("success", "Wallet unlocked successfully!");
        } else {
            displayNotification("success", `Transaction succeeded with hash: ${message}`);
        }
    }, (reqStatus, errMessage) => {
        processRequestFail(state.useDebug, reqStatus, errMessage, `walletAction ${command}`);

        if (errMessage && errMessage['message']) {
            displayNotification("error", errMessage['message']);
        }
    }, state.useDebug);
}

// type can be success, error or info
function displayNotification(type, message) {
    // ensures that the notification will not be cleared if a new notification popped up and the last one has a running timer
    clearTimeout(state.notifTimer);

    let notification = document.getElementById("notification");
    let notifText = document.getElementById("text-notif");

    notification.classList.add(type);
    notifText.innerHTML = message;

    notification.classList.add("visible");

    state.notifTimer = setTimeout(hideNotification, 10000);
}

function hideNotification() {
    // the previous running timer is no longer needed
    clearTimeout(state.notifTimer);

    let notification = document.getElementById("notification");
    let notifText = document.getElementById("text-notif");

    notification.classList.remove("visible");

    // transition delay
    setTimeout(function () {
        notification.className = "";
        notifText.innerHTML = "";
    }, 800);
}

async function refreshWallet() {
    if (state.walletOpen === true) {
        if(state.useDebug){
            console.log("Transactions to fetch: " + state.transactionsToFetch);
            console.log("Transactions returned: " + state.transactionsReturned);
        }
        let url = getWalletBaseUrl(state.rpcUser, state.rpcPass, state.rpcPort);
        sendCommand(url, "getbalance", [], refreshBalance, (reqStatus, errMessage) => {
            processRequestFail(state.useDebug, reqStatus, errMessage, "refreshWallet getbalance");
        }, state.useDebug);
        sendCommand(url, "listtransactions", ["*", state.transactionsToFetch, 0], processLatestTransactions, (reqStatus, errMessage) => {
            processRequestFail(state.useDebug, reqStatus, errMessage, "refreshWallet listtransactions");

            document.getElementById("transactions-loading").style.display = "none";
            displayNotification("error", "Failed to retrieve transactions");
        }, state.useDebug);
    }
}

function updateOperation(operation) {
    state.selectedOperation = operation;
    let selectedElement = operation;

    if (selectedElement === "update") {
        selectedElement = "register";
    }

    document.forms["wallet-action-form"].reset();
    document.querySelector("#wallet-action-form .wallet-action:not(.invisible)").classList.toggle("invisible");
    document.querySelector(`#wallet-action-form .wallet-action.${selectedElement}-action`).classList.toggle("invisible");
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

    chrome.storage.sync.get("useDebug", function (result) {
        if (result && "useDebug" in result) {
            state.useDebug = result["useDebug"];
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

    chrome.storage.sync.get("toolbarState", function (result) {
        if (result && "toolbarState" in result) {
            state.toolbarState = result["toolbarState"];

            doWhenDOMReady(() => {
                if (state.toolbarState === "maximized" || state.toolbarState === "minimized") {
                    document.getElementById("toolbar-button").classList.add("active");
                }
            });
        }

        state.ready++;
    });
}

function doWhenDOMReady(action, noTry = 0) {
    if (state.readyDOM === false) {
        if (noTry > 100) // prevent never-ending loops, if readyDOM is not true after 10 seconds then there's most probably some other problem going on
            return;

        setTimeout(() => {
            doWhenDOMReady(action, noTry++);
        }, 100);

        return;
    }

    action();
}

function processUpdatedStorageElement(name, value) {
    if (state[name] != value.oldValue)
        console.log(`Warning: In popup, the old value of ${name} in state doesn't match the old value from storage.`);

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

    if (state.onlineIPFS === true) {
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

function init() {
    syncState();

    chrome.storage.onChanged.addListener(function (changes, area) {
        if (area == "sync") {
            for (const key of Object.keys(changes)) {
                if (state.useDebug) {
                    console.log(`storage ${key} changed`);
                }

                if (Object.keys(state).includes(key)) {
                    processUpdatedStorageElement(key, changes[key]);
                }
            }
        }
    });

    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(() => {
            document.getElementsByTagName("body")[0].classList.remove("on-init");
        }, 400); // transitions are cancelled on popup initialization

        state.readyDOM = true;

        document.getElementById("execute-button").addEventListener("click", executeOperation);
        document.getElementById("toolbar-button").addEventListener("click", toggleToolbar);
        document.getElementById("settings-button").addEventListener("click", openSettings);
        document.getElementById("intercepted-search-toggle").addEventListener("click", toggleInterceptedSearch);
        document.querySelector('#close-notif').addEventListener("click", hideNotification);

        document.querySelector('.action-select-wrapper').addEventListener('click', function () {
            this.querySelector('.action-select').classList.toggle('open');
        });

        for (const option of document.querySelectorAll(".action-option")) {
            option.addEventListener('click', function () {
                if (!this.classList.contains('selected')) {
                    updateOperation(this.dataset.value);

                    this.parentNode.querySelector('.action-option.selected').classList.remove('selected');
                    this.classList.add('selected');
                    this.closest('.action-select').querySelector('.action-select__trigger span').textContent = this.textContent;
                }
            });
        }
    }, false);
}

const selfTransactionIcon = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" width="1em" height="1em" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><g fill="none"><path d="M18 2l3 3l-3 3" stroke="purple" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 22l-3-3l3-3" stroke="purple" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 5H10a7 7 0 0 0-7 7" stroke="purple" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 19h11a7 7 0 0 0 7-7" stroke="purple" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g></svg>';
const receiveTransactionIcon = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" width="1em" height="1em" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><g fill="none"><path d="M11 5l-7 7l7 7" stroke="green" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 12h16" stroke="green" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g></svg>';
const sendTransactionIcon = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" width="1em" height="1em" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><g fill="none"><path d="M4 12h16" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 5l7 7l-7 7" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g></svg>';

init();
