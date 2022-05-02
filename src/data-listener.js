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
    currentHash = null;

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        this.init();
        this.setTab();
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if ( changeInfo.status == 'complete' && tab.active ) {
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

    checkScriptingPermission(tab) {
        chrome.permissions.contains({
            origins: [tab.url],
            permissions: ['scripting']
        }).then((hasDataAccess) => {
            this.setState((state) => Object.assign({}, state, { hasDataAccess }));
            if ( hasDataAccess ) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content_script.js']
                });
            }
        });
    }

    async checkCookiePermission(url) {
        const hasCookieAccess = await chrome.permissions.contains({
            origins: [url],
            permissions: ['cookies']
        });
        this.setState((state) => Object.assign({}, state, { hasCookieAccess }));

        return hasCookieAccess;
    }

    requestScriptingAccess(e) {
        e.preventDefault();
        const { tab } = this.state;
        chrome.permissions.request({
            origins: [tab.url],
            permissions: ['scripting']
        }).then((hasDataAccess) => {
            if (hasDataAccess) {
                this.setState((state) => Object.assign({}, state, { hasDataAccess }));
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content_script.js']
                });
            }
        });
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
                this.requestData( hash, ajaxurl );
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

                // if ( message.type === EXTEND ) {
                //     this.extendData( message );
                // }
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
            if ( hasCookieAccess ) {
                this.requestData( hash, ajaxurl );
            }
        }
    }

    requestData( hash, ajaxurl ) {
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
            const parsedData = JSON.parse(jsonData);
            const data = parsedData.data;
            this.setState((state) => Object.assign({}, state, { data }));
        }).catch((err) => {
            console.error('DustPress Debugger Error', err);
        });
    }

    render() {
        const { data, hasDataAccess, hasCookieAccess, tab, hash, ajaxurl } = this.state;
        return <div className="data-listener">
            <table>
                <tbody>
                    <tr>
                        <td>url:</td>
                        <td>{tab ? tab.url : ''}</td>
                        <td>
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
                        </td>
                    </tr>
                    <tr>
                        <td>hash:</td>
                        <td>{hash}</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>ajaxurl:</td>
                        <td>{ajaxurl}</td>
                        <td>
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
                        </td>
                    </tr>
                </tbody>
            </table>
            <ReactJson src={data} collapsed={1} collapseStringsAfterLength={40} />
        </div>;
    }
}
