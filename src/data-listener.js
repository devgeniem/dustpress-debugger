'use strict';
import * as React from 'react';
const { Component } = React;
import ReactJson from 'react-json-view'
import { DEBUGGER_TAB, DEBUGGER, INIT, NEW, EXTEND } from './constants';

export default class DataListener extends Component {

    state = {
        data: {},
        hash: null,
        ajaxurl: null,
        hasDataAccess: null,
        hasCookieAccess: null,
        tab: null,
    };
    waiting = {};
    currentHash = null;

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        this.init();
        this.setTab();
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status == 'loading' && tab.active) {
                this.checkScriptingPermission(this.state.tab);
            }
        })
    }

    async setTab() {
        chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
            const tab = tabs[0];
            this.setState((state) => Object.assign({}, state, { tab }));
            this.checkScriptingPermission(tab);
        });
    }

    injectScripts(tab) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content_script.js'],
        });
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['dustpress_debugger.js'],
            // Execute in page context to override/create window.DustPressDebugger
            // and get hash & ajaxurl variables
            // https://developer.chrome.com/docs/extensions/reference/scripting/#type-ExecutionWorld
            world: 'MAIN'
        });
    }

    updateDataAccess(hasDataAccess, tab) {
        this.setState((state) => Object.assign({}, state, { hasDataAccess }));
        if (hasDataAccess) {
            this.injectScripts(tab);
        }
    }

    checkScriptingPermission(tab) {
        chrome.permissions.contains({
            origins: [tab.url],
            permissions: ['scripting']
        }).then((hasDataAccess) => this.updateDataAccess(hasDataAccess, tab));
    }

    requestScriptingAccess(e) {
        e.preventDefault();
        const { tab } = this.state;
        chrome.permissions.request({
            origins: [tab.url],
            permissions: ['scripting']
        }).then((hasDataAccess) => this.updateDataAccess(hasDataAccess, tab));
    }

    async checkCookiePermission(url) {
        const hasCookieAccess = await chrome.permissions.contains({
            origins: [url],
            permissions: ['cookies']
        });
        this.setState((state) => Object.assign({}, state, { hasCookieAccess }));

        return hasCookieAccess;
    }

    requestCookieAccess(e) {
        e.preventDefault();
        const { hash, ajaxurl } = this.state;
        chrome.permissions.request({
            origins: [ajaxurl],
            permissions: ['cookies']
        }).then((hasCookieAccess) => {
            if (hasCookieAccess) {
                this.setState((state) => Object.assign({}, state, { hasCookieAccess }));
                this.requestData(hash, ajaxurl);
            }
        });
    }

    init() {
        // Create a connection to the background page
        const connection = chrome.runtime.connect({ name: DEBUGGER_TAB });

        // Handle received messages
        connection.onMessage.addListener((message) => {
            if (message.source === DEBUGGER) {
                if (message.type === NEW) {
                    this.newData(message);
                }

                if (message.type === EXTEND) {
                    this.extendData(message);
                }
            }
        });

        // Send init message
        const tabId = chrome.devtools.inspectedWindow.tabId;
        connection.postMessage({ type: INIT, tabId });
    }

    async newData(message) {
        const { hash, ajaxurl } = message.data;
        if (this.currentHash !== hash) {
            this.currentHash = hash;
            this.setState((state) => Object.assign({}, state, { hash, ajaxurl }));
            const hasCookieAccess = await this.checkCookiePermission(ajaxurl);
            if (hasCookieAccess) {
                this.requestData(hash, ajaxurl);
            }
        }
    }

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

    extendData(message) {
        const { data } = this.state;
        const newData = message.data.data;
        const key = message.data.key;

        if (!key) {
            key = 'NoKey';
        }

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
        const { data, hasDataAccess, hasCookieAccess, tab, hash, ajaxurl } = this.state;
        return <div className="data-listener">
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
                {hasDataAccess ?
                    <span>Scripting access ok</span>
                    :
                    <button
                        disabled={
                            hasDataAccess === null
                        }
                        onClick={
                            (e) => this.requestScriptingAccess(e)
                        }
                    >Request scripting access</button>
                }
            </p>

            <p>
                {hasCookieAccess ?
                    <span>Cookie access ok</span>
                    :
                    <button
                        disabled={
                            hasCookieAccess === null ||
                            hasDataAccess === null ||
                            hasDataAccess === false
                        }
                        onClick={
                            (e) => this.requestCookieAccess(e)
                        }
                    >Request cookie access</button>
                }
            </p>
        </div>;
    }
}
