<?php
/**
 * Connector REST smoke test (copy to site root or run via wp eval-file from deploy/local).
 *
 * @package RankPublish
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once ABSPATH . 'wp-content/plugins/rankpublish/includes/connector/class-crypto.php';
require_once ABSPATH . 'wp-content/plugins/rankpublish/includes/connector/class-service-user.php';
require_once ABSPATH . 'wp-content/plugins/rankpublish/includes/connector/class-internal-rest.php';
require_once ABSPATH . 'wp-content/plugins/rankpublish/includes/connector/integrations/interface-integration.php';
require_once ABSPATH . 'wp-content/plugins/rankpublish/includes/connector/integrations/class-thinkrank-adapter.php';
require_once ABSPATH . 'wp-content/plugins/rankpublish/includes/connector/integrations/class-schedulepress-adapter.php';
require_once ABSPATH . 'wp-content/plugins/rankpublish/includes/connector/class-registry.php';
require_once ABSPATH . 'wp-content/plugins/rankpublish/includes/connector/class-rest.php';

$health = rest_do_request( new WP_REST_Request( 'GET', '/rankpublish/v1/health' ) );

echo wp_json_encode(
	array(
		'health_status'      => $health->get_status(),
		'health'             => $health->get_data(),
		'capabilities_count' => count( \RankPublish\Connector\Registry::capabilities() ),
		'connector_class'    => class_exists( 'RankPublish\\Connector\\Connector' ),
	),
	JSON_PRETTY_PRINT
);
