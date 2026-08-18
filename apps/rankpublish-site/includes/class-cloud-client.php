<?php
/**
 * Outbound signed requests from Site Core to RankPublish Cloud.
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * HMAC-signed HTTP client (mirrors RankPublish connector).
 */
final class RankPublish_Site_Cloud_Client {

	/**
	 * @return array<string, mixed>|\WP_Error
	 */
	public static function signed_post( string $path_suffix, array $payload = array() ) {
		$creds = self::credentials();
		if ( is_wp_error( $creds ) ) {
			return $creds;
		}

		$body      = wp_json_encode( $payload );
		$timestamp = (string) time();
		$signature = self::sign( $creds['secret'], $timestamp, (string) $body );

		$response = wp_remote_post(
			$creds['app_url'] . '/api/v1/sites/' . rawurlencode( $creds['site_id'] ) . $path_suffix,
			array(
				'timeout' => 20,
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

		return self::decode( $response, __( 'Could not reach RankPublish Cloud.', 'rankpublish-site' ) );
	}

	/**
	 * Fetch workspace snapshot (sites, subscription, module stats).
	 *
	 * @return array<string, mixed>|\WP_Error
	 */
	public static function fetch_workspace() {
		$result = self::signed_post( '/workspace', array() );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		if ( empty( $result['ok'] ) || ! is_array( $result['data'] ?? null ) ) {
			return new \WP_Error( 'rankpublish_workspace', __( 'Invalid workspace response from RankPublish Cloud.', 'rankpublish-site' ) );
		}
		return $result['data'];
	}

	/**
	 * @return array{app_url: string, site_id: string, secret: string}|\WP_Error
	 */
	private static function credentials() {
		$app_url = (string) get_option( 'rankpublish_app_url', '' );
		$site_id = (string) get_option( 'rankpublish_site_id', '' );
		$secret  = (string) get_option( 'rankpublish_signing_secret', '' );
		if ( '' === $app_url ) {
			$app_url = (string) get_option( 'nashir_app_url', '' );
		}
		if ( '' === $site_id ) {
			$site_id = (string) get_option( 'nashir_site_id', '' );
		}
		if ( '' === $secret ) {
			$secret = (string) get_option( 'nashir_signing_secret', '' );
		}
		if ( '' === $app_url || '' === $site_id || '' === $secret ) {
			return new \WP_Error( 'rankpublish_not_connected', __( 'Site is not connected to RankPublish Cloud.', 'rankpublish-site' ) );
		}
		return array(
			'app_url' => untrailingslashit( $app_url ),
			'site_id' => $site_id,
			'secret'  => $secret,
		);
	}

	private static function sign( string $secret, string $timestamp, string $body ): string {
		return hash_hmac( 'sha256', $timestamp . '.' . $body, $secret );
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
			$message = is_array( $data ) && isset( $data['error']['message'] )
				? (string) $data['error']['message']
				: ( is_array( $data ) && isset( $data['error'] ) ? (string) $data['error'] : $fallback );
			return new \WP_Error( 'rankpublish_http', $message, array( 'status' => $status ) );
		}
		return $data;
	}
}
