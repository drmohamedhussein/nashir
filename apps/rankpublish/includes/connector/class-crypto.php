<?php
/**
 * HMAC signing for RankPublish Cloud ↔ site requests.
 *
 * @package RankPublish
 */

declare(strict_types=1);

namespace RankPublish\Connector;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Request signing utilities (compatible with Nashir SaaS headers).
 */
final class Crypto {

	/**
	 * Build a hex HMAC-SHA256 signature.
	 */
	public static function sign( string $secret, string $timestamp, string $body ): string {
		return hash_hmac( 'sha256', $timestamp . '.' . $body, $secret );
	}

	/**
	 * Verify inbound signature (RankPublish or legacy Nashir headers).
	 */
	public static function verify_request( \WP_REST_Request $request ): bool {
		$secret = (string) get_option( 'rankpublish_signing_secret', '' );
		if ( $secret === '' ) {
			$secret = (string) get_option( 'nashir_signing_secret', '' );
		}
		if ( $secret === '' ) {
			return false;
		}

		$timestamp = (string) ( $request->get_header( 'x-rankpublish-timestamp' )
			?: $request->get_header( 'x-nashir-timestamp' ) );
		$signature = (string) ( $request->get_header( 'x-rankpublish-signature' )
			?: $request->get_header( 'x-nashir-signature' ) );
		$body      = (string) $request->get_body();

		return self::verify( $secret, $timestamp, $body, $signature );
	}

	public static function verify( string $secret, string $timestamp, string $body, string $signature ): bool {
		if ( $secret === '' || $signature === '' || $timestamp === '' ) {
			return false;
		}

		$age = abs( time() - (int) $timestamp );
		if ( $age > 300 ) {
			return false;
		}

		$expected = self::sign( $secret, $timestamp, $body );
		return hash_equals( $expected, $signature );
	}

	public static function token( int $bytes = 32 ): string {
		return bin2hex( random_bytes( $bytes ) );
	}
}
