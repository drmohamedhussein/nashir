<?php
/**
 * RankPublish workspace — tenant connection gate and native module shells.
 *
 * Scheduler / SEO are RankPublish surfaces. Upstream plugin UIs are dev-only
 * (dev_stack_mode) and never the default customer path.
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Connection snapshot and native workspace UI for Site Core admin.
 */
final class RankPublish_Site_Workspace {

	private const REMOTE_CACHE_KEY = 'rankpublish_site_workspace_snapshot';

	/**
	 * @return array<string, mixed>|null
	 */
	public static function remote_snapshot( bool $force = false ): ?array {
		if ( ! self::connection()['connected'] ) {
			return null;
		}
		if ( ! $force ) {
			$cached = get_transient( self::REMOTE_CACHE_KEY );
			if ( is_array( $cached ) ) {
				return $cached;
			}
		}
		if ( ! class_exists( 'RankPublish_Site_Cloud_Client' ) ) {
			return null;
		}
		$remote = RankPublish_Site_Cloud_Client::fetch_workspace();
		if ( is_wp_error( $remote ) ) {
			return null;
		}
		set_transient( self::REMOTE_CACHE_KEY, $remote, MINUTE_IN_SECONDS );
		self::persist_plan_from_remote( $remote );
		if ( isset( $remote['workspace']['id'] ) ) {
			update_option( 'rankpublish_workspace_id', sanitize_text_field( (string) $remote['workspace']['id'] ), false );
		}
		return $remote;
	}

	/**
	 * @param array<string, mixed> $remote
	 */
	private static function persist_plan_from_remote( array $remote ): void {
		$sub = $remote['subscription'] ?? null;
		if ( ! is_array( $sub ) ) {
			return;
		}
		update_option(
			'rankpublish_plan',
			wp_json_encode(
				array(
					'interval'             => $sub['interval'] ?? 'month',
					'status'               => $sub['status'] ?? 'trial',
					'current_period_end'   => $sub['current_period_end'] ?? '',
					'price_cents'          => $sub['price_cents'] ?? 0,
					'live'                 => ! empty( $sub['live'] ),
				)
			),
			false
		);
	}

