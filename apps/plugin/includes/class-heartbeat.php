<?php
/**
 * Minute heartbeat so Nashir can publish even when WP-Cron is quiet.
 *
 * @package Nashir
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers cron and traffic-backed heartbeat.
 */
final class Nashir_Heartbeat {

	public function register(): void {
		add_filter( 'cron_schedules', array( $this, 'schedules' ) );
		add_action( 'nashir_heartbeat_event', array( $this, 'run' ) );
		add_action( 'shutdown', array( $this, 'maybe_run' ), 20 );
	}

	/**
	 * @param array<string, array<string, mixed>> $schedules
	 * @return array<string, array<string, mixed>>
	 */
	public function schedules( array $schedules ): array {
		$schedules['nashir_minute'] = array(
			'interval' => 60,
			'display'  => __( 'كل دقيقة (ناشر)', 'nashir' ),
		);
		return $schedules;
	}

	public static function activate(): void {
		if ( ! wp_next_scheduled( 'nashir_heartbeat_event' ) ) {
			wp_schedule_event( time() + 60, 'nashir_minute', 'nashir_heartbeat_event' );
		}
	}

	public static function deactivate(): void {
		$timestamp = wp_next_scheduled( 'nashir_heartbeat_event' );
		if ( $timestamp ) {
			wp_unschedule_event( $timestamp, 'nashir_heartbeat_event' );
		}
	}

	public function run(): void {
		Nashir_Client::heartbeat();
	}

	public function maybe_run(): void {
		if ( ! get_option( 'nashir_site_id' ) ) {
			return;
		}
		if ( get_transient( 'nashir_heartbeat_lock' ) ) {
			return;
		}
		set_transient( 'nashir_heartbeat_lock', 1, 60 );
		Nashir_Client::heartbeat();
	}
}
