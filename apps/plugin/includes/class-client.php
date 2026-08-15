<?php
/**
 * HTTP client for the Nashir cloud API.
 *
 * @package Nashir
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Outbound calls from WordPress to Nashir.
 */
final class Nashir_Client {

	/**
	 * Pair this site with a Nashir workspace using a short-lived code.
	 *
	 * @return array<string, mixed>|WP_Error
	 */
	public static function pair( string $app_url, string $code ) {
		$app_url = untrailingslashit( esc_url_raw( $app_url ) );
		$code    = strtoupper( sanitize_text_field( $code ) );

		if ( $app_url === '' || ! preg_match( '/^[A-Z0-9]{6}$/', $code ) ) {
			return new WP_Error( 'nashir_invalid_input', __( 'رابط ناشر أو رمز الربط غير صالح.', 'nashir' ) );
		}

		$body = wp_json_encode(
			array(
				'code'       => $code,
				'site_url'   => home_url(),
				'site_name'  => wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ),
				'rest_url'   => rest_url( 'nashir/v1/' ),
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

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$status = (int) wp_remote_retrieve_response_code( $response );
		$data   = json_decode( (string) wp_remote_retrieve_body( $response ), true );

		if ( $status < 200 || $status >= 300 || ! is_array( $data ) ) {
			$message = is_array( $data ) && isset( $data['error'] ) ? (string) $data['error'] : __( 'تعذر ربط الموقع بناشر.', 'nashir' );
			return new WP_Error( 'nashir_connect_failed', $message );
		}

		return $data;
	}

	/**
	 * Push local post metadata to Nashir.
	 *
	 * @param array<string, mixed> $payload
	 * @return array<string, mixed>|WP_Error
	 */
	public static function sync( array $payload ) {
		$app_url = untrailingslashit( (string) get_option( 'nashir_app_url', '' ) );
		$site_id = (string) get_option( 'nashir_site_id', '' );
		$secret  = (string) get_option( 'nashir_signing_secret', '' );

		if ( $app_url === '' || $site_id === '' || $secret === '' ) {
			return new WP_Error( 'nashir_not_connected', __( 'الموقع غير مربوط بناشر.', 'nashir' ) );
		}

		$body      = wp_json_encode( $payload );
		$timestamp = (string) time();
		$signature = Nashir_Crypto::sign( $secret, $timestamp, (string) $body );

		$response = wp_remote_post(
			$app_url . '/api/v1/sites/' . rawurlencode( $site_id ) . '/sync',
			array(
				'timeout' => 15,
				'headers' => array(
					'Content-Type'         => 'application/json',
					'Accept'               => 'application/json',
					'X-Nashir-Timestamp'   => $timestamp,
					'X-Nashir-Signature'   => $signature,
				),
				'body'    => $body,
			)
		);

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$status = (int) wp_remote_retrieve_response_code( $response );
		if ( $status < 200 || $status >= 300 ) {
			return new WP_Error( 'nashir_sync_failed', __( 'تعذر مزامنة المقال مع ناشر.', 'nashir' ) );
		}

		return json_decode( (string) wp_remote_retrieve_body( $response ), true );
	}

	/**
	 * Tell Nashir this site is alive and process due jobs.
	 *
	 * @return array<string, mixed>|WP_Error
	 */
	public static function heartbeat() {
		$app_url = untrailingslashit( (string) get_option( 'nashir_app_url', '' ) );
		$site_id = (string) get_option( 'nashir_site_id', '' );
		$secret  = (string) get_option( 'nashir_signing_secret', '' );

		if ( $app_url === '' || $site_id === '' || $secret === '' ) {
			return new WP_Error( 'nashir_not_connected', __( 'الموقع غير مربوط بناشر.', 'nashir' ) );
		}

		$body      = wp_json_encode( new stdClass() );
		$timestamp = (string) time();
		$signature = Nashir_Crypto::sign( $secret, $timestamp, (string) $body );

		$response = wp_remote_post(
			$app_url . '/api/v1/sites/' . rawurlencode( $site_id ) . '/heartbeat',
			array(
				'timeout' => 8,
				'headers'  => array(
					'Content-Type'       => 'application/json',
					'Accept'             => 'application/json',
					'X-Nashir-Timestamp' => $timestamp,
					'X-Nashir-Signature' => $signature,
				),
				'body'     => $body,
			)
		);

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		return array( 'ok' => true );
	}
}
