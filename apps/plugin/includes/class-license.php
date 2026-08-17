<?php
/**
 * License: vendor site is always licensed. Other sites need a Nashir subscription.
 *
 * @package PublisherWP
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nashir_License {

	/**
	 * @return array<int, string>
	 */
	public static function vendor_hosts(): array {
		return array(
			'nashir.satest.top',
			'www.nashir.satest.top',
			'getnashir.com',
			'www.getnashir.com',
		);
	}

	public static function is_vendor_site(): bool {
		$host = (string) wp_parse_url( home_url(), PHP_URL_HOST );
		$host = strtolower( $host );
		return in_array( $host, self::vendor_hosts(), true );
	}

	public static function licensed(): bool {
		if ( self::is_vendor_site() ) {
			return true;
		}
		$site_id = (string) get_option( 'nashir_site_id', '' );
		$secret  = (string) get_option( 'nashir_signing_secret', '' );
		return $site_id !== '' && $secret !== '';
	}

	public static function maybe_bootstrap_vendor(): void {
		if ( ! self::is_vendor_site() ) {
			return;
		}
		if ( 'vendor' !== (string) get_option( 'nashir_license_mode', '' ) ) {
			update_option( 'nashir_license_mode', 'vendor' );
			update_option( 'nashir_vendor_license', '1' );
		}
		$app = (string) get_option( 'nashir_app_url', '' );
		if ( $app !== '' && ( false !== strpos( $app, '127.0.0.1' ) || false !== strpos( $app, 'localhost' ) ) ) {
			update_option( 'nashir_app_url', '' );
		}
	}
}
