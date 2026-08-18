<?php
/**
 * Plugin Name:       RankPublish Site Core
 * Plugin URI:        https://rankpublish.com
 * Description:       RankPublish site core: marketing UI, branding, upstream merge watch, and (later) product update channel for rankpublish.
 * Version:           1.6.3
 * Requires at least: 6.0
 * Requires PHP:      8.0
 * Author:            WPDevLtd
 * Author URI:        https://rankpublish.com
 * Text Domain:       rankpublish-site
 * License:           GPL-2.0-or-later
 *
 * Original WPDevLtd marketing UI. Not SchedulePress/ThinkRank artwork.
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'RPSITE_VERSION', '1.6.3' );
define( 'RPSITE_FILE', __FILE__ );
define( 'RPSITE_PATH', plugin_dir_path( __FILE__ ) );
define( 'RPSITE_URL', plugin_dir_url( __FILE__ ) );

require_once RPSITE_PATH . 'includes/helpers.php';
require_once RPSITE_PATH . 'includes/illustrations.php';
require_once RPSITE_PATH . 'includes/i18n.php';
require_once RPSITE_PATH . 'includes/mocks.php';
require_once RPSITE_PATH . 'includes/class-plugin.php';
require_once RPSITE_PATH . 'includes/class-merge-registry.php';
require_once RPSITE_PATH . 'includes/class-merge-audit.php';
require_once RPSITE_PATH . 'includes/class-admin-os.php';
require_once RPSITE_PATH . 'includes/class-module-embed.php';
require_once RPSITE_PATH . 'includes/class-admin.php';
require_once RPSITE_PATH . 'includes/class-branding.php';
require_once RPSITE_PATH . 'includes/class-update-watch.php';
require_once RPSITE_PATH . 'includes/class-connector-packages.php';

register_activation_hook( __FILE__, array( 'RankPublish_Site_Plugin', 'activate' ) );

add_action(
	'plugins_loaded',
	static function (): void {
		RankPublish_Site_Plugin::instance()->init();
		( new RankPublish_Site_Branding() )->init();
		( new RankPublish_Site_Update_Watch() )->init();
		( new RankPublish_Site_Connector_Packages() )->init();
		if ( is_admin() ) {
			( new RankPublish_Site_Module_Embed() )->init();
			( new RankPublish_Site_Admin() )->init();
		}
	}
);
