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

		echo '<div class="wrap">';
		echo '<h1>' . esc_html__( 'RankPublish Cloud Connect', 'rankpublish' ) . '</h1>';
		settings_errors( 'rankpublish_cloud' );

		if ( ! $connected || isset( $_GET['welcome'] ) ) {
			Onboarding::render_welcome();
		}

		if ( $connected ) {
			echo '<p><strong>' . esc_html__( 'Status:', 'rankpublish' ) . '</strong> ';
			echo esc_html__( 'Connected', 'rankpublish' ) . '</p>';
			echo '<p><code>' . esc_html( $site_id ) . '</code></p>';
			echo '<p>' . esc_html__( 'Connector REST:', 'rankpublish' ) . ' <code>' . esc_url( $health ) . '</code></p>';

			echo '<form method="post">';
			wp_nonce_field( 'rankpublish_disconnect' );
			submit_button( __( 'Disconnect', 'rankpublish' ), 'delete', 'rankpublish_disconnect', false );
			echo '</form>';
		} else {
			echo '<p>' . esc_html__( 'Generate a pairing code in RankPublish Cloud, then enter it here.', 'rankpublish' ) . '</p>';
			echo '<form method="post" class="rankpublish-cloud-form">';
			wp_nonce_field( 'rankpublish_connect' );
			echo '<table class="form-table"><tbody>';
			echo '<tr><th><label for="rankpublish_app_url">' . esc_html__( 'Cloud app URL', 'rankpublish' ) . '</label></th>';
			$default_app = $app_url !== '' ? $app_url : Onboarding::default_app_url();
			echo '<td><input name="rankpublish_app_url" id="rankpublish_app_url" type="url" class="regular-text" value="' . esc_attr( $default_app ) . '" placeholder="https://nashir.satest.top" required /></td></tr>';
			echo '<tr><th><label for="rankpublish_code">' . esc_html__( 'Pairing code', 'rankpublish' ) . '</label></th>';
			echo '<td><input name="rankpublish_code" id="rankpublish_code" type="text" class="regular-text" maxlength="6" pattern="[A-Za-z0-9]{6}" required /></td></tr>';
			echo '</tbody></table>';
			submit_button( __( 'Connect site', 'rankpublish' ), 'primary', 'rankpublish_connect' );
			echo '</form>';
		}

		echo '<h2>' . esc_html__( 'Integrations on this site', 'rankpublish' ) . '</h2>';
		echo '<ul>';
		foreach ( Registry::integration_manifest() as $row ) {
			echo '<li><strong>' . esc_html( (string) $row['label'] ) . '</strong> — ';
			echo esc_html( (string) ( $row['version'] ?? '?' ) ) . '</li>';
		}
		echo '</ul>';
		echo '</div>';
	}
}
