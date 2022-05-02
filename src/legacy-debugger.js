// Remove old debugger functionality and cancel any possible ongoing requests from it
if (
    typeof window.DustPressDebugger !== 'undefined' &&
    typeof window.jQuery !== 'undefined'
) {
    const $ = window.jQuery;

    // Remove old debugger init handler & clear any of its relevant functions and data
    $( document ).off( 'ready', $( document ), window.DustPressDebugger.init );
    window.DustPressDebugger.init = () => {};
    window.DustPressDebugger.cache = () => {};
    window.DustPressDebugger.loadData = () => {};
    window.DustPressDebugger.$jsonDiv = $();

    // Remove old debugger & its button
    $('.jsonview_data_debug').remove();
    $('.jsonview_open_debug').remove();
}
