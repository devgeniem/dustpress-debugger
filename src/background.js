import { INIT } from './constants';

// Background page -- background.js
var connections = {};

chrome.runtime.onConnect.addListener(function (port) {

    const extensionListener = function (message, sender, sendResponse) {

        // The original connection event doesn't include the tab ID of the
        // DevTools page, so we need to send it explicitly.
        if (message.type == INIT) {
            connections[message.tabId] = port;
            return;
        }

        // other message handling
    }

    // Listen to messages sent from the DevTools page
    port.onMessage.addListener(extensionListener);

    port.onDisconnect.addListener(function (port) {
        port.onMessage.removeListener(extensionListener);

        const tabs = Object.keys(connections);
        for (const i = 0, len = tabs.length; i < len; i++) {
            if (connections[tabs[i]] == port) {
                delete connections[tabs[i]]
                break;
            }
        }
    });
});

// Receive message from content script and relay to the devTools page for the
// current tab
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    // Messages from content scripts should have sender.tab set
    if (sender.tab) {
        const tabId = sender.tab.id;
        if (tabId in connections) {
            connections[tabId].postMessage(request);
        } else {
            console.warn("Tab not found in connection list, reopen developer tools.");
        }
    } else {
        console.warn("sender.tab not defined.");
    }
    return true;
});
