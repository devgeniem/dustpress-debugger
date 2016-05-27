<?php
/**
 * Plugin Name: DustPress Debugger
 * Plugin URI: https://github.com/devgeniem/dustpress-debugger
 * Description: Provides handy ajaxified debugger tool for DustPress based themes.
 * Version: 1.0
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

class Debugger {

	public static function init() {
		if ( is_user_logged_in() && current_user_can( "manage_options" ) ) {
			// Register the debugger script
			wp_register_script( "dustpress_debugger",  plugin_dir_url( __FILE__ ) .'js/dustpress-debugger.js', ['jquery'], '0.0.2', true );

			// jsonView jQuery plugin
			wp_enqueue_style( "jquery.jsonview", plugin_dir_url( __FILE__ ) .'css/jquery.jsonview.css', null, null, null );
			wp_enqueue_script( "jquery.jsonview", plugin_dir_url( __FILE__ ) .'js/jquery.jsonview.js', ['jquery'], null, true );

			// Register debugger ajax hook
			add_action( 'wp_ajax_dustpress_debugger', array( __CLASS__, 'get_debugger_data' ) );
			add_action( 'wp_ajax_nopriv_dustpress_debugger', array( __CLASS__, 'get_debugger_data' ) );

			add_action( "dustpress/debugger", array( __CLASS__, "debugger" ), 1, 1 );
		}
	}

	public static function debugger( $hash ) {

		$data_array = array(
			'ajaxurl' 	=> admin_url( 'admin-ajax.php' ),
			'hash' 		=> $hash
		);

		wp_localize_script( 'dustpress_debugger', 'dustpress_debugger', $data_array );

		wp_enqueue_script( 'dustpress_debugger' );
	}

	public static function get_debugger_data() {
		if ( defined("DOING_AJAX") ) {
			session_start();

			$hash = $_POST['hash'];
			$data = $_SESSION[ $hash ];

			if ( isset( $data ) ) {
                unset( $_SESSION[ $hash ] );
                $status = 'success';
            } else {
				$status = 'error';
			}

			$response = [
				'status' 	=> $status, // 'success' || 'error'
				'data' 		=> $data // data for js
            ];

			$output = json_encode($response);

			die( $output );
		}
	}
}

add_action( 'init', __NAMESPACE__ . '\\Debugger::init' );
