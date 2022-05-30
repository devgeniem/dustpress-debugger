![geniem-github-banner](https://cloud.githubusercontent.com/assets/5691777/14319886/9ae46166-fc1b-11e5-9630-d60aa3dc4f9e.png)
# DustPress Plugin: DustPress Debugger

DustPress Debugger is a WordPress plugin which displays the data loaded by your current DustPress model in a json viewer.

- Contributors: devgeniem / Nomafin, villesiltala
- Plugin url: https://github.com/devgeniem/dustpress-debugger
- Tags: dustpress, wordpress, plugins, dustjs, dust.js
- Requires at least: 4.2.0
- Tested up to: 5.3.0
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

You can also activate the debugger on any user by defining `DUSTPRESS_DEBUGGER_ALWAYS_ON` constant in your project. This will override the manual settings, so it is not recommended to use this setting in production!

## Usage

Install the browser extension, open your devtools and select the "dustpress-debugger" tab.
If on chrome you will need to request scripting & cookie access to the relevant urls when opening the view for the first time.

## Building the browser extension

Select the specified node version in the `.nvmrc` file by installing [nvm](https://github.com/nvm-sh/nvm) and running:
```bash
nvm install # install specified node version
nvm use # use specified node version
```
Or by installing it manually.


Then run the following commands:
```bash
npm ci # install npm packages
npm run build # build the extensions assets
```

For a firefox build which uses manifest version 2 you can run:
```bash
npm run build -- --env=target=firefox
```

The built assets will be in the `dist/` folder.

### Development version

You can build the development version of the extension by running the commands specified in the building section but instead of `npm run build` run the following:
```bash
npm run watch
```

Or for the firefox version:
```bash
npm run watch -- --env=target=firefox
```

This will build the assets and wait for changes to files.
Then add the contents of the `dist/` folder as a temporary or unpackaged plugin depending on which browser you are using.

### Add data with JavaScript

You can manually add data into the debugger by using the `extend` function of the global debugger object in JavaScript. The first parameter is your data. The second parameter is the key under which your data is added. You can add multiple data sets under the same key.

```
window.DustPressDebugger.extend('someData', 'my-data-key');
```
If you are using the [DustPress.js](https://github.com/devgeniem/dustpress-js) plugin, the data loaded via AJAX is automatically added into the debugger view.
