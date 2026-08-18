<?php
/**
 * Build downloadable connector ZIP packages for customer WordPress sites.
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Packages RankPublish Bridge (and documents product plugin zip path).
 */
final class RankPublish_Site_Connector_Packages {

	public const UPLOAD_SUBDIR = 'rankpublish';

	/**
	 * Register admin hooks.
	 */
	public function init(): void {
		add_action( 'admin_post_rpsite_build_bridge_zip', array( $this, 'handle_build_bridge_zip' ) );
	}

	/**
	 * Ensure uploads/rankpublish exists.
	 */
	public static function uploads_dir(): string {
		$upload = wp_upload_dir();
		$dir    = trailingslashit( (string) $upload['basedir'] ) . self::UPLOAD_SUBDIR;
		if ( ! is_dir( $dir ) ) {
			wp_mkdir_p( $dir );
		}
		return $dir;
	}

	/**
	 * @return string Public URL or empty.
	 */
	public static function bridge_zip_url(): string {
		$upload = wp_upload_dir();
		$path   = self::uploads_dir() . '/rankpublish-bridge.zip';
		if ( ! file_exists( $path ) ) {
			return '';
		}
		return trailingslashit( (string) $upload['baseurl'] ) . self::UPLOAD_SUBDIR . '/rankpublish-bridge.zip';
	}

	/**
	 * @return string Public URL or empty.
	 */
	public static function product_zip_url(): string {
		$path = self::uploads_dir() . '/rankpublish.zip';
		if ( ! file_exists( $path ) ) {
			return '';
		}
		$upload = wp_upload_dir();
		return trailingslashit( (string) $upload['baseurl'] ) . self::UPLOAD_SUBDIR . '/rankpublish.zip';
	}

	/**
	 * Build rankpublish-bridge.zip from bundled source.
	 *
	 * @return string Absolute path to zip.
	 */
	public function build_bridge_zip(): string {
		if ( ! class_exists( 'ZipArchive' ) ) {
			throw new RuntimeException( 'ZipArchive is required to build connector packages.' );
		}

		$source = RPSITE_PATH . 'includes/bridge/rankpublish-bridge.php';
		if ( ! file_exists( $source ) ) {
			throw new RuntimeException( 'Bridge source is missing.' );
		}

		$dest = self::uploads_dir() . '/rankpublish-bridge.zip';
		$zip  = new ZipArchive();
		if ( true !== $zip->open( $dest, ZipArchive::CREATE | ZipArchive::OVERWRITE ) ) {
			throw new RuntimeException( 'Could not create bridge zip.' );
		}

		$header = "<?php\n/**\n * Plugin Name: RankPublish Bridge\n * Description: Securely connects a WordPress site to a RankPublish workspace.\n * Version: 0.2.0\n * Requires at least: 6.3\n * Requires PHP: 8.0\n * License: GPL-2.0-or-later\n * Text Domain: rankpublish-bridge\n */\n\ndeclare(strict_types=1);\n\nif ( ! defined( 'ABSPATH' ) ) {\n\texit;\n}\n\nrequire_once __DIR__ . '/includes/bootstrap.php';\n";

		$zip->addFromString( 'rankpublish-bridge/rankpublish-bridge.php', $header );
		$zip->addFromString( 'rankpublish-bridge/includes/bootstrap.php', (string) file_get_contents( $source ) );
		$zip->addFromString( 'rankpublish-bridge/readme.txt', $this->bridge_readme() );
		$zip->close();

		return $dest;
	}

	public function handle_build_bridge_zip(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Forbidden', 'rankpublish-site' ) );
		}
		check_admin_referer( 'rpsite_build_bridge_zip' );

		try {
			$this->build_bridge_zip();
			wp_safe_redirect( admin_url( 'admin.php?page=rankpublish-core-connectors&built=1' ) );
		} catch ( Throwable $e ) {
			wp_safe_redirect(
				add_query_arg(
					'error',
					rawurlencode( $e->getMessage() ),
					admin_url( 'admin.php?page=rankpublish-core-connectors' )
				)
			);
		}
		exit;
	}

	private function bridge_readme(): string {
		return "=== RankPublish Bridge ===\nVersion: 0.2.0\n\nLightweight connector for RankPublish cloud workspaces.\nDoes not include SchedulePress or ThinkRank.\n";
	}
}
