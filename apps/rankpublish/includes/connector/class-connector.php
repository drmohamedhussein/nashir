<?php
/**
 * Connector bootstrap.
 *
 * @package RankPublish
 */

declare(strict_types=1);

namespace RankPublish\Connector;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Loads RankPublish Cloud connector.
 */
final class Connector {

	public static function boot(): void {
		if ( ! defined( 'RANKPUBLISH_CONNECTOR_VERSION' ) ) {
			define( 'RANKPUBLISH_CONNECTOR_VERSION', '1.0.0' );
		}

		require_once RANKPUBLISH_PATH . 'includes/connector/class-crypto.php';
		require_once RANKPUBLISH_PATH . 'includes/connector/class-service-user.php';
		require_once RANKPUBLISH_PATH . 'includes/connector/class-internal-rest.php';
		require_once RANKPUBLISH_PATH . 'includes/connector/integrations/interface-integration.php';
		require_once RANKPUBLISH_PATH . 'includes/connector/integrations/class-thinkrank-adapter.php';
		require_once RANKPUBLISH_PATH . 'includes/connector/integrations/class-schedulepress-adapter.php';
		require_once RANKPUBLISH_PATH . 'includes/connector/class-registry.php';
		require_once RANKPUBLISH_PATH . 'includes/connector/class-rest.php';
		require_once RANKPUBLISH_PATH . 'includes/connector/class-cloud-client.php';
		require_once RANKPUBLISH_PATH . 'includes/connector/class-sync.php';
		require_once RANKPUBLISH_PATH . 'includes/connector/class-heartbeat.php';
		require_once RANKPUBLISH_PATH . 'includes/connector/class-onboarding.php';
		require_once RANKPUBLISH_PATH . 'includes/connector/class-admin.php';
		require_once RANKPUBLISH_PATH . 'includes/connector/class-workspace-admin.php';
		require_once RANKPUBLISH_PATH . 'includes/connector/class-engine-shell.php';

		Service_User::ensure();

		( new Rest() )->register();
		( new Sync() )->register();
		( new Heartbeat() )->register();
		Onboarding::register();

		if ( is_admin() ) {
			( new Admin() )->register();
			( new Workspace_Admin() )->register();
			( new Engine_Shell() )->register();
		}
	}
}
