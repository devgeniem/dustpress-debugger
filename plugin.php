<?php
/**
 * Plugin Name: DustPress Debugger
 * Plugin URI: https://github.com/devgeniem/dustpress-debugger
 * Description: Provides handy ajaxified debugger tool for DustPress based themes.
 * Version: 1.1.3
 * Author: Geniem Oy / Miika Arponen & Ville Siltala
 * Author URI: http://www.geniem.com
 */

namespace DustPress;

use add_action;
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

        $debugger_data = array_merge( $data, self::$data );

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
            $data = $_SESSION[ $hash ];

            if ( isset( $data ) ) {
                unset( $_SESSION[ $hash ] );
                $status = 'success';
            } else {
                $status = 'error';
            }

            // The response data
            $response = [
                'status'    => $status,
                'data'      => $data,
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

            $model_data = [];

            if ( ! isset( $model_data[ $debug_data_block_name ] ) ) {
                $model_data[ $debug_data_block_name ] = [];
            }

            if ( ! isset( $model_data[ $debug_data_block_name ][ $key ] ) ) {
                $model_data[ $debug_data_block_name ][ $key ] = [];
            }

            $model_data[ $debug_data_block_name ][ $key ][] = $data;
        }

        self::$data = array_merge( self::$data, $model_data );
    }
}

add_action( 'init', __NAMESPACE__ . '\\Debugger::init' );
