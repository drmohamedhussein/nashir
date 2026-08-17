<?php
/**
 * Plugin orchestrator.
 *
 * @package PublisherWP
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Main plugin object.
 */
final class Nashir_Plugin {

	private static ?self $instance = null;

	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	public function boot(): void {
		load_plugin_textdomain( 'nashir', false, dirname( plugin_basename( NASHIR_FILE ) ) . '/languages' );
		Nashir_License::maybe_bootstrap_vendor();

		( new Nashir_Admin() )->register();
		( new Nashir_REST() )->register();
		( new Nashir_Sync() )->register();
		( new Nashir_Heartbeat() )->register();
		( new Nashir_Schedule() )->register();
		( new Nashir_Metabox() )->register();
		( new Nashir_Editors() )->register();
		( new Nashir_Calendar() )->register();
		( new Nashir_Dashboard() )->register();
		( new Nashir_Social() )->register();
	}

	public static function licensed(): bool {
		return Nashir_License::licensed();
	}

	public static function connected(): bool {
		return (string) get_option( 'nashir_site_id', '' ) !== '' && (string) get_option( 'nashir_signing_secret', '' ) !== '';
	}

	/**
	 * @return array<int, string>
	 */
	public static function allowed_types(): array {
		$raw = (string) get_option( 'nashir_allowed_types', 'post,page' );
		$types = array_filter( array_map( 'trim', explode( ',', $raw ) ) );
		return $types ?: array( 'post', 'page' );
	}
}
