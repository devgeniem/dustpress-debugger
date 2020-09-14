/**
 * DUSTPRESS DEBUGGER
 */
window.DustPressDebugger = ( function( window, document, $ ) {

    var app = {
        jsonSettings: {
            collapsed: true,
            recursive_collapser: false
        },
        extended: 0,
        waiting: {}
    };

    // Runs the debugger
    app.init = function() {
        app.cache();

        // Append the debugger into the DOM
        app.$toggler.appendTo("body");
        app.$container.appendTo("body");
        app.$closeBtn.appendTo(app.$container);
        app.$jsonDiv.appendTo(app.$container);

        // Add listener for the togglers
        app.$toggler.on('click', app.toggleDebugger);
        app.$closeBtn.on('click', app.toggleDebugger);

        // Add a listener for the keyup event
        $(document).keyup(app.closeByEsc);

        // Load the data from via AJAX
        app.loadData();
    };

    // Maps the DOM
    app.cache = function() {
        app.$debugger   = $(".jsonview_data_debug");
        app.$toggler    = $('<button class="jsonview_open_debug">Show debugger</button>');
        app.$closeBtn   = $('<span class="jsonview_close_debug">x</span>');
        app.$container  = $('<div class="jsonview_data_debug jsonview_data_debug_closed"></div>');
        app.$jsonDiv    = $('<div class="jsonview_debug"></div>');
    };

    // Loads the debugger data
    app.loadData = function() {
        $.ajax({
            type: "POST",
            url: dustpress_debugger.ajaxurl,
            data: {
                "action":   "dustpress_debugger",
                "hash" :    dustpress_debugger.hash
            },
            success: function(data) {
                if (typeof data !== "object") {
                    data = JSON.parse(data);
                }
                app.jsonData = data.data;

                if ( "undefined" === typeof app.jsonData.Debugs ) {
                    app.jsonData.Debugs = {};
                }

                app.jsonData.Debugs.Ajax = app.waiting;
                delete app.waiting;

                // Log also into the console
                console.log("Debugger", app.jsonData);

                app.jsonView = app.$jsonDiv.JSONView(
                    app.jsonData,
                    app.jsonSettings
                );
            },
            error: function(e){
                console.error("DustPress Debugger Error", e);
            }
        });
    };

    app.closeByEsc = function(e) {
        // Escape key maps to keycode 27
        if (e.keyCode === 27) {
            if ( ! $(".jsonview_data_debug").hasClass("jsonview_data_debug_closed") ) {
                app.toggleDebugger();
            }
        }
    };

    app.toggleDebugger = function() {
        app.$container.toggleClass("jsonview_data_debug_closed");
        app.$toggler.toggleClass("jsonview_hide");
        $("body").toggleClass("locked");
    };

    app.extend = function(data, key) {
        if (!key) {
            key = "NoKey";
        }

        // Catch the data before the JSONView is rendered
        if ( "undefined" === typeof app.jsonData ) {
            if ( "undefined" === typeof app.waiting[key] ) {
                app.waiting[key] = [];
            }
            app.waiting[key].push(data);
        }
        // Add the extended data and rerender the JSONView
        else {
            if ( "undefined" === typeof app.jsonData.Debugs ) {
                app.jsonData.Debugs = {};
            }

            if ( "undefined" === typeof app.jsonData.Debugs.Ajax ) {
                app.jsonData.Debugs.Ajax = {};
            }

            if ( undefined === app.jsonData.Debugs.Ajax[key] ) {
                app.jsonData.Debugs.Ajax[key] = [];
            }

            app.jsonData.Debugs.Ajax[key].push(data);

            app.$jsonDiv.JSONView(
                app.jsonData,
                app.jsonSettings
            );
        }
    };

    // Run the debugger
    $(document).ready( app.init );

    return app;

})( window, document, jQuery );
