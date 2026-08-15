<?php
/**
 * Remove stored connection secrets on uninstall.
 *
 * @package Nashir
 */

declare(strict_types=1);

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_option( 'nashir_app_url' );
delete_option( 'nashir_site_id' );
delete_option( 'nashir_api_key' );
delete_option( 'nashir_signing_secret' );
