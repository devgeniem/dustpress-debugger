<?php

/**
 * Plugin Name: DustPress Debugger
 * Plugin URI: https://github.com/devgeniem/dustpress-debugger
 * Description: Provides handy ajaxified debugger tool for DustPress based themes.
 * Version: 1.5.2
 * Author: Geniem Oy / Miika Arponen & Ville Siltala
 * Author URI: http://www.geniem.com
 */

namespace DustPress;

/**
 * DustPressDebugger
 */
class Debugger
{

    private static $hash;
    private static $data = [];

    /**
     * Add hooks if the user has correct capabilities.
     */
    public static function init()
    {
        if (is_user_logged_in() && current_user_can('manage_options')) {
            // Register user option hooks
            add_action('show_user_profile', array(__CLASS__, 'profile_option'));
            add_action('edit_user_profile', array(__CLASS__, 'profile_option'));
            add_action('personal_options_update', array(__CLASS__, 'save_profile_option'));
            add_action('edit_user_profile_update', array(__CLASS__, 'save_profile_option'));

            if (get_the_author_meta('dustpress_debugger', get_current_user_id())) {
                // Register the debugger script
                wp_register_script('dustpress_debugger', plugin_dir_url(__FILE__) . 'js/dustpress-debugger.js', ['jquery'], '1.5.2', true);

                // JsonView jQuery plugin
                wp_enqueue_style('jquery.jsonview', plugin_dir_url(__FILE__) . 'css/jquery.jsonview.css', null, null, null);
                wp_enqueue_script('jquery.jsonview', plugin_dir_url(__FILE__) . 'js/jquery.jsonview.js', ['jquery'], null, true);

                // Register debugger ajax hook
                add_action('wp_ajax_dustpress_debugger', array(__CLASS__, 'get_debugger_data'));
                add_action('wp_ajax_nopriv_dustpress_debugger', array(__CLASS__, 'get_debugger_data'));

                add_filter('dustpress/data', array(__CLASS__, 'set_hash'));

                add_filter('dustpress/data/after_render', array(__CLASS__, 'performance'), 100, 2);

                add_filter('dustpress/data/after_render', array(__CLASS__, 'debugger'), 101, 2);

                add_filter('dustpress/data/after_render', array(__CLASS__, 'templates'), 99, 2);

                // Register DustPress core helper hooks
                add_filter('dustpress/menu/data', array(__CLASS__, 'gather_menu_helper_data'));

                add_filter('dustpress/template', array(__CLASS__, 'main_model'), 100, 1);

                add_action('dustpress/model_list', array(__CLASS__, 'models'), 100, 1);

                // Prevent DustPress for caching the rendered output so that this plugin works
                add_filter('dustpress/cache/rendered', '__return_false', (PHP_INT_MAX - 1000));
                add_filter('dustpress/cache/partials', '__return_false', (PHP_INT_MAX - 1000));
            }
        }
    }

    public static function use_debugger()
    {
        if (is_user_logged_in() && current_user_can('manage_options') && get_the_author_meta('dustpress_debugger', get_current_user_id())) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Sets the hash for the data to the DOM to get.
     * @param object $data DustPress render data
     */

    public static function set_hash($data)
    {
        // Unique hash
        self::$hash = md5($_SERVER['REQUEST_URI'] . microtime());

        $data_array = array(
            'ajaxurl'   => admin_url('admin-ajax.php'),
            'hash'      => self::$hash
        );

        wp_localize_script('dustpress_debugger', 'dustpress_debugger', $data_array);

        wp_enqueue_script('dustpress_debugger');

        return $data;
    }

    /**
     * Add data for js.
     *
     * @param  string $hash     The current data hash.
     */
    public static function debugger($data, $main)
    {
        if ($main) {
            $debugger_data = array_merge((array) $data, (array) self::$data);

            $debugger_data = apply_filters('dustpress/debugger/data', $debugger_data);

            set_transient('dustpress_debugger_' . self::$hash, $debugger_data, 5 * 60);
        }
    }

    /**
     * Function for the AJAX call to get the debugger data from the transient.
     */
    public static function get_debugger_data()
    {
        if (defined('DOING_AJAX')) {

            $hash = filter_input(INPUT_POST, 'hash');

            $data = get_transient('dustpress_debugger_' . $hash);

            if ($data) {
                $status = 'success';
            } else {
                $status = 'error';
            }

            // The response data
            $response = [
                'status'    => $status,
                'data'      => $data
            ];

            $output = wp_json_encode($response);

            wp_send_json($output);
        }
    }

    public static function gather_menu_helper_data($data)
    {
        self::set_debugger_data('Menu', $data);

        return $data;
    }

    /**
     * Gathers debug data from other sources than DustPress core.
     */
    public static function set_debugger_data($key, $data)
    {
        if (empty($key)) {
            die('You did not set a key for your debugging data collection.');
        } else {
            $debug_data_block_name = dustpress()->get_setting('debug_data_block_name');

            if (!isset(self::$data['Debugs'])) {
                self::$data['Debugs'] = [];
            }

            if (!isset(self::$data['Debugs'][$debug_data_block_name])) {
                self::$data['Debugs'][$debug_data_block_name] = [];
            }

            if (!isset(self::$data['Debugs'][$debug_data_block_name][$key])) {
                self::$data['Debugs'][$debug_data_block_name][$key] = [];
            }

            self::$data['Debugs'][$debug_data_block_name][$key][] = $data;
        }
    }

    public static function profile_option($user)
    {
        $current_status = get_the_author_meta('dustpress_debugger', $user->ID);

?>
        <h3>DustPress Debugger</h3>

        <table class="form-table">
            <tr>
                <th><label for="dustpress_debugger">DustPress Debugger enabled</label></th>
                <td>
                    <input type="checkbox" name="dustpress_debugger" value="1" id="dustpress_debugger" <?php if ($current_status) : ?> checked="checked" <?php endif; ?> />
                </td>
            </tr>
        </table>
<?php
    }

    public static function save_profile_option($user_id)
    {
        if (!current_user_can("manage_options")) {
            return false;
        }

        $user_value = (int) filter_input(INPUT_POST, 'dustpress_debugger', FILTER_SANITIZE_NUMBER_INT);

        update_user_meta($user_id, 'dustpress_debugger', $user_value);
    }

    public static function main_model($model)
    {
        if (!isset(self::$data['Debugs'])) {
            self::$data['Debugs'] = [];
        }

        self::$data['Debugs']['Main model'] = $model;

        return $model;
    }

    public static function templates($data, $main)
    {
        if ($main) {
            if (!isset(self::$data['Debugs'])) {
                self::$data['Debugs'] = [];
            }

            self::$data['Debugs']['Templates']  = array_keys((array) dustpress()->dust->templates);
        }

        return $data;
    }

    public static function performance($data, $main)
    {
        if ($main) {
            self::$data['Performance'] = dustpress()->get_performance_data();
        }

        return $data;
    }

    public static function models($models)
    {
        if (!isset(self::$data['Debugs'])) {
            self::$data['Debugs'] = [];
        }

        self::$data['Debugs']['Submodels'] = $models;
    }

    public static function get_data($key)
    {
        return self::$data[$key] ?? null;
    }
}

add_action('init', __NAMESPACE__ . '\\Debugger::init');
