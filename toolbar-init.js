function minimizeToolbar() {
    let frame = document.querySelector("#alterdot-toolbar-qa2r");
    frame.style.height = "20px";
    frame.style.width = "28px";
}

function maximizeToolbar() {
    let frame = document.querySelector("#alterdot-toolbar-qa2r");
    frame.style.height = "36px";
    frame.style.width = "270px";
}

function hideToolbar() {
    let frame = document.querySelector("#alterdot-toolbar-qa2r");
    frame.style.display = "none";
}

function showToolbar() {
    let frame = document.querySelector("#alterdot-toolbar-qa2r");
    frame.style.display = "block";
}

function init() {
    var iframe = document.createElement("iframe");
    iframe.src = chrome.extension.getURL('toolbar.html');
    iframe.id = "alterdot-toolbar-qa2r";
    
    document.body.append(iframe);
    hideToolbar();

    chrome.storage.sync.get("toolbarVisible", function(result) {
        if (result && "toolbarVisible" in result) {
            if (result["toolbarVisible"] === true) {
                showToolbar();
            } else {
                hideToolbar();
            }
        }
    });
    
    chrome.storage.onChanged.addListener(function(changes, area) {
        if (area == "sync" && "toolbarVisible" in changes) {
            changes["toolbarVisible"].newValue ? showToolbar() : hideToolbar();
        }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendReponse) => {
        console.log("toolbar-init: received request ", request);
    
        if (request) {
            if (request.msg == "minimize-toolbar") {
                minimizeToolbar();
            } else if (request.msg == "maximize-toolbar") {
                maximizeToolbar();
            } else if (request.msg == "hide-toolbar") {
                console.log("boss");
                hideToolbar();
            } else if (request.msg == "show-toolbar") {
                showToolbar();
            }
    
            sendReponse({ "success": true });
        }
    });
}

init();
