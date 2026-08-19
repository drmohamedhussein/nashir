<?php
/**
 * Cloud connect admin UI under RankPublish menu.
 *
 * @package RankPublish
 */

declare(strict_types=1);

namespace RankPublish\Connector;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Pairing form for RankPublish Cloud.
 */
final class Admin {

	public function register(): void {
		add_action( 'admin_menu', array( $this, 'menu' ), 10001 );
		add_action( 'admin_init', array( $this, 'handle' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_menu_icon' ), 5 );
		add_filter( 'admin_body_class', array( $this, 'body_class' ) );
		add_action( 'in_admin_header', array( $this, 'suppress_notices' ), 1 );
	}

	public function menu(): void {
		add_submenu_page(
			'rankpublish',
			__( 'Cloud Connect', 'rankpublish' ),
			__( 'Cloud Connect', 'rankpublish' ),
			'manage_options',
			'rankpublish-cloud',
			array( $this, 'render' )
		);
	}

	/**
	 * @param string $classes Admin body classes.
	 */
	public function body_class( string $classes ): string {
		if ( $this->is_cloud_screen() ) {
			$classes .= ' rankpublish-cloud-wizard';
		}
		return $classes;
	}

	/**
	 * Keep the connect screen as clean as ThinkRank Setup Wizard.
	 */
	public function suppress_notices(): void {
		if ( ! $this->is_cloud_screen() ) {
			return;
		}
		remove_all_actions( 'user_admin_notices' );
		remove_all_actions( 'admin_notices' );
		remove_all_actions( 'all_admin_notices' );
	}

	/**
	 * Keep sidebar icons at dashicon size on every admin screen.
	 */
	public function enqueue_menu_icon(): void {
		if ( ! defined( 'RANKPUBLISH_URL' ) ) {
			return;
		}

		$version = defined( 'RANKPUBLISH_VERSION' ) ? RANKPUBLISH_VERSION : RANKPUBLISH_CONNECTOR_VERSION;
		wp_enqueue_style(
			'rankpublish-admin-menu',
			RANKPUBLISH_URL . 'assets/admin-menu.css',
			array(),
			$version
		);
	}

	/**
	 * @param string $hook Admin page hook.
	 */
	public function enqueue( string $hook ): void {
		if ( false === strpos( $hook, 'rankpublish-cloud' ) ) {
			return;
		}

		$version = defined( 'RANKPUBLISH_VERSION' ) ? RANKPUBLISH_VERSION : RANKPUBLISH_CONNECTOR_VERSION;
		$base    = defined( 'RANKPUBLISH_URL' ) ? RANKPUBLISH_URL : '';

		wp_enqueue_style(
			'rankpublish-cloud-connect',
			$base . 'assets/cloud-connect.css',
			array(),
			$version
		);

		wp_register_script( 'rankpublish-cloud-connect', '', array(), $version, true );
		wp_enqueue_script( 'rankpublish-cloud-connect' );
		wp_add_inline_script(
			'rankpublish-cloud-connect',
			'document.addEventListener("DOMContentLoaded",function(){var i=document.getElementById("rankpublish_code");if(!i){return;}i.addEventListener("input",function(){this.value=this.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);});});'
		);
	}

	public function handle(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		if ( isset( $_POST['rankpublish_disconnect'] ) ) {
			check_admin_referer( 'rankpublish_disconnect' );
			delete_option( 'rankpublish_site_id' );
			delete_option( 'rankpublish_signing_secret' );
			delete_option( 'rankpublish_api_key' );
			delete_option( 'rankpublish_plan' );
			delete_option( 'nashir_site_id' );
			delete_option( 'nashir_signing_secret' );
			add_settings_error( 'rankpublish_cloud', 'disconnected', __( 'Site disconnected from RankPublish Cloud.', 'rankpublish' ), 'updated' );
			return;
		}

		if ( isset( $_POST['rankpublish_connect'] ) ) {
			check_admin_referer( 'rankpublish_connect' );
			$app_url = isset( $_POST['rankpublish_app_url'] ) ? esc_url_raw( wp_unslash( (string) $_POST['rankpublish_app_url'] ) ) : '';
			$code    = isset( $_POST['rankpublish_code'] ) ? sanitize_text_field( wp_unslash( (string) $_POST['rankpublish_code'] ) ) : '';
			$result  = Cloud_Client::pair( $app_url, $code );

			if ( is_wp_error( $result ) ) {
				add_settings_error( 'rankpublish_cloud', 'connect', $result->get_error_message() );
				return;
			}

			Cloud_Client::store_connection( $result, $app_url );
			Cloud_Client::sync_capabilities();
			Heartbeat::ensure_scheduled();
			Sync::push_all();
			delete_transient( 'rankpublish_show_onboarding' );
			Cloud_Client::fetch_workspace();
			add_settings_error( 'rankpublish_cloud', 'connected', __( 'Connected to RankPublish Cloud.', 'rankpublish' ), 'updated' );
		}
	}

	public function render(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$app_url   = (string) get_option( 'rankpublish_app_url', '' );
		$site_id   = (string) get_option( 'rankpublish_site_id', '' );
		$connected = Rest::is_connected();
		$health    = rest_url( 'rankpublish/v1/health' );
		$default   = '' !== $app_url ? untrailingslashit( $app_url ) : Onboarding::default_app_url();

		echo '<div class="wrap rp-wizard-wrap">';
		Onboarding::render_wizard( $connected, $default, $site_id, $health );
		echo '</div>';
	}

	private function is_cloud_screen(): bool {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only screen detection.
		$page = isset( $_GET['page'] ) ? sanitize_key( (string) wp_unslash( $_GET['page'] ) ) : '';
		return 'rankpublish-cloud' === $page;
	}
}
