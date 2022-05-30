'use strict';
import { BROWSER_CHROME } from './constants';

// Remove old debugger functionality and cancel any possible ongoing requests from it
const windowObj = BROWSER_TARGET === BROWSER_CHROME ? window : window.wrappedJSObject;
if (
    typeof windowObj.DustPressDebugger !== 'undefined' &&
    typeof windowObj.jQuery !== 'undefined'
) {
    const $ = windowObj.jQuery;

    // Remove old debugger init handler & clear any of its relevant functions and data
    $( document ).off( 'ready', $( document ), windowObj.DustPressDebugger.init );
    windowObj.DustPressDebugger.init = () => {};
    windowObj.DustPressDebugger.cache = () => {};
    windowObj.DustPressDebugger.loadData = () => {};
    windowObj.DustPressDebugger.$jsonDiv = $();

    // Remove old debugger & its button
    $('.jsonview_data_debug').remove();
    $('.jsonview_open_debug').remove();
}
