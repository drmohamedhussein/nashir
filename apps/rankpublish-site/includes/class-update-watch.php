<?php
/**
 * Dev-only upstream update watcher for the four GPL source plugins.
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Compares active upstream plugin versions against merged baseline.
 */
final class RankPublish_Site_Update_Watch {

	private const OPTION = 'rankpublish_site_update_watch_dismiss';

	/**
	 * Register hooks.
	 */
	public function init(): void {
		add_action( 'admin_notices', array( $this, 'maybe_notice' ) );
		add_action( 'admin_post_rankpublish_site_dismiss_update_watch', array( $this, 'dismiss' ) );
	}

	/**
	 * @return list<array{label: string, current: string, merged: string}>
	 */
	private function pending_updates(): array {
		$settings = RankPublish_Site_Merge_Registry::settings();
		if ( empty( $settings['dev_stack_mode'] ) ) {
			return array();
		}

		if ( ! function_exists( 'get_plugin_data' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$merged  = RankPublish_Site_Merge_Registry::merged_versions();
		$pending = array();

		foreach ( RankPublish_Site_Merge_Registry::modules() as $module ) {
			$basename = (string) ( $module['basename'] ?? '' );
			if ( '' === $basename || ! is_plugin_active( $basename ) ) {
				continue;
			}

			$path = WP_PLUGIN_DIR . '/' . $basename;
			if ( ! is_readable( $path ) ) {
				continue;
			}

			$current = (string) ( get_plugin_data( $path, false, false )['Version'] ?? '' );
			$base    = (string) ( $merged[ $basename ] ?? '' );
			if ( '' === $current || '' === $base || ! version_compare( $current, $base, '>' ) ) {
				continue;
			}

			$pending[] = array(
				'label'   => (string) ( $module['label'] ?? $basename ),
				'current' => $current,
				'merged'  => $base,
			);
		}

		return $pending;
	}

	/**
	 * Show developer notice when upstream moved ahead of the merged bundle.
	 */
	public function maybe_notice(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$dismissed = get_option( self::OPTION, array() );
		if ( ! is_array( $dismissed ) ) {
			$dismissed = array();
		}

		$pending = array_values(
			array_filter(
				$this->pending_updates(),
				static function ( array $row ) use ( $dismissed ): bool {
					$key = sanitize_key( $row['label'] ) . '-' . $row['current'];
					return empty( $dismissed[ $key ] );
				}
			)
		);

		if ( array() === $pending ) {
			return;
		}

		$core_url    = admin_url( 'admin.php?page=rankpublish-core-merge' );
		$dismiss_url = wp_nonce_url(
			admin_url( 'admin-post.php?action=rankpublish_site_dismiss_update_watch' ),
			'rankpublish_site_dismiss_update_watch'
		);
		?>
		<div class="notice notice-warning is-dismissible rankpublish-site-update-watch">
			<p><strong><?php esc_html_e( 'RankPublish merge watch', 'rankpublish-site' ); ?></strong></p>
			<p><?php esc_html_e( 'Upstream GPL plugins are newer than the version merged into rankpublish. Port changes before shipping a product build.', 'rankpublish-site' ); ?></p>
			<ul style="list-style:disc;margin-left:18px">
				<?php foreach ( $pending as $row ) : ?>
					<li>
						<?php
						printf(
							/* translators: 1: plugin label, 2: installed version, 3: merged version */
							esc_html__( '%1$s: installed %2$s — merged baseline %3$s', 'rankpublish-site' ),
							esc_html( $row['label'] ),
							esc_html( $row['current'] ),
							esc_html( $row['merged'] )
						);
						?>
					</li>
				<?php endforeach; ?>
			</ul>
			<p>
				<a class="button button-primary" href="<?php echo esc_url( $core_url ); ?>">
					<?php esc_html_e( 'Open merge audit', 'rankpublish-site' ); ?>
				</a>
				<a class="button button-secondary" href="<?php echo esc_url( $dismiss_url ); ?>">
					<?php esc_html_e( 'Dismiss until next version', 'rankpublish-site' ); ?>
				</a>
			</p>
		</div>
		<?php
	}

	/**
	 * Dismiss current pending items.
	 */
	public function dismiss(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Forbidden', 'rankpublish-site' ) );
		}

		check_admin_referer( 'rankpublish_site_dismiss_update_watch' );

		$dismissed = get_option( self::OPTION, array() );
		if ( ! is_array( $dismissed ) ) {
			$dismissed = array();
		}

		foreach ( $this->pending_updates() as $row ) {
			$key               = sanitize_key( $row['label'] ) . '-' . $row['current'];
			$dismissed[ $key ] = time();
		}

		update_option( self::OPTION, $dismissed, false );
		wp_safe_redirect( wp_get_referer() ? wp_get_referer() : admin_url( 'admin.php?page=rankpublish-core' ) );
		exit;
	}
}
