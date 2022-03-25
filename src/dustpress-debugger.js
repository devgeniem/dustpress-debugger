/**
 * DUSTPRESS DEBUGGER
 */
 window.DustPressDebugger = (function (window, document) {

    var app = {};
    const source = 'dustpress-debugger';

    // Runs the debugger
    app.init = function () {
        const hashEl    = document.getElementsByName('dustpress_debugger:hash');
        const ajaxurlEl = document.getElementsByName('dustpress_debugger:ajaxurl');
        if ( hashEl && ajaxurlEl && hashEl[0] && ajaxurlEl[0] ) {
            const hash = hashEl[0].content;
            const ajaxurl = ajaxurlEl[0].content;
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
            }).then( ( data ) => {
                window.postMessage( { data, source }, '*' );
            }).catch( ( err ) => {
                console.error( 'DustPress Debugger Error', err );
            });
        };
    }

    app.extend = function (data, key) {
        window.postMessage( { data, key, source }, '*' );
    };

    // Run the debugger
    app.init();

    return app;

})(window, document);
