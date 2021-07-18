function getWalletBaseUrl(rpcUser, rpcPass, rpcPort) {
    return `http://${rpcUser}:${rpcPass}@127.0.0.1:${rpcPort}/`;
}

function getIpfsBaseUrl(ipfsPort) {
    return `http://127.0.0.1:${ipfsPort}/ipfs/`;
}

function domainNotFound(domainName) {
    console.log(`Alterdot domain ${domainName} not found.`);
    // TODO_ADOT_MEDIUM redirect to "domain not found" IPFS page
}

function serverResolveDomain(domainName, handleSuccess, handleFail) {
    let req = new XMLHttpRequest();
    let url = `https://explorer.alterdot.network/api/resolvedomain?name=${domainName}`;

    req.open("GET", url, true);
    req.onreadystatechange = function () {
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            let response = req.responseText;

            if (response) {
                console.log(response);

                if (response == "Blockchain domain name not found!") {
                    domainNotFound(domainName);
                } else {
                    handleSuccess(response);
                }
            }
        } else if (this.readyState === XMLHttpRequest.DONE) {
            handleFail("explorer.alterdot.network", "resolvedomain", this.status);
        }
    }

    req.send();
}

function sendCommand(url, command, params, handleSuccess, handleFail) {
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
            console.log("sendCommand request successful");
            let response = JSON.parse(req.responseText);

            if (response && response['result']) {
                console.log(response['result']);

                handleSuccess(response['result']);
            }
        } else if (this.readyState === XMLHttpRequest.DONE) {
            console.log("sendCommand request failed");
            console.log(req.responseText);

            handleFail(command);
        }
    }

    req.send(data);
}

function sendCommandFailed(command, originMethod) {
    console.log(`The ${command} command called from ${originMethod} failed unexepectedly. Report this occurrence to the developers.`);
}

function serverRequestFailed(serverAddress, request, statusCode, originMethod) {
    console.log(`The ${request} request to ${serverAddress} called from ${originMethod} failed with status code ${statusCode}. Report this occurrence to the developers.`);
}
