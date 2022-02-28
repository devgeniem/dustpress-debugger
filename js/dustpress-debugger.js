/**
 * DUSTPRESS DEBUGGER
 */
window.DustPressDebugger = (function (window, document, $) {

    var app = {};

    // Runs the debugger
    app.init = function () {
        setInterval(() => {
            window.postMessage({
                dustpress_debugger: dustpress_debugger,
                source: 'dustpress-debugger'
            }, '*');
        }, 500);
    };

    app.extend = function (data, key) {
        window.postMessage({
            data: data,
            key: key,
            source: 'dustpress-debugger'
        }, '*');
    };

    // Run the debugger
    $(document).ready(app.init);

    return app;

})(window, document, jQuery);
