<?php
/**
 * Plugin Name: Nashir
 * Plugin URI: https://getnashir.com
 * Description: موصل ناشر — جدولة ونشر المحتوى من حسابك السحابي أو من لوحة ووردبريس.
 * Version: 1.0.0
 * Author: Nashir
 * Author URI: https://getnashir.com
 * Text Domain: nashir
 * Domain Path: /languages
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 *
 * @package Nashir
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'NASHIR_VERSION', '1.0.0' );
define( 'NASHIR_FILE', __FILE__ );
define( 'NASHIR_PATH', plugin_dir_path( __FILE__ ) );
define( 'NASHIR_URL', plugin_dir_url( __FILE__ ) );

require_once NASHIR_PATH . 'includes/class-crypto.php';
require_once NASHIR_PATH . 'includes/class-client.php';
require_once NASHIR_PATH . 'includes/class-rest.php';
require_once NASHIR_PATH . 'includes/class-sync.php';
require_once NASHIR_PATH . 'includes/class-heartbeat.php';
require_once NASHIR_PATH . 'includes/class-admin.php';
require_once NASHIR_PATH . 'includes/class-plugin.php';

/**
 * Bootstrap the plugin.
 */
function nashir_bootstrap(): void {
	$plugin = Nashir_Plugin::instance();
	$plugin->boot();
}
add_action( 'plugins_loaded', 'nashir_bootstrap' );

/**
 * Activation: default options only. No remote calls.
 */
function nashir_activate(): void {
	if ( false === get_option( 'nashir_app_url', false ) ) {
		add_option( 'nashir_app_url', 'https://nashir.vercel.app' );
	}
	Nashir_Heartbeat::activate();
}
register_activation_hook( __FILE__, 'nashir_activate' );

function nashir_deactivate(): void {
	Nashir_Heartbeat::deactivate();
}
register_deactivation_hook( __FILE__, 'nashir_deactivate' );