	/**
	 * @return array{connected: bool, site_id: string, app_url: string, plan: array<string, mixed>|null, subscription_live: bool, trial_days: int, workspace_id: string}
	 */
	public static function connection(): array {
		$site_id = (string) get_option( 'rankpublish_site_id', '' );
		if ( '' === $site_id ) {
			$site_id = (string) get_option( 'nashir_site_id', '' );
		}
		$secret = (string) get_option( 'rankpublish_signing_secret', '' );
		if ( '' === $secret ) {
			$secret = (string) get_option( 'nashir_signing_secret', '' );
		}
		$app_url = (string) get_option( 'rankpublish_app_url', '' );
		if ( '' === $app_url ) {
			$app_url = (string) get_option( 'nashir_app_url', '' );
		}
		if ( '' === $app_url ) {
			$app_url = rpsite_cloud_url();
		}

		$plan_raw = get_option( 'rankpublish_plan', null );
		$plan     = null;
		if ( is_string( $plan_raw ) && '' !== $plan_raw ) {
			$decoded = json_decode( $plan_raw, true );
			$plan    = is_array( $decoded ) ? $decoded : null;
		}

		$connected = '' !== $site_id && '' !== $secret;
		$live      = false;
		if ( $connected && is_array( $plan ) ) {
			if ( ! empty( $plan['live'] ) ) {
				$live = true;
			} else {
				$status = (string) ( $plan['status'] ?? '' );
				$end    = isset( $plan['current_period_end'] ) ? strtotime( (string) $plan['current_period_end'] ) : false;
				$live   = in_array( $status, array( 'trial', 'active', 'manual' ), true )
					&& ( false === $end || $end > time() );
			}
		}

		$workspace_id = (string) get_option( 'rankpublish_workspace_id', '' );

		return array(
			'connected'         => $connected,
			'site_id'           => $site_id,
			'workspace_id'      => $workspace_id,
			'app_url'           => untrailingslashit( $app_url ),
			'plan'              => $plan,
			'subscription_live' => $connected && ( $live || null === $plan ),
			'trial_days'        => 7,
		);
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public static function workspace_sites(): array {
		$remote = self::remote_snapshot();
		if ( ! is_array( $remote ) || ! is_array( $remote['sites'] ?? null ) ) {
			return array();
		}
		return $remote['sites'];
	}

	public static function is_ready(): bool {
		self::remote_snapshot();
		$snap = self::connection();
		return $snap['connected'] && $snap['subscription_live'];
	}

	/**
	 * @param string $context scheduler|seo.
	 */
	public static function render_connect_gate( string $context ): void {
		$cloud   = rpsite_cloud_url();
		$snap    = self::connection();
		$is_seo  = 'seo' === $context;
		$title   = $is_seo
			? __( 'Connect your site to use RankPublish SEO', 'rankpublish-site' )
			: __( 'Connect your site to use RankPublish Scheduler', 'rankpublish-site' );
		$plugin  = self::connector_plugin_active();
		?>
		<section class="rpsite-os-card rpsite-workspace-gate">
			<div class="rpsite-workspace-gate__hero">
				<span class="rpsite-os-icon-blob rpsite-os-icon-blob--sky">
					<?php echo RankPublish_Site_Admin_Os::icon( $is_seo ? 'seo' : 'scheduler' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				</span>
				<div>
					<h2><?php echo esc_html( $title ); ?></h2>
					<p class="rpsite-os-lede">
						<?php
						esc_html_e(
							'RankPublish workspaces are tied to your cloud account and this WordPress site. Register, start a 7-day trial, then pair the site — only then do Scheduler and SEO tools unlock for this installation.',
							'rankpublish-site'
						);
						?>
					</p>
				</div>
			</div>

			<ol class="rpsite-workspace-steps">
				<li>
					<strong><?php esc_html_e( 'Create a RankPublish account', 'rankpublish-site' ); ?></strong>
					<p><?php esc_html_e( 'Sign up on the cloud app. One workspace per customer; billing is per WordPress site.', 'rankpublish-site' ); ?></p>
					<a class="rpsite-os-btn rpsite-os-btn--primary" href="<?php echo esc_url( $cloud . '/register' ); ?>">
						<?php esc_html_e( 'Register free', 'rankpublish-site' ); ?>
					</a>
					<a class="rpsite-os-btn rpsite-os-btn--outline" href="<?php echo esc_url( $cloud . '/login' ); ?>">
						<?php esc_html_e( 'Sign in', 'rankpublish-site' ); ?>
					</a>
				</li>
				<li>
					<strong><?php esc_html_e( 'Install RankPublish on this WordPress site', 'rankpublish-site' ); ?></strong>
					<p><?php esc_html_e( 'The RankPublish plugin connects this site to your account. Site Core alone does not replace the connector on customer sites.', 'rankpublish-site' ); ?></p>
					<?php if ( $plugin ) : ?>
						<p class="rpsite-os-pill rpsite-os-pill--connected"><?php esc_html_e( 'RankPublish plugin detected', 'rankpublish-site' ); ?></p>
					<?php else : ?>
						<a class="rpsite-os-btn rpsite-os-btn--outline" href="<?php echo esc_url( home_url( '/download/' ) ); ?>">
							<?php esc_html_e( 'Download plugin', 'rankpublish-site' ); ?>
						</a>
					<?php endif; ?>
				</li>
				<li>
					<strong><?php esc_html_e( 'Pair this site', 'rankpublish-site' ); ?></strong>
					<p><?php esc_html_e( 'In RankPublish Cloud open Getting Started, create a pairing code, then paste it in WordPress → RankPublish → Cloud Connect.', 'rankpublish-site' ); ?></p>
					<a class="rpsite-os-btn rpsite-os-btn--outline" href="<?php echo esc_url( $cloud . '/app/getting-started' ); ?>">
						<?php esc_html_e( 'Open pairing in RankPublish', 'rankpublish-site' ); ?>
					</a>
					<?php if ( $plugin ) : ?>
						<a class="rpsite-os-btn rpsite-os-btn--ghost" href="<?php echo esc_url( admin_url( 'admin.php?page=rankpublish-cloud' ) ); ?>">
							<?php esc_html_e( 'Cloud Connect (WordPress)', 'rankpublish-site' ); ?>
						</a>
					<?php endif; ?>
				</li>
				<li>
					<strong><?php esc_html_e( 'Choose monthly or yearly plan', 'rankpublish-site' ); ?></strong>
					<p>
						<?php
						printf(
							/* translators: 1: monthly price 2: yearly price */
							esc_html__( 'After trial: %1$s/month or %2$s/year per site. Manage seats, add domains, or remove sites from your RankPublish account while subscribed.', 'rankpublish-site' ),
							'$9.99',
							'$99'
						);
						?>
					</p>
					<a class="rpsite-os-btn rpsite-os-btn--outline" href="<?php echo esc_url( $cloud . '/app/billing' ); ?>">
						<?php esc_html_e( 'View plans', 'rankpublish-site' ); ?>
					</a>
				</li>
			</ol>

			<?php if ( $snap['connected'] && ! $snap['subscription_live'] ) : ?>
				<div class="rpsite-workspace-gate__warn">
					<strong><?php esc_html_e( 'Site paired but subscription inactive', 'rankpublish-site' ); ?></strong>
					<p><?php esc_html_e( 'Renew or start billing in RankPublish Cloud to unlock Scheduler and SEO for this site.', 'rankpublish-site' ); ?></p>
					<a class="rpsite-os-btn rpsite-os-btn--primary" href="<?php echo esc_url( $cloud . '/app/billing' ); ?>">
						<?php esc_html_e( 'Manage billing', 'rankpublish-site' ); ?>
					</a>
				</div>
			<?php endif; ?>
		</section>
		<?php
	}

	/**
	 * Native RankPublish module shell (no upstream redirect).
	 *
	 * @param string $context scheduler|seo.
	 */
	public static function render_module_workspace( string $context ): void {
		$remote  = self::remote_snapshot();
		$snap    = self::connection();
		$cloud   = $snap['app_url'] ?: rpsite_cloud_url();
		$is_seo  = 'seo' === $context;
		$panels  = $is_seo ? self::seo_panels() : self::scheduler_panels();
		$modules = is_array( $remote['modules'] ?? null ) ? $remote['modules'] : array();
		$tab_id  = isset( $_GET['tab'] ) ? sanitize_key( (string) wp_unslash( $_GET['tab'] ) ) : '';
		$active  = $panels[0];
		foreach ( $panels as $panel ) {
			if ( $panel['id'] === $tab_id ) {
				$active = $panel;
				break;
			}
		}

		echo '<div class="rpsite-os-module-tabs" role="tablist">';
		foreach ( $panels as $panel ) {
			$url = add_query_arg(
				array(
					'page' => 'rankpublish-core-' . $context,
					'tab'  => $panel['id'],
				),
				admin_url( 'admin.php' )
			);
			$is_active = $panel['id'] === $active['id'];
			printf(
				'<a class="rpsite-os-module-tab%s" href="%s"><span>%s</span></a>',
				$is_active ? ' is-active' : '',
				esc_url( $url ),
				esc_html( (string) $panel['label'] )
			);
		}
		echo '</div>';

		echo '<section class="rpsite-os-card rpsite-native-module">';
		echo '<div class="rpsite-native-module__head">';
		echo '<p class="rpsite-os-eyebrow">' . esc_html__( 'Your workspace', 'rankpublish-site' ) . '</p>';
		echo '<h2>' . esc_html( (string) $active['label'] ) . '</h2>';
		echo '<p class="rpsite-os-lede">' . esc_html( (string) $active['hint'] ) . '</p>';
		echo '</div>';

		if ( $is_seo && is_array( $modules['seo'] ?? null ) ) {
			echo '<div class="rpsite-native-module__stats">';
			printf(
				'<div><strong>%d</strong><span>%s</span></div>',
				(int) ( $modules['seo']['synced_posts'] ?? 0 ),
				esc_html__( 'Synced posts', 'rankpublish-site' )
			);
			printf(
				'<div><strong>%d</strong><span>%s</span></div>',
				(int) ( $modules['seo']['audits'] ?? 0 ),
				esc_html__( 'SEO audits', 'rankpublish-site' )
			);
			echo '</div>';
		} elseif ( ! $is_seo && is_array( $modules['scheduler'] ?? null ) ) {
			echo '<div class="rpsite-native-module__stats">';
			printf(
				'<div><strong>%d</strong><span>%s</span></div>',
				(int) ( $modules['scheduler']['scheduled_posts'] ?? 0 ),
				esc_html__( 'Scheduled posts', 'rankpublish-site' )
			);
			printf(
				'<div><strong>%d</strong><span>%s</span></div>',
				(int) ( $modules['scheduler']['pending_jobs'] ?? 0 ),
				esc_html__( 'Pending jobs', 'rankpublish-site' )
			);
			echo '</div>';
		}

		echo '<div class="rpsite-native-module__meta">';
		printf(
			'<span>%s <code>%s</code></span>',
			esc_html__( 'Site ID', 'rankpublish-site' ),
			esc_html( (string) $snap['site_id'] )
		);
		if ( is_array( $snap['plan'] ) ) {
			printf(
				'<span>%s <strong>%s</strong></span>',
				esc_html__( 'Plan', 'rankpublish-site' ),
				esc_html( (string) ( $snap['plan']['status'] ?? 'trial' ) )
			);
		}
		echo '</div>';

		echo '<div class="rpsite-native-module__actions">';
		printf(
			'<a class="rpsite-os-btn rpsite-os-btn--primary" href="%s">%s</a>',
			esc_url( $cloud . ( $is_seo ? '/app/seo' : '/app/calendar' ) ),
			esc_html__( 'Open in RankPublish Cloud', 'rankpublish-site' )
		);
		printf(
			'<a class="rpsite-os-btn rpsite-os-btn--outline" href="%s">%s</a>',
			esc_url( $cloud . '/app' ),
			esc_html__( 'Account dashboard', 'rankpublish-site' )
		);
		echo '</div>';

		echo '<p class="rpsite-os-note">';
		esc_html_e(
			'This is your RankPublish workspace for this site. Deep scheduling and SEO run through your account and the RankPublish connector on WordPress — not standalone ThinkRank or SchedulePress screens.',
			'rankpublish-site'
		);
		echo '</p>';
		echo '</section>';
	}

	/**
	 * @return list<array{id: string, label: string, hint: string}>
	 */
	private static function scheduler_panels(): array {
		return array(
			array(
				'id'    => 'calendar',
				'label' => __( 'Calendar', 'rankpublish-site' ),
				'hint'  => __( 'Plan and review scheduled content for this connected site.', 'rankpublish-site' ),
			),
			array(
				'id'    => 'queue',
				'label' => __( 'Queue', 'rankpublish-site' ),
				'hint'  => __( 'Upcoming publishes and social shares for this site.', 'rankpublish-site' ),
			),
			array(
				'id'    => 'social',
				'label' => __( 'Social', 'rankpublish-site' ),
				'hint'  => __( 'Profiles and templates scoped to this WordPress site.', 'rankpublish-site' ),
			),
		);
	}

	/**
	 * @return list<array{id: string, label: string, hint: string}>
	 */
	private static function seo_panels(): array {
		return array(
			array(
				'id'    => 'overview',
				'label' => __( 'Overview', 'rankpublish-site' ),
				'hint'  => __( 'SEO health and scores for this site.', 'rankpublish-site' ),
			),
			array(
				'id'    => 'metadata',
				'label' => __( 'Metadata', 'rankpublish-site' ),
				'hint'  => __( 'Titles, descriptions, and focus keywords per post.', 'rankpublish-site' ),
			),
			array(
				'id'    => 'audits',
				'label' => __( 'Audits', 'rankpublish-site' ),
				'hint'  => __( 'Content analysis and recommendations.', 'rankpublish-site' ),
			),
		);
	}

	private static function connector_plugin_active(): bool {
		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		return is_plugin_active( 'rankpublish/rankpublish.php' );
	}

	/**
	 * Site Core operator surface — HQ does not pair like a customer site.
	 *
	 * @param array<string, mixed> $ctx Admin snapshot.
	 */
	public static function render_operator_sites( array $ctx ): void {
		$cloud = rpsite_cloud_url();
		?>
		<section class="rpsite-os-card rpsite-workspace-gate">
			<div class="rpsite-workspace-gate__hero">
				<span class="rpsite-os-icon-blob rpsite-os-icon-blob--sky">
					<?php echo RankPublish_Site_Admin_Os::icon( 'sites' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				</span>
				<div>
					<h2><?php esc_html_e( 'Customer sites (RankPublish Cloud)', 'rankpublish-site' ); ?></h2>
					<p class="rpsite-os-lede">
						<?php
						esc_html_e(
							'This WordPress install is the RankPublish platform HQ. You do not pair it like a customer site. End users register on RankPublish Cloud, install the rankpublish plugin on their WordPress, then connect with a pairing code.',
							'rankpublish-site'
						);
						?>
					</p>
				</div>
			</div>
			<div class="rpsite-native-module__actions">
				<a class="rpsite-os-btn rpsite-os-btn--primary" href="<?php echo esc_url( $cloud . '/app' ); ?>">
					<?php esc_html_e( 'Open RankPublish Cloud', 'rankpublish-site' ); ?>
				</a>
				<a class="rpsite-os-btn rpsite-os-btn--outline" href="<?php echo esc_url( $cloud . '/register' ); ?>">
					<?php esc_html_e( 'Customer registration', 'rankpublish-site' ); ?>
				</a>
				<?php if ( ! empty( $ctx['product_zip'] ) ) : ?>
					<a class="rpsite-os-btn rpsite-os-btn--outline" href="<?php echo esc_url( (string) $ctx['product_zip'] ); ?>">
						<?php esc_html_e( 'Download customer plugin', 'rankpublish-site' ); ?>
					</a>
				<?php endif; ?>
			</div>
			<p class="rpsite-os-note">
				<?php
				esc_html_e(
					'Each paying customer gets their own workspace, sites, Scheduler, and SEO inside their WordPress after they connect — managed from their RankPublish account.',
					'rankpublish-site'
				);
				?>
			</p>
		</section>
		<?php
	}

	/**
	 * Platform operator module shell (Scheduler / SEO on HQ).
	 *
	 * @param string               $context scheduler|seo.
	 * @param array<string, mixed> $ctx     Admin snapshot.
	 */
	public static function render_operator_module( string $context, array $ctx ): void {
		$cloud  = rpsite_cloud_url();
		$is_seo = 'seo' === $context;
		?>
		<section class="rpsite-os-card rpsite-native-module">
			<div class="rpsite-native-module__head">
				<p class="rpsite-os-eyebrow"><?php esc_html_e( 'Platform control', 'rankpublish-site' ); ?></p>
				<h2>
					<?php
					echo esc_html(
						$is_seo
							? __( 'SEO — customer workspaces', 'rankpublish-site' )
							: __( 'Scheduler — customer workspaces', 'rankpublish-site' )
					);
					?>
				</h2>
				<p class="rpsite-os-lede">
					<?php
					echo esc_html(
						$is_seo
							? __( 'Per-site SEO runs on each customer WordPress after they install rankpublish and connect. Use RankPublish Cloud to manage all customer sites.', 'rankpublish-site' )
							: __( 'Per-site scheduling runs on each customer WordPress after they install rankpublish and connect. Use RankPublish Cloud to manage all customer sites.', 'rankpublish-site' )
					);
					?>
				</p>
			</div>
			<div class="rpsite-native-module__actions">
				<a class="rpsite-os-btn rpsite-os-btn--primary" href="<?php echo esc_url( $cloud . ( $is_seo ? '/app/seo' : '/app/calendar' ) ); ?>">
					<?php esc_html_e( 'Open in RankPublish Cloud', 'rankpublish-site' ); ?>
				</a>
				<a class="rpsite-os-btn rpsite-os-btn--outline" href="<?php echo esc_url( $cloud . '/app' ); ?>">
					<?php esc_html_e( 'All customer workspaces', 'rankpublish-site' ); ?>
				</a>
			</div>
			<p class="rpsite-os-note">
				<?php esc_html_e( 'Site Core on this server is the operator/marketing surface — not a seat that needs cloud pairing.', 'rankpublish-site' ); ?>
			</p>
		</section>
		<?php
	}
}
