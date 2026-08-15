<?php
/**
 * Plugin orchestrator.
 *
 * @package Nashir
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

	private Nashir_Admin $admin;
	private Nashir_REST $rest;
	private Nashir_Sync $sync;
	private Nashir_Heartbeat $heartbeat;

	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		$this->admin     = new Nashir_Admin();
		$this->rest      = new Nashir_REST();
		$this->sync      = new Nashir_Sync();
		$this->heartbeat = new Nashir_Heartbeat();
	}

	public function boot(): void {
		load_plugin_textdomain( 'nashir', false, dirname( plugin_basename( NASHIR_FILE ) ) . '/languages' );
		$this->admin->register();
		$this->rest->register();
		$this->sync->register();
		$this->heartbeat->register();
	}
}
