'use strict';
import * as React from 'react';
const { Component } = React;
import ReactJson from 'react-json-view'
import { DEBUGGER_TAB, DEBUGGER, MESSAGE_INIT, MESSAGE_NEW, MESSAGE_EXTEND, MESSAGE_FAIL } from '../lib/constants';

export default class Debugger extends Component {

    state = {
        data: {}, // currently stored debugger data
        hash: null, // current debugger hash
        ajaxurl: null, // site ajaxurl
        hasScriptingPermission: null, // check if extension has scripting access
        hasCookiePermission: null, // check if extension has cookie access
        tab: null, // currently open tab
        noData: false,
    };
    waiting = {}; // json data to be added to debugger data

    constructor(props) {
        super(props);
    }

    /**
     * Initialize plugin
     */
    componentDidMount() {
        this.init();
        this.setTab();
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if ( changeInfo.status == 'complete' && tabId === chrome.devtools.inspectedWindow.tabId ) {

                // Reset & recheck state on tab update
                this.waiting = {};
                this.setState((state) => Object.assign({}, state, {
                    hasScriptingPermission: null,
                    hasCookiePermission: null,
                    noData: false,
                    ajaxurl: null,
                    hash: null,
                    tab,
                }));

                this.checkScriptingPermission(tab);
            }
        })
    }

    /**
     * Set current tab & check permissions
     */
    async setTab() {
        chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
            const tab = tabs[0];
            this.setState((state) => Object.assign({}, state, { tab }));
            this.checkScriptingPermission(tab);
        });
    }

    /**
     * Inject content scripts to page
     *
     * @param {Object} tab Current tab object. 
     */
    injectScripts(tab) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content_script.js'],
        });
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content_script_override.js'],
            // Execute in page context to override/create window.DustPressDebugger
            // and get hash & ajaxurl variables
            // https://developer.chrome.com/docs/extensions/reference/scripting/#type-ExecutionWorld
            world: 'MAIN'
        });
    }

    /**
     * Update data permission setting
     *
     * @param {*} hasScriptingPermission True|false|null depending on scripting access state.
     * @param {Object} tab Current tab object.
     */
    updateScriptingPermission(hasScriptingPermission, tab) {
        this.setState((state) => Object.assign({}, state, { hasScriptingPermission }));
        if (hasScriptingPermission) {
            this.injectScripts(tab);
        }
    }

    /**
     * Check tab for scripting access
     *
     * @param {String} url Url to check.
     * @returns {Boolean} Whether extension has cookie access or not after request.
     */
    checkScriptingPermission(tab) {
        chrome.permissions.contains({
            origins: [tab.url],
            permissions: ['scripting']
        }).then((hasScriptingPermission) => this.updateScriptingPermission(hasScriptingPermission, tab));
    }

    /**
     * Request browser for scripting access to tab
     *
     * @param {Object} e Request button click event.
     */
    requestScriptingPermission(e) {
        e.preventDefault();
        const { tab } = this.state;
        chrome.permissions.request({
            origins: [tab.url],
            permissions: ['scripting']
        }).then((hasScriptingPermission) => this.updateScriptingPermission(hasScriptingPermission, tab));
    }

    /**
     * Check url for cookie access
     *
     * @param {String} url Url to check.
     * @returns {Boolean} Whether extension has cookie access or not after request.
     */
    async checkCookiePermission(url) {
        const hasCookiePermission = await chrome.permissions.contains({
            origins: [url],
            permissions: ['cookies']
        });
        this.setState((state) => Object.assign({}, state, { hasCookiePermission }));

        return hasCookiePermission;
    }

    /**
     * Request browser for cookie access to ajaxurl
     *
     * @param {Object} e Request button click event.
     */
    requestCookiePermission(e) {
        e.preventDefault();
        const { hash, ajaxurl } = this.state;

        chrome.permissions.request({
            origins: [ajaxurl],
            permissions: ['cookies']
        }).then((hasCookiePermission) => {
            if (hasCookiePermission) {
                this.setState((state) => Object.assign({}, state, { hasCookiePermission }));
                this.requestData(hash, ajaxurl);
            }
        });
    }

    /**
     * Init content script connection
     */
    init() {
        // Create a connection to the background page
        const connection = chrome.runtime.connect({ name: DEBUGGER_TAB });

        // Handle received messages
        connection.onMessage.addListener((message) => {
            if (message.source === DEBUGGER) {
                if (message.type === MESSAGE_NEW) {
                    this.newData(message);
                }

                if (message.type === MESSAGE_EXTEND) {
                    this.extendData(message);
                }

                if (message.type === MESSAGE_FAIL) {
                    this.noData();
                }
            }
        });

        // Send init message
        const tabId = chrome.devtools.inspectedWindow.tabId;
        connection.postMessage({ type: MESSAGE_INIT, tabId });
    }

    /**
     * Handle new hash & ajaxurl data from content script.
     * 
     * @param {Object} message New data. 
     */
    async newData(message) {
        const currentHash = this.state.hash;
        const { hash, ajaxurl } = message.data;

        // Update data on new hash
        if (currentHash !== hash) {
            this.setState((state) => Object.assign({}, state, { hash, ajaxurl }));
            const hasCookiePermission = await this.checkCookiePermission(ajaxurl);

            if (hasCookiePermission) {
                this.requestData(hash, ajaxurl);
            }
        }
    }

    /**
     * Triggered if no hash & ajaxurl found on current page
     */
    noData() {
        const noData = true;
        this.setState((state) => Object.assign({}, state, { noData }));
    }

    /**
     * Request debugger data
     *
     * @param {String} hash Current tab hash. 
     * @param {String} ajaxurl Current tab ajaxurl.
     */
    requestData(hash, ajaxurl) {
        const body = new FormData();
        body.append('action', 'dustpress_debugger');
        body.append('hash', hash);

        const args = {
            method: 'POST',
            body,
            credentials: 'include',
        };

        fetch(ajaxurl, args).then((response) => {
            if (response.ok) {
                return response.json();
            }
        }).then((jsonData) => {
            const parsedData = typeof jsonData !== 'object' ? JSON.parse(jsonData) : jsonData;
            const data = parsedData.data;

            if ('undefined' === typeof data.Debugs) {
                data.Debugs = {};
            }

            data.Debugs.Ajax = this.waiting;
            this.waiting = {};

            this.setState((state) => Object.assign({}, state, { data }));
        }).catch((err) => {
            console.error('DustPress Debugger Error', err);
        });
    }

    /**
     * Extend current data.
     *
     * @param {Object} message Message object containing data to add. 
     */
    extendData(message) {
        const { data } = this.state;
        const newData = message.data.data;
        const key = message.data.key || 'NoKey';

        // Catch the data before the view is rendered
        if ('undefined' === typeof data) {
            if ('undefined' === typeof this.waiting[key]) {
                this.waiting[key] = [];
            }
            this.waiting[key].push(newData);
        }
        // Add the extended data and rerender the view
        else {
            if ('undefined' === typeof data.Debugs) {
                data.Debugs = {};
            }

            if ('undefined' === typeof data.Debugs.Ajax) {
                data.Debugs.Ajax = {};
            }

            if (undefined === data.Debugs.Ajax[key]) {
                data.Debugs.Ajax[key] = [];
            }

            data.Debugs.Ajax[key].push(newData);

            this.setState((state) => Object.assign({}, state, { data }));
        }
    }

    render() {
        const { data, hasScriptingPermission, hasCookiePermission, tab, hash, ajaxurl, noData } = this.state;

        return <div className="debugger">
            <ReactJson src={data} theme={'monokai'} collapsed={1} collapseStringsAfterLength={40} />
            <hr />
            <table>
                <tbody>
                    <tr>
                        <td>url:</td>
                        <td>{tab ? tab.url : ''}</td>
                    </tr>
                    <tr>
                        <td>hash:</td>
                        <td>{hash}</td>
                    </tr>
                    <tr>
                        <td>ajaxurl:</td>
                        <td>{ajaxurl}</td>
                    </tr>
                </tbody>
            </table>

            <p>
                {hasScriptingPermission ?
                    <span>Scripting access ok</span>
                    :
                    <button
                        disabled={
                            hasScriptingPermission === null
                        }
                        onClick={
                            (e) => this.requestScriptingPermission(e)
                        }
                    >Request scripting access</button>
                }
            </p>

            <p>
                {hasCookiePermission ?
                    <span>Cookie access ok</span>
                    :
                    noData ?
                        <div>
                            <p>Hash & ajaxurl not found on page!</p>
                            <p>Check that you are logged in and dustpress debugger is enabled.</p>
                        </div>
                        :
                        <button
                            disabled={
                                hasCookiePermission === null ||
                                hasScriptingPermission === null ||
                                hasScriptingPermission === false
                            }
                            onClick={
                                (e) => this.requestCookiePermission(e)
                            }
                        >Request cookie access</button>
                }
            </p>
        </div>
    }
}
