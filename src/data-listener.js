'use strict';
import * as React from 'react';
const { Component } = React;

export default class DataListener extends Component {

    state = {
        dustpress_debugger: {
            hash: '',
        },
    };

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        this.init();
    }

    init() {
        // DevTools page -- devtools.js
        // Create a connection to the background page
        var backgroundPageConnection = chrome.runtime.connect({
            name: "dustpress-debugger-tab"
        });

        backgroundPageConnection.onMessage.addListener( (message) => {
            // Handle responses from the background page, if any
            console.log('message', message);
        });

        backgroundPageConnection.postMessage({
            name: 'init',
            tabId: chrome.devtools.inspectedWindow.tabId
        });
    }

    render() {
        const { dustpress_debugger } = this.state;
        return <div className="data-listener">
            {dustpress_debugger.hash}
        </div>;
    }
}
