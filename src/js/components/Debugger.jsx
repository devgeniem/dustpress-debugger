'use strict';
import * as React from 'react';
const { Component, Fragment } = React;
import ReactJson from 'react-json-view'
import { MESSAGE_REQUEST_COOKIE, MESSAGE_REQUEST_SCRIPTING, DEBUGGER_TAB, DEBUGGER, MESSAGE_INIT, MESSAGE_NEW, MESSAGE_EXTEND, MESSAGE_FAIL, BACKGROUND } from '../lib/constants';

export default class Debugger extends Component {

    state = {
        data: {}, // currently stored debugger data
        hash: null, // current debugger hash
        ajaxurl: null, // site ajaxurl
        hasScriptingPermission: null, // check if extension has scripting access
        hasCookiePermission: null, // check if extension has cookie access
        tab: null, // currently open tab
        noData: false, // if current page works but has no dustpress_debugger data
        updating: false, // whether we are currently fetching new data
    };
    waiting = {}; // json data to be added to debugger data
    connection = null; // background.js connection

    constructor(props) {
        super(props);
    }

    /**
     * Initialize component
     */
    componentDidMount() {
        this.init();
    }

    /**
     * Request browser for scripting access to tab
     *
     * @param {Object} e Request button click event.
     */
    requestScriptingPermission(e) {
        e.preventDefault();
        const { tab } = this.state;
        this.connection.postMessage({ type: MESSAGE_REQUEST_SCRIPTING, tab });
    }

    /**
     * Request browser for cookie access to ajaxurl
     *
     * @param {Object} e Request button click event.
     */
    requestCookiePermission(e) {
        e.preventDefault();
        const { ajaxurl, tab } = this.state;
        this.connection.postMessage({ type: MESSAGE_REQUEST_COOKIE, ajaxurl, tab });
    }

    /**
     * Init content script connection
     */
    init() {
        // Create a connection to the background page
        this.connection = browser.runtime.connect({ name: DEBUGGER_TAB });

        // Handle received messages
        this.connection.onMessage.addListener((message) => {
            if (message.source === DEBUGGER) {
                if (message.type === MESSAGE_NEW) {
                    this.newData(message);
                }
                else if (message.type === MESSAGE_EXTEND) {
                    this.extendData(message);
                }
                else if (message.type === MESSAGE_FAIL) {
                    this.noData();
                }
            }
            else if (message.source === BACKGROUND) {
                if (message.type === MESSAGE_INIT) {
                    this.initData(message);
                }
                else if (message.type === MESSAGE_REQUEST_COOKIE) {
                    this.setCookiePermission(message);
                }
            }
        });

        // Send init message
        const tabId = browser.devtools.inspectedWindow.tabId;
        this.connection.postMessage({ type: MESSAGE_INIT, tabId });
    }

    /**
     * Handle init connection message from background page
     *
     * @param {Object} message Connection data.
     */
    initData(message) {
        const { tab, hasScriptingPermission } = message;
        this.setState((state) => Object.assign({}, state, {
            tab,
            hasScriptingPermission,
            hash: null,
            ajaxurl: null,
            hasCookiePermission: null,
            noData: false,
        }));
    }

    /**
     * Handle cookie permission data & request data if access to cookies granted
     *
     * @param {Object} message Permission & data request details.
     */
    setCookiePermission(message) {
        const { hash, ajaxurl } = this.state;
        const { hasCookiePermission } = message;
        this.setState((state) => Object.assign({}, state, { hasCookiePermission }));
        if ( hasCookiePermission ) {
            this.requestData(hash, ajaxurl);
        }
    }

    /**
     * Handle new hash & ajaxurl data from content script.
     * 
     * @param {Object} message New data.
     */
    async newData(message) {
        const currentHash = this.state.hash;
        const { hash, ajaxurl, hasCookiePermission } = message.data;

        // Update data on new hash
        if (currentHash !== hash) {
            this.setState((state) => Object.assign({}, state, { hash, ajaxurl, hasCookiePermission }));
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

        this.setState((state) => Object.assign({}, state, { updating: true }));
        fetch(ajaxurl, args).then((response) => {
            if (response.ok) {
                return response.json();
            }
        }).then((jsonData) => {
            const parsedData = typeof jsonData !== 'object' ? JSON.parse(jsonData) : jsonData;
            const data = parsedData.data || {};
            if ( data.length ) {
                if ('undefined' === typeof data.Debugs) {
                    data.Debugs = {};
                }
    
                data.Debugs.Ajax = this.waiting;
                this.waiting = {};
            }

            this.setState((state) => Object.assign({}, state, { data }));
        }).catch((err) => {
            console.error('DustPress Debugger Error', err);
        }).finally( () => {
            this.setState((state) => Object.assign({}, state, { updating: false }));
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
        const { updating, data, hasScriptingPermission, hasCookiePermission, tab, hash, ajaxurl, noData } = this.state;

        const debuggerClasses = [ 'debugger' ];
        if ( updating ) {
            debuggerClasses.push( 'updating' );
        }
        return <div className={debuggerClasses.join(' ')}>
            <ReactJson src={data} theme={'monokai'} collapsed={1} collapseStringsAfterLength={40} />
            <hr />
            <table className="debugger__meta-data">
                <tbody>
                    <tr>
                        <td>url:</td>
                        <td><input type="text" readOnly value={tab ? tab.url : ''}/></td>
                    </tr>
                    <tr>
                        <td>hash:</td>
                        <td><input type="text" readOnly value={hash || ''}/></td>
                    </tr>
                    <tr>
                        <td>ajaxurl:</td>
                        <td><input type="text" readOnly value={ajaxurl || ''}/></td>
                    </tr>
                </tbody>
            </table>

            { hasScriptingPermission === false && hasScriptingPermission !== null &&
                <p>
                    <button
                        onClick={
                            (e) => this.requestScriptingPermission(e)
                        }
                    >Request scripting access</button>
                </p>
            }

            { noData ?
                <Fragment>
                    <p>Hash & ajaxurl not found on page!</p>
                    <p>Check that you are logged in and dustpress-debugger is enabled.</p>
                </Fragment>
                :
                hasCookiePermission === false && hasCookiePermission !== null &&
                    <p>
                        <button
                            onClick={
                                (e) => this.requestCookiePermission(e)
                            }
                        >Request cookie access</button>
                    </p>
            }
        </div>
    }
}
