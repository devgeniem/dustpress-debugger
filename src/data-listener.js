'use strict';
import * as React from 'react';
const { Component } = React;
import ReactJson from 'react-json-view'
import { DEBUGGER_TAB, DEBUGGER, INIT, NEW, EXTEND } from './constants';

export default class DataListener extends Component {

    state = {
        data: {},
    };
    currentHash = null;

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        this.init();
    }

    init() {
        // Create a connection to the background page
        const connection = chrome.runtime.connect( { name: DEBUGGER_TAB } );

        // Handle received messages
        connection.onMessage.addListener( (message) => {
            if ( message.source === DEBUGGER ) {
                if ( message.type === NEW ) {
                    this.newData( message );
                }

                // if ( message.type === EXTEND ) {
                //     this.extendData( message );
                // }
            }
        });

        // Send init message
        const tabId = chrome.devtools.inspectedWindow.tabId;
        connection.postMessage( { type: INIT, tabId } );
    }

    newData( message ) {
        const { hash, ajaxurl } = message.data;

        if ( this.currentHash !== hash ) {
            this.currentHash = hash;
            const body = new FormData();
            body.append( 'action', 'dustpress_debugger' );
            body.append( 'hash', hash );

            const args = {
                method: 'POST',
                body,
                credentials: 'include',
            };

            fetch( ajaxurl, args).then( ( response ) => {
                if ( response.ok ) {
                    return response.json();
                }
            }).then( ( jsonData ) => {
                const parsedData = JSON.parse( jsonData );
                const data       = parsedData.data;
                this.setState((state) => Object.assign({}, state, { data }));
            }).catch( ( err ) => {
                console.error( 'DustPress Debugger Error', err );
            });
        }
    }

    render() {
        const { data } = this.state;
        return <div className="data-listener">
            <ReactJson src={data} collapsed={1} collapseStringsAfterLength={40} />
        </div>;
    }
}
