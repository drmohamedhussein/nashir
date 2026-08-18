<?php
/**
 * File-level audit: upstream plugin dir vs rankpublish/modules/* on this site.
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Compares trees and classifies diffs (expected embed hooks vs needs review).
 */
final class RankPublish_Site_Merge_Audit {

	/**
	 * Run audit for all modules.
	 *
	 * @return array<string, mixed>
	 */
	public function run_all(): array {
		$modules = RankPublish_Site_Merge_Registry::modules();
		$rows    = array();

		foreach ( $modules as $module ) {
			$rows[ (string) $module['id'] ] = $this->audit_module( $module );
		}

		$payload = array(
			'audited_at' => gmdate( 'c' ),
			'modules'    => $rows,
		);

		update_option( RankPublish_Site_Merge_Registry::OPTION_LAST_AUDIT, $payload, false );

		return $payload;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function last_audit(): ?array {
		$stored = get_option( RankPublish_Site_Merge_Registry::OPTION_LAST_AUDIT, null );
		return is_array( $stored ) ? $stored : null;
	}

	/**
	 * @param array<string, mixed> $module Module config.
	 * @return array<string, mixed>
	 */
	public function audit_module( array $module ): array {
		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$id = (string) ( $module['id'] ?? '' );

		$upstream = RankPublish_Site_Merge_Registry::upstream_dir( $module );
		$merged   = RankPublish_Site_Merge_Registry::merged_dir( $module );

		$base = array(
			'id'                 => $id,
			'label'              => (string) ( $module['label'] ?? $id ),
			'upstream_installed' => RankPublish_Site_Merge_Registry::upstream_installed( $module ),
			'merged_installed'   => RankPublish_Site_Merge_Registry::merged_installed( $module ),
			'upstream_version'   => RankPublish_Site_Merge_Registry::upstream_version( $module ),
			'merged_version'     => RankPublish_Site_Merge_Registry::merged_version( $module ),
			'upstream_active'    => is_plugin_active( (string) ( $module['basename'] ?? '' ) ),
			'product_active'     => is_plugin_active( 'rankpublish/rankpublish.php' ),
		);

		if ( ! is_dir( $upstream ) || ! is_dir( $merged ) ) {
			return array_merge(
				$base,
				array(
					'status'  => 'missing',
					'message' => __( 'Upstream or merged module directory not found on this site.', 'rankpublish-site' ),
				)
			);
		}

		$embed_hooks = array_map(
			static fn( $p ) => str_replace( '\\', '/', (string) $p ),
			(array) ( $module['embed_hooks'] ?? array() )
		);
		$skip        = array_merge(
			(array) ( $module['skip_paths'] ?? array() ),
			array(
				(string) ( $module['upstream_entry'] ?? '' ),
				'ATTRIBUTION.md',
			)
		);

		$upstream_files = $this->list_files( $upstream );
		$merged_files   = $this->list_files( $merged );

		$keys = array_unique( array_merge( array_keys( $upstream_files ), array_keys( $merged_files ) ) );
		sort( $keys );

		$same           = array();
		$expected_diff  = array();
		$unexpected     = array();
		$added_merged   = array();
		$removed_merged = array();

		foreach ( $keys as $rel ) {
			if ( $this->should_skip( $rel, $skip ) ) {
				continue;
			}

			$u = $upstream_files[ $rel ] ?? null;
			$m = $merged_files[ $rel ] ?? null;

			if ( $u && ! $m ) {
				$removed_merged[] = $rel;
				continue;
			}
			if ( ! $u && $m ) {
				$added_merged[] = $rel;
				continue;
			}
			if ( ! $u || ! $m ) {
				continue;
			}

			$uh = hash_file( 'sha256', $u );
			$mh = hash_file( 'sha256', $m );
			if ( $uh === $mh ) {
				$same[] = $rel;
				continue;
			}

			if ( in_array( $rel, $embed_hooks, true ) ) {
				$expected_diff[] = $rel;
			} else {
				$unexpected[] = array(
					'path'     => $rel,
					'upstream' => substr( $uh, 0, 12 ),
					'merged'   => substr( $mh, 0, 12 ),
				);
			}
		}

		$version_pending = false;
		if ( $base['upstream_version'] && $base['merged_version'] ) {
			$version_pending = version_compare( $base['upstream_version'], $base['merged_version'], '>' );
		}

		$status = 'ok';
		if ( $version_pending || array() !== $unexpected ) {
			$status = 'action';
		} elseif ( array() !== $expected_diff ) {
			$status = 'ok_hooks';
		}

		return array_merge(
			$base,
			array(
				'status'          => $status,
				'version_pending' => $version_pending,
				'summary'         => array(
					'same'           => count( $same ),
					'expected_diff'  => count( $expected_diff ),
					'unexpected'     => count( $unexpected ),
					'added_merged'   => count( $added_merged ),
					'removed_merged' => count( $removed_merged ),
				),
				'expected_diff'   => $expected_diff,
				'unexpected'      => $unexpected,
				'added_merged'    => $added_merged,
				'removed_merged'  => $removed_merged,
			)
		);
	}

	/**
	 * @return array<string, string> relative => absolute
	 */
	private function list_files( string $root ): array {
		$out  = array();
		$iter = new RecursiveIteratorIterator(
			new RecursiveDirectoryIterator( $root, FilesystemIterator::SKIP_DOTS )
		);

		foreach ( $iter as $file ) {
			if ( ! $file->isFile() ) {
				continue;
			}
			$rel = str_replace( '\\', '/', substr( $file->getPathname(), strlen( $root ) + 1 ) );
			$out[ $rel ] = $file->getPathname();
		}

		return $out;
	}

	/**
	 * @param string        $rel  Relative path.
	 * @param array<int,string> $skip Skip fragments.
	 */
	private function should_skip( string $rel, array $skip ): bool {
		foreach ( $skip as $frag ) {
			if ( '' === $frag ) {
				continue;
			}
			if ( str_contains( $rel, $frag ) ) {
				return true;
			}
		}
		return false;
	}
}
