function getWalletBaseUrl(rpcUser, rpcPass, rpcPort) {
    return `http://${rpcUser}:${rpcPass}@127.0.0.1:${rpcPort}/`;
}

function getIpfsBaseUrl(ipfsPort) {
    return `http://127.0.0.1:${ipfsPort}/ipfs/`;
}

function serverResolveDomain(domainName, handleSuccess, handleFail, useDebug = false) {
    let req = new XMLHttpRequest();
    let url = `https://explorer.alterdot.network/api/resolvedomain?name=${domainName}`;

    req.open("GET", url, true);
    req.onreadystatechange = function () {
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            if (useDebug) {
                console.log("serverResolveDomain request successful with response", req.responseText);
            }

            handleSuccess(req.responseText);
        } else if (this.readyState === XMLHttpRequest.DONE) {
            if (useDebug) {
                console.log("serverResolveDomain request failed with response", req.responseText);
            }

            handleFail(this.status, req.responseText);
        }
    }

    req.send();
}

function sendCommand(url, command, params, handleSuccess, handleFail, useDebug = false) {
    let req = new XMLHttpRequest();

    for(let i = 0; i < params.length; i++) {
        if (typeof params[i] === "number") {
            params[i] = params[i].toString();
        } else {
            params[i] = `"${params[i]}"`;
        }
    }

    let data = `{"method": "${command}", "params": [${params.length ? params.join(', ') : ""}]}`;

    req.open("POST", url, true);
    req.setRequestHeader("Content-type", "application/json");

    req.onreadystatechange = function () {
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            if (useDebug) {
                console.log("sendCommand request successful");
            }

            let response = req.responseText;

            if (response) {
                try {
                    let parsed = JSON.parse(response);

                    if (parsed && (parsed['result'] || parsed['result'] === false || parsed['result'] === 0)) {        
                        response = parsed['result'];
                    } else {
                        response = parsed;
                    }
                } catch (err) {
                    if (useDebug) {
                        console.log("sendCommand unparsable response");
                    }
                }
            }

            handleSuccess(response);
        } else if (this.readyState === XMLHttpRequest.DONE) {
            if (useDebug) {
                console.log("sendCommand request failed");
            }

            let error = req.responseText;

            if (error) {
                try {
                    let parsed = JSON.parse(error);
    
                    if (parsed && parsed['error']) {
                        error = parsed['error'];
                    } else {
                        error = parsed;
                    }
                } catch (err) {
                    if (useDebug) {
                        console.log("sendCommand unparsable error");
                    }
                }
            }

            if (useDebug) {
                console.log("sendCommand processed error", error);
            }

            handleFail(this.status, error);
        }
    }

    req.send(data);
}

// details generally contains info about the initiator of the failed request
function processRequestFail(useDebug, reqStatus, errMessage, details) {
    if (useDebug) {
        console.log(`The request with details "${details}" failed with status code ${reqStatus} and error message "${errMessage}".`);
    }
}

function openSettings() {
    if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
    } else {
        window.open(chrome.runtime.getURL('options/options.html'));
    }
}
