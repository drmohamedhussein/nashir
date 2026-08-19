<?php
/**
 * WP-CLI eval-file checks for RankPublish QA.
 *
 * @package RankPublish
 */

use RankPublish\Modules\Schedule_Module;
use RankPublish\Modules\Schedule_Pro_Module;
use RankPublish\Modules\Seo_Module;
use RankPublish\Modules\Seo_Pro_Module;
use RankPublish\Connector\Registry;
use RankPublish\Connector\Rest;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$check = (string) ( $args[0] ?? 'all' );

switch ( $check ) {
	case 'versions':
		echo wp_json_encode(
			array(
				'rankpublish' => defined( 'RANKPUBLISH_VERSION' ) ? RANKPUBLISH_VERSION : null,
				'schedule'    => defined( 'WPSP_VERSION' ) ? WPSP_VERSION : null,
				'thinkrank'   => defined( 'THINKRANK_VERSION' ) ? THINKRANK_VERSION : null,
			)
		);
		break;

	case 'modules':
		echo wp_json_encode(
			array(
				'schedule'     => class_exists( Schedule_Module::class ) && Schedule_Module::is_loaded(),
				'schedule_pro' => class_exists( Schedule_Pro_Module::class ) && Schedule_Pro_Module::is_loaded(),
				'seo'          => class_exists( Seo_Module::class ) && Seo_Module::is_loaded(),
				'seo_pro'      => class_exists( Seo_Pro_Module::class ) && Seo_Pro_Module::is_loaded(),
			)
		);
		break;

	case 'menus':
		if ( ! defined( 'WP_ADMIN' ) ) {
			define( 'WP_ADMIN', true );
		}
		require_once ABSPATH . 'wp-admin/includes/admin.php';
		set_current_screen( 'dashboard' );
		do_action( 'admin_menu' );
		global $submenu;
		$subs = array();
		if ( ! empty( $submenu['rankpublish'] ) ) {
			foreach ( $submenu['rankpublish'] as $item ) {
				$subs[] = (string) $item[2];
			}
		}
		echo wp_json_encode(
			array(
				'menu'  => ! empty( $submenu['rankpublish'] ),
				'pages' => $subs,
			)
		);
		break;

	case 'tables':
		global $wpdb;
		$count = 0;
		foreach ( array( 'wpsp_%', $wpdb->prefix . 'thinkrank%' ) as $like ) {
			$rows = $wpdb->get_col( $wpdb->prepare( 'SHOW TABLES LIKE %s', $like ) );
			$count += count( $rows );
		}
		echo (string) $count;
		break;

	case 'home':
		echo esc_url( home_url( '/' ) );
		break;

	case 'dev-versions':
		echo wp_json_encode(
			array(
				'rpsite'    => defined( 'RPSITE_VERSION' ) ? RPSITE_VERSION : null,
				'thinkrank' => defined( 'THINKRANK_VERSION' ) ? THINKRANK_VERSION : null,
				'schedule'  => defined( 'WPSP_VERSION' ) ? WPSP_VERSION : null,
			)
		);
		break;

	case 'dev-menus':
		if ( ! defined( 'WP_ADMIN' ) ) {
			define( 'WP_ADMIN', true );
		}
		require_once ABSPATH . 'wp-admin/includes/admin.php';
		set_current_screen( 'dashboard' );
		do_action( 'admin_menu' );
		global $menu, $submenu;
		$pages = array();
		if ( is_array( $menu ) ) {
			foreach ( $menu as $item ) {
				if ( isset( $item[2] ) ) {
					$pages[] = (string) $item[2];
				}
			}
		}
		if ( is_array( $submenu ) ) {
			foreach ( $submenu as $items ) {
				foreach ( (array) $items as $item ) {
					if ( isset( $item[2] ) ) {
						$pages[] = (string) $item[2];
					}
				}
			}
		}
		echo wp_json_encode(
			array(
				'thinkrank'     => in_array( 'thinkrank', $pages, true ),
				'schedulepress' => in_array( 'schedulepress', $pages, true ),
				'rpsite'        => defined( 'RPSITE_VERSION' ),
				'pages'         => $pages,
			)
		);
		break;

	case 'connector':
		$health = rest_do_request( new WP_REST_Request( 'GET', '/rankpublish/v1/health' ) );
		$health_data = $health->get_data();
		echo wp_json_encode(
			array(
				'health_status'      => $health->get_status(),
				'connector_version'  => defined( 'RANKPUBLISH_CONNECTOR_VERSION' ) ? RANKPUBLISH_CONNECTOR_VERSION : null,
				'rankpublish_version'=> defined( 'RANKPUBLISH_VERSION' ) ? RANKPUBLISH_VERSION : null,
				'connector_class'    => class_exists( 'RankPublish\\Connector\\Connector' ),
				'integrations'       => Registry::integration_manifest(),
				'capabilities_count' => count( Registry::capabilities() ),
				'connected'          => Rest::is_connected(),
			)
		);
		break;

	default:
		echo wp_json_encode( array( 'error' => 'unknown_check' ) );
}
