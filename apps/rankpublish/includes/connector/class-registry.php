<?php
/**
 * Integration and action registry.
 *
 * @package RankPublish
 */

declare(strict_types=1);

namespace RankPublish\Connector;

use RankPublish\Connector\Integrations\Integration_Interface;
use RankPublish\Connector\Integrations\SchedulePress_Adapter;
use RankPublish\Connector\Integrations\ThinkRank_Adapter;
use RankPublish\Modules\Schedule_Pro_Module;
use RankPublish\Modules\Seo_Pro_Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers embedded engines and resolves actions.
 */
final class Registry {

	/**
	 * @var array<string, Integration_Interface>|null
	 */
	private static $integrations = null;

	/**
	 * @return array<string, Integration_Interface>
	 */
	public static function integrations(): array {
		if ( null !== self::$integrations ) {
			return self::$integrations;
		}

		$items = array(
			new ThinkRank_Adapter(),
			new SchedulePress_Adapter(),
		);

		self::$integrations = array();
		foreach ( $items as $integration ) {
			self::$integrations[ $integration->id() ] = $integration;
		}

		return self::$integrations;
	}

	/**
	 * @return array<int, array<string, mixed>>
	 */
	public static function integration_manifest(): array {
		$list = array();

		foreach ( self::integrations() as $integration ) {
			if ( ! $integration->is_available() ) {
				continue;
			}
			$list[] = array(
				'id'      => $integration->id(),
				'label'   => $integration->label(),
				'version' => $integration->version(),
				'status'  => 'active',
			);
		}

		if ( Seo_Pro_Module::is_loaded() || defined( 'THINKRANK_PRO_VERSION' ) ) {
			$list[] = array(
				'id'      => 'thinkrank-pro',
				'label'   => 'SEO Pro',
				'version' => defined( 'THINKRANK_PRO_VERSION' ) ? (string) THINKRANK_PRO_VERSION : null,
				'status'  => 'active',
			);
		}

		if ( Schedule_Pro_Module::is_loaded() || defined( 'WPSP_PRO_VERSION' ) ) {
			$list[] = array(
				'id'      => 'schedulepress-pro',
				'label'   => 'Publishing Pro',
				'version' => defined( 'WPSP_PRO_VERSION' ) ? (string) WPSP_PRO_VERSION : null,
				'status'  => 'active',
			);
		}

		return $list;
	}

	/**
	 * @return array<int, array<string, string>>
	 */
	public static function capabilities(): array {
		$all = array();
		foreach ( self::integrations() as $integration ) {
			if ( ! $integration->is_available() ) {
				continue;
			}
			$all = array_merge( $all, $integration->capabilities() );
		}

		$all[] = array(
			'id'          => 'posts.list',
			'label'       => __( 'List posts', 'rankpublish' ),
			'integration' => 'rankpublish-core',
		);
		$all[] = array(
			'id'          => 'posts.get',
			'label'       => __( 'Get post workspace', 'rankpublish' ),
			'integration' => 'rankpublish-core',
		);
		$all[] = array(
			'id'          => 'integrations.discover',
			'label'       => __( 'Discover integrations', 'rankpublish' ),
			'integration' => 'rankpublish-core',
		);

		return $all;
	}

	/**
	 * @param array<string, mixed> $payload
	 * @return array<string, mixed>|\WP_Error
	 */
	public static function dispatch( string $action, array $payload ) {
		if ( str_starts_with( $action, 'seo.' ) ) {
			$adapter = self::integrations()['thinkrank'] ?? null;
			if ( ! $adapter instanceof Integration_Interface || ! $adapter->is_available() ) {
				return new \WP_Error( 'capability_unavailable', __( 'SEO is not available on this site.', 'rankpublish' ), array( 'status' => 422 ) );
			}
			return $adapter->handle_action( $action, $payload );
		}

		if ( str_starts_with( $action, 'publishing.' ) ) {
			$adapter = self::integrations()['schedulepress'] ?? null;
			if ( ! $adapter instanceof Integration_Interface || ! $adapter->is_available() ) {
				return new \WP_Error( 'capability_unavailable', __( 'Publishing is not available on this site.', 'rankpublish' ), array( 'status' => 422 ) );
			}
			return $adapter->handle_action( $action, $payload );
		}

		return new \WP_Error( 'rankpublish_unknown_action', __( 'Unknown action.', 'rankpublish' ), array( 'status' => 400 ) );
	}
}
