module.exports = (configs = {}) => {
    const { BROWSER_TARGET } = configs;

    // Create initial manifest.json
    const manifest = {
        name: 'dustpress-debugger',
        description: 'Provides handy ajaxified debugger tool for DustPress based themes.',
        version: '1.0.0',
        devtools_page: 'devtools_page.html',
        background: {},
        permissions: [
            'tabs'
        ]
    };

    // Set manifest version based on browser target
    manifest.manifest_version = BROWSER_TARGET === 'chrome' ? 3 : 2;

    // Set manifest version specific manifest data
    if ( manifest.manifest_version === 3 ) {
        manifest.optional_permissions = [ 'scripting', 'cookies' ];
        manifest.host_permissions = [ 'https://*/' ];
        manifest.background.service_worker = 'background.js';
    }
    else {
        manifest.permissions.push( 'cookies', 'https://*/' );
        manifest.background.scripts = [ 'background.js' ];
    }

    return manifest;
}
