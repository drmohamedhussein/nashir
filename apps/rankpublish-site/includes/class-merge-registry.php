<?php
/**
 * Module map: upstream GPL plugins ↔ rankpublish/modules/*.
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registry for merge audit and update watch.
 */
final class RankPublish_Site_Merge_Registry {

	public const OPTION_MERGED_VERSIONS = 'rankpublish_site_merged_versions';
	public const OPTION_SETTINGS        = 'rankpublish_site_core_settings';
	public const OPTION_LAST_AUDIT      = 'rankpublish_site_last_audit';

	/**
	 * @return list<array<string, mixed>>
	 */
	public static function modules(): array {
		$file = RPSITE_PATH . 'data/modules.json';
		if ( ! is_readable( $file ) ) {
			return array();
		}

		$data = json_decode( (string) file_get_contents( $file ), true );
		return is_array( $data ) ? $data : array();
	}

	/**
	 * @return array<string, string> basename => merged version.
	 */
	public static function merged_versions(): array {
		$stored = get_option( self::OPTION_MERGED_VERSIONS, array() );
		if ( is_array( $stored ) && array() !== $stored ) {
			return array_filter(
				$stored,
				static fn( $v, $k ) => is_string( $k ) && is_string( $v ) && str_contains( $k, '/' ),
				ARRAY_FILTER_USE_BOTH
			);
		}

		$file = RPSITE_PATH . 'data/merged-versions.json';
		if ( ! is_readable( $file ) ) {
			return array();
		}

		$data = json_decode( (string) file_get_contents( $file ), true );
		return is_array( $data ) ? $data : array();
	}

	/**
	 * @param array<string, string> $versions Basename => version.
	 */
	public static function save_merged_versions( array $versions ): void {
		update_option( self::OPTION_MERGED_VERSIONS, $versions, false );
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function settings(): array {
		$defaults = array(
			'cloud_url'          => 'https://nashir.satest.top',
			'branding_enabled'   => true,
			'dev_stack_mode'     => false,
		);

		$stored = get_option( self::OPTION_SETTINGS, array() );
		if ( ! is_array( $stored ) ) {
			return $defaults;
		}

		return array_merge( $defaults, $stored );
	}

	/**
	 * @param array<string, mixed> $settings Settings.
	 */
	public static function save_settings( array $settings ): void {
		$current = self::settings();
		update_option( self::OPTION_SETTINGS, array_merge( $current, $settings ), false );
	}

	/**
	 * @param array<string, mixed> $module Module row from modules.json.
	 */
	public static function upstream_dir( array $module ): string {
		return WP_PLUGIN_DIR . '/' . (string) ( $module['slug'] ?? '' );
	}

	/**
	 * @param array<string, mixed> $module Module row.
	 */
	public static function merged_dir( array $module ): string {
		return WP_PLUGIN_DIR . '/' . (string) ( $module['merged_subpath'] ?? '' );
	}

	/**
	 * @param array<string, mixed> $module Module row.
	 */
	public static function upstream_installed( array $module ): bool {
		$basename = (string) ( $module['basename'] ?? '' );
		if ( '' === $basename ) {
			return false;
		}

		return is_readable( WP_PLUGIN_DIR . '/' . $basename );
	}

	/**
	 * @param array<string, mixed> $module Module row.
	 */
	public static function merged_installed( array $module ): bool {
		$dir = self::merged_dir( $module );
		$entry = (string) ( $module['merged_entry'] ?? 'bootstrap.php' );

		return is_readable( $dir . '/' . $entry );
	}

	/**
	 * @param array<string, mixed> $module Module row.
	 */
	public static function upstream_version( array $module ): string {
		if ( ! function_exists( 'get_plugin_data' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$basename = (string) ( $module['basename'] ?? '' );
		$path     = WP_PLUGIN_DIR . '/' . $basename;
		if ( ! is_readable( $path ) ) {
			return '';
		}

		return (string) ( get_plugin_data( $path, false, false )['Version'] ?? '' );
	}

	/**
	 * @param array<string, mixed> $module Module row.
	 */
	public static function merged_version( array $module ): string {
		$map = self::merged_versions();
		$key = (string) ( $module['basename'] ?? '' );

		return (string) ( $map[ $key ] ?? '' );
	}

	/**
	 * @param array<string, mixed> $module Module row.
	 */
	public static function product_version(): string {
		if ( ! defined( 'RANKPUBLISH_VERSION' ) ) {
			$file = WP_PLUGIN_DIR . '/rankpublish/rankpublish.php';
			if ( ! is_readable( $file ) ) {
				return '';
			}
			if ( ! function_exists( 'get_plugin_data' ) ) {
				require_once ABSPATH . 'wp-admin/includes/plugin.php';
			}
			return (string) ( get_plugin_data( $file, false, false )['Version'] ?? '' );
		}

		return RANKPUBLISH_VERSION;
	}
}
