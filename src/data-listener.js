'use strict';
import * as React from 'react';
const { Component } = React;
import ReactJson from 'react-json-view'

export default class DataListener extends Component {

    state = {
        data: {},
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
            console.log( 'message', message );
            if ( typeof message.data !== 'undefined' ) {
                if ( typeof message.key !== 'undefined' ) {
                    this.extendData( message );
                }
                else {
                    this.initData( message );
                }
            }
        });

        backgroundPageConnection.postMessage({
            name: 'init',
            tabId: chrome.devtools.inspectedWindow.tabId
        });
    }

    initData( message ) {
        const parsedData = JSON.parse( message.data );
        const data       = parsedData.data;
        this.setState((state) => Object.assign({}, state, { data }));
    }

    extendData( message ) {
        console.log( 'extendData', message );
    }

    render() {
        const { data } = this.state;
        return <div className="data-listener">
            <ReactJson src={data} />
        </div>;
    }
}
