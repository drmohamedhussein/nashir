<?php
/**
 * Outbound heartbeat so Cloud can process jobs even when WP-Cron is quiet.
 *
 * @package RankPublish
 */

declare(strict_types=1);

namespace RankPublish\Connector;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Minute heartbeat + post push to RankPublish Cloud.
 */
final class Heartbeat {

	public function register(): void {
		add_filter( 'cron_schedules', array( $this, 'schedules' ) );
		add_action( 'rankpublish_heartbeat_event', array( $this, 'run' ) );
		add_action( 'shutdown', array( $this, 'maybe_run' ), 20 );
		self::ensure_scheduled();
	}

	/**
	 * @param array<string, array<string, mixed>> $schedules
	 * @return array<string, array<string, mixed>>
	 */
	public function schedules( array $schedules ): array {
		$schedules['rankpublish_minute'] = array(
			'interval' => 60,
			'display'  => __( 'Every minute (RankPublish)', 'rankpublish' ),
		);
		return $schedules;
	}

	public static function ensure_scheduled(): void {
		if ( ! wp_next_scheduled( 'rankpublish_heartbeat_event' ) ) {
			wp_schedule_event( time() + 30, 'rankpublish_minute', 'rankpublish_heartbeat_event' );
		}
	}

	public function run(): void {
		if ( ! Rest::is_connected() ) {
			return;
		}
		Sync::push_all();
		Cloud_Client::signed_post(
			'/heartbeat',
			array( 'ok' => true, 'source' => 'rankpublish' ),
			8,
			__( 'Could not send heartbeat.', 'rankpublish' )
		);
	}

	public function maybe_run(): void {
		if ( ! Rest::is_connected() ) {
			return;
		}
		if ( get_transient( 'rankpublish_heartbeat_lock' ) ) {
			return;
		}
		set_transient( 'rankpublish_heartbeat_lock', 1, 60 );
		$this->run();
	}
}
