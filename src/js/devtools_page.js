'use strict';
import 'regenerator-runtime/runtime'; // required by babel
import '../html/devtools_page.html';

browser.devtools.panels.create(
    'dustpress-debugger',
    '',
    'devtools.html'
);
