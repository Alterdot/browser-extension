function minimizeToolbar() {
    chrome.storage.sync.set({ "toolbarState": "minimized" });
    setMinimizedStyles();
}

function setMinimizedStyles() {
    setTimeout(function () {
        document.getElementById("maximized").style.display = "none";
        document.getElementById("minimized").style.display = "flex";
    }, 20);
}

function maximizeToolbar() {
    chrome.storage.sync.set({ "toolbarState": "maximized" });
    setMaximizedStyles();
}

function setMaximizedStyles() {
    setTimeout(function () {
        document.getElementById("minimized").style.display = "none";
        document.getElementById("maximized").style.display = "flex";
    }, 20);
}

function updateToolbar(newState) {
    switch (newState) {
        case "minimized":
            minimizeToolbar();
            break;
        case "maximized":
            maximizeToolbar();
            break;
        default:
            break;
    }
}

function init() {
    chrome.storage.sync.get("toolbarState", function(result) {
        if (result && "toolbarState" in result) {
            updateToolbar(result["toolbarState"]);
        }
    });
    
    chrome.storage.onChanged.addListener(function(changes, area) {
        if (area == "sync" && "toolbarState" in changes) {
            updateToolbar(changes["toolbarState"].newValue);
        }
    });

    document.addEventListener('DOMContentLoaded', function () {
        let toolbarMinimize = document.getElementById("trigger-minimize");
        let toolbarMaximize = document.getElementById("trigger-maximize");
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

                    chrome.runtime.sendMessage({ resolveDomain: domain });
                }
            });
        }
    });
}

init();
