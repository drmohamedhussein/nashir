<?php
/**
 * HTTP client for the Nashir cloud API.
 *
 * @package PublisherWP
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
	 * Activate this site by signing in to a Nashir account.
	 *
	 * @return array<string, mixed>|WP_Error
	 */
	public static function activate( string $app_url, string $email, string $password ) {
		$app_url = untrailingslashit( esc_url_raw( $app_url ) );
		$email   = sanitize_email( $email );

		if ( $app_url === '' || $email === '' || $password === '' ) {
			return new WP_Error( 'nashir_invalid_input', __( 'أدخل رابط PublisherWP والبريد وكلمة المرور.', 'nashir' ) );
		}
		if ( self::is_local_app_url( $app_url ) ) {
			return new WP_Error( 'nashir_local_url', __( 'لا تستخدم 127.0.0.1 أو localhost. مواقع الزبائن تحتاج رابط تطبيق PublisherWP السحابي العام.', 'nashir' ) );
		}

		$body = wp_json_encode(
			array(
				'email'      => $email,
				'password'   => $password,
				'site_url'   => home_url(),
				'site_name'  => wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ),
				'rest_url'   => rest_url( 'nashir/v1/' ),
				'wp_version' => get_bloginfo( 'version' ),
			)
		);

		$response = wp_remote_post(
			$app_url . '/api/v1/license/activate',
			array(
				'timeout' => 20,
				'headers' => array(
					'Content-Type' => 'application/json',
					'Accept'       => 'application/json',
				),
				'body'    => $body,
			)
		);

		return self::decode( $response, __( 'تعذر تفعيل الترخيص.', 'nashir' ) );
	}

	/**
	 * Pair this site with a Nashir workspace using a short-lived code.
	 *
	 * @return array<string, mixed>|WP_Error
	 */
	public static function pair( string $app_url, string $code ) {
		$app_url = untrailingslashit( esc_url_raw( $app_url ) );
		$code    = strtoupper( sanitize_text_field( $code ) );

		if ( $app_url === '' || ! preg_match( '/^[A-Z0-9]{6}$/', $code ) ) {
			return new WP_Error( 'nashir_invalid_input', __( 'رابط PublisherWP أو رمز الربط غير صالح.', 'nashir' ) );
		}
		if ( self::is_local_app_url( $app_url ) ) {
			return new WP_Error( 'nashir_local_url', __( 'لا تستخدم 127.0.0.1 أو localhost. مواقع الزبائن تحتاج رابط تطبيق PublisherWP السحابي العام.', 'nashir' ) );
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

		return self::decode( $response, __( 'تعذر ربط الموقع بPublisherWP.', 'nashir' ) );
	}

	/**
	 * Push local post metadata to Nashir.
	 *
	 * @param array<string, mixed> $payload
	 * @return array<string, mixed>|WP_Error
	 */
	public static function sync( array $payload ) {
		return self::signed_post( '/sync', $payload, 15, __( 'تعذر مزامنة المقال مع PublisherWP.', 'nashir' ) );
	}

	/**
	 * Tell Nashir this site is alive and process due jobs.
	 *
	 * @return array<string, mixed>|WP_Error
	 */
	public static function heartbeat() {
		return self::signed_post( '/heartbeat', new stdClass(), 8, __( 'تعذر إرسال النبضة.', 'nashir' ) );
	}

	/**
	 * @param array<string, mixed>|stdClass $payload
	 * @return array<string, mixed>|WP_Error
	 */
	private static function signed_post( string $path_suffix, $payload, int $timeout, string $fail_message ) {
		$app_url = untrailingslashit( (string) get_option( 'nashir_app_url', '' ) );
		$site_id = (string) get_option( 'nashir_site_id', '' );
		$secret  = (string) get_option( 'nashir_signing_secret', '' );

		if ( $app_url === '' || $site_id === '' || $secret === '' ) {
			return new WP_Error( 'nashir_not_connected', __( 'الموقع غير مربوط بPublisherWP.', 'nashir' ) );
		}

		$body      = wp_json_encode( $payload );
		$timestamp = (string) time();
		$signature = Nashir_Crypto::sign( $secret, $timestamp, (string) $body );

		$response = wp_remote_post(
			$app_url . '/api/v1/sites/' . rawurlencode( $site_id ) . $path_suffix,
			array(
				'timeout' => $timeout,
				'headers' => array(
					'Content-Type'       => 'application/json',
					'Accept'             => 'application/json',
					'X-Nashir-Timestamp' => $timestamp,
					'X-Nashir-Signature' => $signature,
				),
				'body'    => $body,
			)
		);

		return self::decode( $response, $fail_message );
	}

	private static function is_local_app_url( string $app_url ): bool {
		$host = (string) wp_parse_url( $app_url, PHP_URL_HOST );
		$host = strtolower( $host );
		return in_array( $host, array( '127.0.0.1', 'localhost', '::1' ), true );
	}

	/**
	 * @param array<string, mixed>|WP_Error $response
	 * @return array<string, mixed>|WP_Error
	 */
	private static function decode( $response, string $fallback ) {
		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$status = (int) wp_remote_retrieve_response_code( $response );
		$data   = json_decode( (string) wp_remote_retrieve_body( $response ), true );

		if ( $status < 200 || $status >= 300 || ! is_array( $data ) ) {
			$message = is_array( $data ) && isset( $data['error'] ) ? (string) $data['error'] : $fallback;
			return new WP_Error( 'nashir_http', $message, array( 'status' => $status ) );
		}

		return $data;
	}
}
