![geniem-github-banner](https://cloud.githubusercontent.com/assets/5691777/14319886/9ae46166-fc1b-11e5-9630-d60aa3dc4f9e.png)
# DustPress Plugin: DustPress Debugger

DustPress Debugger is a WordPress plugin which displays the data loaded by your current DustPress model in a json viewer.

- Contributors: devgeniem / Nomafin, villesiltala
- Plugin url: https://github.com/devgeniem/dustpress-debugger
- Tags: dustpress, wordpress, plugins, dustjs, dust.js
- Requires at least: 4.2.0
- Tested up to: 4.5.2
- License: GPL-3.0
- License URI: http://www.gnu.org/licenses/gpl-3.0.html

## Installation

### Composer
Install with composer by running:

```
$ composer require devgeniem/dustpress-debugger
```

OR add it into your `composer.json`:

```json
{
  "require": {
    "devgeniem/dustpress-debugger": "*"
  }
}
```

### Manually

- Clone the DustPress Debugger repository into you WordPress plugins directory.

### Activation

To enable the debugger go to the WordPress dashboard and activate the plugin. After activation users with with the `manage_options` capability can enable the debugger on the user profile page by checking the `DustPress Debugger enabled` checkbox.

## Usage

The debugger prints out a toggle button on the bottom of your page. Clicking the button opens the debugger overlay view. In the debugger view you can:
* Open and close data sets recursively by holding down the 'Shift' key while clicking an item.
* Close the debugger by pressing the 'Esc' key.

### Add data with JavaScript

You can manually add data into the debugger by using the `extend` function of the global debugger object in JavaScript. The first parameter is your data. The second parameter is the key under which your data is added. You can add multiple data sets under the same key.

```
window.DustPressDebugger.extend('someData', 'my-data-key');
```
If you are using the [DustPress.js](https://github.com/devgeniem/dustpress-js) plugin, the data loaded via AJAX is automatically added into the debugger view.
