<?php
/**
 * HMAC helpers for signed requests between Nashir cloud and this site.
 *
 * @package Nashir
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Request signing utilities.
 */
final class Nashir_Crypto {

	/**
	 * Build a hex HMAC-SHA256 signature.
	 *
	 * @param string $secret  Shared signing secret.
	 * @param string $timestamp Unix timestamp as string.
	 * @param string $body    Raw request body.
	 */
	public static function sign( string $secret, string $timestamp, string $body ): string {
		return hash_hmac( 'sha256', $timestamp . '.' . $body, $secret );
	}

	/**
	 * Compare signatures in constant time.
	 */
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

	/**
	 * Generate a random token.
	 */
	public static function token( int $bytes = 32 ): string {
		return bin2hex( random_bytes( $bytes ) );
	}
}
