<?php
/**
 * Plugin Name: DustPress Debugger
 * Plugin URI: https://github.com/devgeniem/dustpress-debugger
 * Description: Provides handy ajaxified debugger tool for DustPress based themes.
 * Version: 1.2.9
 * Author: Geniem Oy / Miika Arponen & Ville Siltala
 * Author URI: http://www.geniem.com
 */

namespace DustPress;

use add_action;
use add_filter;
use admin_url;
use current_user_can;
use is_user_logged_in;
use plugin_dir_url;
use wp_localize_script;
use wp_enqueue_script;
use wp_enqueue_style;
use wp_register_script;
use wp_send_json_success;

/**
 * DustPressDebugger
 */
class Debugger {

    private static $hash;
    private static $data = [];

    /**
     * Add hooks if the user has correct capabilities.
     */
    public static function init() {
        if ( is_user_logged_in() && current_user_can( 'manage_options' ) ) {
            // Register user option hooks
            add_action( 'show_user_profile', array( __CLASS__, "profile_option") );
            add_action( 'edit_user_profile', array( __CLASS__, "profile_option") );
            add_action( 'personal_options_update', array( __CLASS__, "save_profile_option") );
            add_action( 'edit_user_profile_update', array( __CLASS__, "save_profile_option") );

            if ( get_the_author_meta( "dustpress_debugger", get_current_user_id() ) ) {
                // Register the debugger script
                wp_register_script( 'dustpress_debugger', plugin_dir_url( __FILE__ ) . 'js/dustpress-debugger-min.js', [ 'jquery' ], '0.0.2', true );

                // JsonView jQuery plugin
                wp_enqueue_style( 'jquery.jsonview', plugin_dir_url( __FILE__ ) .'css/jquery.jsonview.css', null, null, null );
                wp_enqueue_script( 'jquery.jsonview', plugin_dir_url( __FILE__ ) .'js/jquery.jsonview.js', [ 'jquery' ], null, true );

                // Register debugger ajax hook
                add_action( 'wp_ajax_dustpress_debugger', array( __CLASS__, 'get_debugger_data' ) );
                add_action( 'wp_ajax_nopriv_dustpress_debugger', array( __CLASS__, 'get_debugger_data' ) );

                add_filter( "dustpress/data", array( __CLASS__, "set_hash" ) );

                add_action( 'dustpress/data/after_render', array( __CLASS__, 'debugger' ), 100, 1 );

                // Register DustPress core helper hooks
                add_filter( 'dustpress/menu/data', array( __CLASS__, "gather_menu_helper_data") );

                // Prevent DustPress for caching the rendered output so that this plugin works
                add_filter( "dustpress/cache/rendered", "__return_false", ( PHP_INT_MAX - 1000 ) );
                add_filter( "dustpress/cache/partials", "__return_false", ( PHP_INT_MAX - 1000 ) );
            }
        }
    }

    /**
     * Sets the hash for the data to the DOM to get.
     * @param object $data DustPress render data
     */
    
    public static function set_hash( $data ) {
        // Unique hash
        self::$hash = md5( $_SERVER[ "REQUEST_URI" ] . microtime() );

        $data_array = array(
            'ajaxurl'   => admin_url( 'admin-ajax.php' ),
            'hash'      => self::$hash
        );
        
        wp_localize_script( 'dustpress_debugger', 'dustpress_debugger', $data_array );

        wp_enqueue_script( 'dustpress_debugger' );

        return $data;
    }

    /**
     * Add data for js.
     *
     * @param  string $hash     The current data hash.
     */
    public static function debugger( $data ) {

        $debugger_data = array_merge( (array) $data, (array) self::$data );

        $debugger_data   = apply_filters( 'dustpress/debugger/data', $debugger_data );

        // start session for data storing
        if ( session_status() == PHP_SESSION_NONE ) {
            session_start();
        }

        $_SESSION[ self::$hash ] = $debugger_data;

        session_write_close();
    }

    /**
     * Function for the AJAX call to get the debugger data from the session.
     */
    public static function get_debugger_data() {
        if ( defined( 'DOING_AJAX' ) ) {
            session_start();

            $hash = filter_input( INPUT_POST, 'hash' );

            if ( isset( $_SESSION[ $hash ] ) ) {
                $data = $_SESSION[ $hash ];
                
                unset( $_SESSION[ $hash ] );
                $status = 'success';
            } else {
                $data = null;

                $status = 'error';
            }

            // The response data
            $response = [
                'status'    => $status,
                'data'      => $data
            ];

            $output = wp_json_encode( $response );

            wp_send_json( $output );
        }
    }

    public static function gather_menu_helper_data( $data ) {
        self::set_debugger_data( 'Menu', $data );

        return $data;
    }

    /**
    * Gathers debug data from other sources than DustPress core.
    */
    public static function set_debugger_data( $key, $data ) {
        if ( empty( $key ) ) {
            die( 'You did not set a key for your debugging data collection.' );
        } else {
            $debug_data_block_name = dustpress()->get_setting( "debug_data_block_name" );

            if ( ! isset( self::$data[ $debug_data_block_name ] ) ) {
                self::$data[ $debug_data_block_name ] = [];
            }

            if ( ! isset( self::$data[ $debug_data_block_name ][ $key ] ) ) {
                self::$data[ $debug_data_block_name ][ $key ] = [];
            }

            self::$data[ $debug_data_block_name ][ $key ][] = $data;
        }
    }

    public static function profile_option( $user ) {
        $current_status = get_the_author_meta( "dustpress_debugger", $user->ID );

        ?>
        <h3>DustPress Debugger</h3>

        <table class="form-table">
            <tr>
                <th><label for="dustpress_debugger">DustPress Debugger enabled</label></th>
                <td>
                    <input type="checkbox" name="dustpress_debugger" id="dustpress_debugger"<?php if ( $current_status ): ?> checked="checked"<?php endif; ?>/>
                </td>
            </tr>
        </table>
    <?php }

    public static function save_profile_option( $user_id ) {
        if ( ! current_user_can( "manage_options" ) || ! isset( $_POST["dustpress_debugger"] ) ) {
            return false;
        }

        update_user_meta( $user_id, "dustpress_debugger", $_POST["dustpress_debugger"] );
    }
}

add_action( 'init', __NAMESPACE__ . '\\Debugger::init' );
