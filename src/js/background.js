'use strict';
import 'regenerator-runtime/runtime'; // required by babel
import { BROWSER_CHROME, MESSAGE_NEW, MESSAGE_REQUEST_COOKIE, MESSAGE_REQUEST_SCRIPTING, MESSAGE_INIT, BACKGROUND } from './lib/constants';

class Background {

    // Stored connections between content scripts & devtools pages
    connections = {};

    /**
     * Send update event to debugger on tab update
     *
     * @param {Object} tab Tab details.
     * @param {Object} changeInfo Change details.
     */
    onTabUpdate(tab, changeInfo) {
        const { id } = tab;
        if (changeInfo.status == 'complete' && id in this.connections) {
            this.sendInitData(tab);
        }
    }

    /**
     * Request browser for scripting access to tab
     */
     async requestScriptingPermission(tab) {
        await browser.permissions.request({
            origins: [tab.url],
            permissions: ['scripting']
        });
        this.sendInitData(tab);
    }

    /**
     * Request browser for cookie access to ajaxurl
     */
     async requestCookiePermission(ajaxurl, tab) {
        const hasCookiePermission = await browser.permissions.request({
            origins: [ajaxurl],
            permissions: ['cookies']
        });

        // If succesful send notification to debugger
        if ( hasCookiePermission ) {
            this.connections[tab.id].postMessage({
                hasCookiePermission,
                type: MESSAGE_REQUEST_COOKIE,
                source: BACKGROUND
            });
        }
    }

    /**
     * Inject content scripts to page
     *
     * @param {Object} tab Current tab object.
     */
    injectScripts(tab) {
        if ( BROWSER_TARGET === BROWSER_CHROME ) {
            browser.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content_script.js'],
            });
            browser.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content_script_override.js'],
                // Execute in page context to override/create window.DustPressDebugger
                // and get hash & ajaxurl variables
                // https://developer.chrome.com/docs/extensions/reference/scripting/#type-ExecutionWorld
                world: 'MAIN'
            });
        }
        else {
            browser.tabs.executeScript(
                tab.id,
                { file: 'content_script.js' }
            );
            browser.tabs.executeScript(
                tab.id,
                { file: 'content_script_override.js' }
            );
        }
    }

    /**
     * Send tab data to debugger on init.
     *
     * @param {Object} tab Tab details.
     */
    async sendInitData(tab) {
        const { url, id } = tab;

        // Check scripting access & if active inject script
        let hasScriptingPermission = true;
        if (BROWSER_TARGET === BROWSER_CHROME) {
            hasScriptingPermission = await browser.permissions.contains({
                origins: [tab.url],
                permissions: ['scripting']
            });
        }

        // Also inject content scripts if extension already has access
        if (hasScriptingPermission) {
            this.injectScripts(tab);
        }

        this.connections[id].postMessage({
            tab: {
                url,
                id
            },
            hasScriptingPermission,
            type: MESSAGE_INIT,
            source: BACKGROUND
        });
    }

    /**
     * Listen for messages from devtools
     *
     * @see https://developer.chrome.com/docs/extensions/mv2/devtools/#content-script-to-devtools
     * @param {Object} message Received message.
     * @param {MessageSender} sender Sender data.
     * @param {Function} sendResponse Function to send response.
     * @param {Port} port Port object.
     */
    extensionListener(message, sender, sendResponse, port) {

        // The original connection event doesn't include the tab ID of the
        // DevTools page, so we need to send it explicitly.
        if (message.type === MESSAGE_INIT) {
            this.connections[message.tabId] = port;

            // Send current tab details to devtools
            browser.tabs.query({ currentWindow: true, active: true }).then((tabs) => {
                const tab = tabs[0];
                this.sendInitData(tab);
            });
        }
        else if ( message.type === MESSAGE_REQUEST_SCRIPTING ) {
            this.requestScriptingPermission( message.tab );
        }
        else if ( message.type === MESSAGE_REQUEST_COOKIE ) {
            this.requestCookiePermission( message.ajaxurl, message.tab );
        }
    }

    /**
     * Listen for new connections
     *
     * @see https://developer.chrome.com/docs/extensions/mv2/devtools/#content-script-to-devtools
     * @param {Port} port Port object.
     */
    connectionListener(port) {
        const extensionListener = (message, sender, sendResponse) => this.extensionListener(message, sender, sendResponse, port);

        // Listen to messages sent from the DevTools page
        port.onMessage.addListener(extensionListener);

        // Remove stored connection on disconnect
        port.onDisconnect.addListener((port) => {
            port.onMessage.removeListener(extensionListener);

            const tabs = Object.keys(this.connections);
            for (let i = 0, len = tabs.length; i < len; i++) {
                if (this.connections[tabs[i]] === port) {
                    delete this.connections[tabs[i]]
                    break;
                }
            }
        });
    }

    /**
     * Relay messages from content script to devtools
     *
     * @see https://developer.chrome.com/docs/extensions/mv2/devtools/#content-script-to-devtools
     * @param {Object} request Received message.
     * @param {MessageSender} sender Sender data.
     * @param {Function} sendResponse Function to send response.
     */
    async relayMessageListener(request, sender, sendResponse) {

        // Messages from content scripts should have sender.tab set
        if (sender.tab) {
            const tabId = sender.tab.id;

            if (tabId in this.connections) {

                // Extend new hash & ajaxurl data with cookie permission data to ajaxurl
                if ( request.type === MESSAGE_NEW ) {
                    const hasCookiePermission = await browser.permissions.contains({
                        origins: [request.data.ajaxurl],
                        permissions: ['cookies']
                    });
                    request.data.hasCookiePermission = hasCookiePermission;
                }
                this.connections[tabId].postMessage(request);
            } else {
                console.warn("Tab not found in connection list, reopen developer tools.");
            }
        } else {
            console.warn("sender.tab not defined.");
        }

        return true;
    }

    constructor() {

        // Add tab update listener in case url changes
        browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => this.onTabUpdate(tab, changeInfo));

        // Add connection listener
        browser.runtime.onConnect.addListener((port) => this.connectionListener(port));

        // Receive message from content script and relay to the devTools page for the current tab
        browser.runtime.onMessage.addListener((request, sender, sendResponse) => this.relayMessageListener(request, sender, sendResponse));
    }
}

export default new Background();

