<?php
/**
 * Outbound HTTP to RankPublish Cloud (Nashir web app).
 *
 * @package RankPublish
 */

declare(strict_types=1);

namespace RankPublish\Connector;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Pairing, heartbeat, and capability sync to SaaS.
 */
final class Cloud_Client {

	/**
	 * Pair site using a 6-character workspace code.
	 *
	 * @return array<string, mixed>|\WP_Error
	 */
	public static function pair( string $app_url, string $code ) {
		$app_url = untrailingslashit( esc_url_raw( $app_url ) );
		$code    = strtoupper( sanitize_text_field( $code ) );

		if ( $app_url === '' || ! preg_match( '/^[A-Z0-9]{6}$/', $code ) ) {
			return new \WP_Error( 'rankpublish_invalid_input', __( 'Invalid app URL or pairing code.', 'rankpublish' ) );
		}

		$body = wp_json_encode(
			array(
				'code'       => $code,
				'site_url'   => home_url(),
				'site_name'  => wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ),
				'rest_url'   => rest_url( 'rankpublish/v1/' ),
				'wp_version' => get_bloginfo( 'version' ),
			)
		);

		$response = wp_remote_post(
			$app_url . '/api/v1/connect',
			array(
				'timeout' => 20,
				'headers' => array(
					'Content-Type' => 'application/json',
					'Accept'       => 'application/json',
				),
				'body'    => $body,
			)
		);

		return self::decode( $response, __( 'Could not connect to RankPublish Cloud.', 'rankpublish' ) );
	}

	/**
	 * Push capabilities snapshot after connect.
	 *
	 * @return array<string, mixed>|\WP_Error
	 */
	public static function sync_capabilities(): array|\WP_Error {
		return self::signed_post(
			'/capabilities/sync',
			array(
				'integrations' => Registry::integration_manifest(),
				'capabilities' => Registry::capabilities(),
			),
			15,
			__( 'Could not sync capabilities.', 'rankpublish' )
		);
	}

	/**
	 * @param array<string, mixed> $payload
	 * @return array<string, mixed>|\WP_Error
	 */
	public static function signed_post( string $path_suffix, array $payload, int $timeout, string $fail_message ) {
		$app_url = untrailingslashit( (string) get_option( 'rankpublish_app_url', '' ) );
		$site_id = (string) get_option( 'rankpublish_site_id', '' );
		$secret  = (string) get_option( 'rankpublish_signing_secret', '' );

		if ( $app_url === '' ) {
			$app_url = untrailingslashit( (string) get_option( 'nashir_app_url', '' ) );
		}
		if ( $site_id === '' ) {
			$site_id = (string) get_option( 'nashir_site_id', '' );
		}
		if ( $secret === '' ) {
			$secret = (string) get_option( 'nashir_signing_secret', '' );
		}

		if ( $app_url === '' || $site_id === '' || $secret === '' ) {
			return new \WP_Error( 'rankpublish_not_connected', __( 'Site is not connected to RankPublish Cloud.', 'rankpublish' ) );
		}

		$body      = wp_json_encode( $payload );
		$timestamp = (string) time();
		$signature = Crypto::sign( $secret, $timestamp, (string) $body );

		$response = wp_remote_post(
			$app_url . '/api/v1/sites/' . rawurlencode( $site_id ) . $path_suffix,
			array(
				'timeout' => $timeout,
				'headers' => array(
					'Content-Type'            => 'application/json',
					'Accept'                  => 'application/json',
					'X-RankPublish-Timestamp' => $timestamp,
					'X-RankPublish-Signature' => $signature,
					'X-Nashir-Timestamp'      => $timestamp,
					'X-Nashir-Signature'      => $signature,
				),
				'body'    => $body,
			)
		);

		return self::decode( $response, $fail_message );
	}

	/**
	 * Persist connect response options.
	 *
	 * @param array<string, mixed> $result
	 */
	public static function store_connection( array $result, string $app_url ): void {
		update_option( 'rankpublish_app_url', untrailingslashit( $app_url ) );
		update_option( 'rankpublish_site_id', sanitize_text_field( (string) ( $result['site_id'] ?? '' ) ) );
		update_option( 'rankpublish_signing_secret', sanitize_text_field( (string) ( $result['signing_secret'] ?? '' ) ) );
		if ( isset( $result['workspace_id'] ) ) {
			update_option( 'rankpublish_workspace_id', sanitize_text_field( (string) $result['workspace_id'] ) );
		}
		if ( isset( $result['api_key'] ) ) {
			update_option( 'rankpublish_api_key', sanitize_text_field( (string) $result['api_key'] ) );
		}
		if ( isset( $result['plan'] ) ) {
			update_option( 'rankpublish_plan', wp_json_encode( $result['plan'] ) );
		}

		// Legacy Nashir keys for SaaS compatibility during transition.
		update_option( 'nashir_app_url', untrailingslashit( $app_url ) );
		update_option( 'nashir_site_id', sanitize_text_field( (string) ( $result['site_id'] ?? '' ) ) );
		update_option( 'nashir_signing_secret', sanitize_text_field( (string) ( $result['signing_secret'] ?? '' ) ) );
	}

	/**
	 * @return array<string, mixed>|\WP_Error
	 */
	public static function fetch_workspace() {
		$result = self::signed_post( '/workspace', array(), 20, __( 'Could not load workspace.', 'rankpublish' ) );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		if ( empty( $result['ok'] ) || ! is_array( $result['data'] ?? null ) ) {
			return new \WP_Error( 'rankpublish_workspace', __( 'Invalid workspace response.', 'rankpublish' ) );
		}
		return $result['data'];
	}

	/**
	 * @param array<string, mixed>|\WP_Error $response
	 * @return array<string, mixed>|\WP_Error
	 */
	private static function decode( $response, string $fallback ) {
		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$status = (int) wp_remote_retrieve_response_code( $response );
		$data   = json_decode( (string) wp_remote_retrieve_body( $response ), true );

		if ( $status < 200 || $status >= 300 || ! is_array( $data ) ) {
			$message = is_array( $data ) && isset( $data['error'] ) ? (string) $data['error'] : $fallback;
			return new \WP_Error( 'rankpublish_http', $message, array( 'status' => $status ) );
		}

		return $data;
	}
}
