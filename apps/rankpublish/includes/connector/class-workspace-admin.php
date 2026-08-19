<?php
/**
 * RankPublish Scheduler / SEO admin hubs — local engines plus cloud account.
 *
 * @package RankPublish
 */

declare(strict_types=1);

namespace RankPublish\Connector;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Module menus under RankPublish. Engines stay on this WordPress site.
 */
final class Workspace_Admin {

	public function register(): void {
		add_action( 'admin_menu', array( $this, 'menu' ), 10002 );
	}

	public function menu(): void {
		if ( ! menu_page_url( 'rankpublish', false ) ) {
			return;
		}

		add_submenu_page(
			'rankpublish',
			__( 'Publish workspace', 'rankpublish' ),
			__( 'Publish workspace', 'rankpublish' ),
			'edit_posts',
			'rankpublish-scheduler',
			array( $this, 'render_scheduler' )
		);
		add_submenu_page(
			'rankpublish',
			__( 'Rank workspace', 'rankpublish' ),
			__( 'Rank workspace', 'rankpublish' ),
			'edit_posts',
			'rankpublish-seo',
			array( $this, 'render_seo' )
		);
	}

	public function render_scheduler(): void {
		$this->render_hub(
			__( 'Publish workspace', 'rankpublish' ),
			__( 'SchedulePress and Automation Pro run on this WordPress site. Your RankPublish account shows the synced calendar and lets you manage sites.', 'rankpublish' ),
			$this->publish_links(),
			'/app/calendar'
		);
	}

	public function render_seo(): void {
		$this->render_hub(
			__( 'Rank workspace', 'rankpublish' ),
			__( 'ThinkRank and SEO Pro run on this WordPress site. Your RankPublish account shows synced scores and metadata.', 'rankpublish' ),
			$this->seo_links(),
			'/app/seo'
		);
	}

	/**
	 * @return list<array{label: string, page: string, note: string}>
	 */
	private function publish_links(): array {
		return array(
			array(
				'label' => __( 'Scheduler', 'rankpublish' ),
				'page'  => 'schedulepress',
				'note'  => __( 'Queue, auto-schedule, social profiles, email notify, and Pro automation.', 'rankpublish' ),
			),
			array(
				'label' => __( 'Calendar', 'rankpublish' ),
				'page'  => 'schedulepress-calendar',
				'note'  => __( 'Drag-and-drop editorial calendar.', 'rankpublish' ),
			),
		);
	}

	/**
	 * @return list<array{label: string, page: string, note: string}>
	 */
	private function seo_links(): array {
		return array(
			array(
				'label' => __( 'SEO Dashboard', 'rankpublish' ),
				'page'  => 'thinkrank',
				'note'  => __( 'Overview, scores, and site health.', 'rankpublish' ),
			),
			array(
				'label' => __( 'Essential SEO', 'rankpublish' ),
				'page'  => 'thinkrank-essential-seo',
				'note'  => __( 'Identity, schema, sitemap, social meta, indexing, analytics, and Pro links.', 'rankpublish' ),
			),
			array(
				'label' => __( 'AI Tools', 'rankpublish' ),
				'page'  => 'thinkrank-ai-tools',
				'note'  => __( 'Titles, descriptions, briefs, and content tools.', 'rankpublish' ),
			),
			array(
				'label' => __( 'Usages', 'rankpublish' ),
				'page'  => 'thinkrank-usages',
				'note'  => __( 'AI usage and cost analytics.', 'rankpublish' ),
			),
			array(
				'label' => __( 'SEO Settings', 'rankpublish' ),
				'page'  => 'thinkrank-settings',
				'note'  => __( 'API keys, roles, and global SEO options.', 'rankpublish' ),
			),
			array(
				'label' => __( 'Account / License', 'rankpublish' ),
				'page'  => 'thinkrank-license',
				'note'  => __( 'RankPublish subscription covers Pro engines — no separate vendor license.', 'rankpublish' ),
			),
		);
	}

	/**
	 * @param list<array{label: string, page: string, note: string}> $links
	 */
	private function render_hub( string $title, string $lede, array $links, string $cloud_path ): void {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return;
		}

		$app     = untrailingslashit( (string) get_option( 'rankpublish_app_url', Onboarding::default_app_url() ) );
		$site_id = (string) get_option( 'rankpublish_site_id', '' );

		echo '<div class="wrap rankpublish-workspace">';
		echo '<h1>' . esc_html( $title ) . '</h1>';
		echo '<p>' . esc_html( $lede ) . '</p>';
		echo '<p><em>' . esc_html(
			sprintf(
				/* translators: %s: this site home URL */
				__( 'Engines on this screen belong to %s — not RankPublish HQ.', 'rankpublish' ),
				home_url()
			)
		) . '</em></p>';

		echo '<table class="widefat striped" style="max-width:880px">';
		echo '<thead><tr><th>' . esc_html__( 'Tool', 'rankpublish' ) . '</th><th>' . esc_html__( 'What it does', 'rankpublish' ) . '</th></tr></thead><tbody>';
		foreach ( $links as $link ) {
			$url = add_query_arg(
				'rp_os',
				'1',
				admin_url( 'admin.php?page=' . rawurlencode( $link['page'] ) )
			);
			echo '<tr><td><a class="button button-primary" href="' . esc_url( $url ) . '">' . esc_html( $link['label'] ) . '</a></td>';
			echo '<td>' . esc_html( $link['note'] ) . '</td></tr>';
		}
		echo '</tbody></table>';

		echo '<h2 style="margin-top:28px">' . esc_html__( 'RankPublish Cloud', 'rankpublish' ) . '</h2>';
		if ( ! Rest::is_connected() ) {
			echo '<p>';
			esc_html_e( 'Connect this site to use the cloud calendar, SEO scores, billing, and extra domains.', 'rankpublish' );
			echo ' <a href="' . esc_url( admin_url( 'admin.php?page=rankpublish-cloud' ) ) . '">';
			esc_html_e( 'Cloud Connect', 'rankpublish' );
			echo '</a></p>';
		} else {
			echo '<p><strong>' . esc_html__( 'Site ID', 'rankpublish' ) . ':</strong> <code>' . esc_html( $site_id ) . '</code></p>';
			echo '<p class="submit">';
			echo '<a class="button button-primary" href="' . esc_url( $app . $cloud_path ) . '" target="_blank" rel="noopener noreferrer">';
			esc_html_e( 'Open in RankPublish Cloud', 'rankpublish' );
			echo '</a> ';
			echo '<a class="button" href="' . esc_url( $app . '/app' ) . '" target="_blank" rel="noopener noreferrer">';
			esc_html_e( 'Account dashboard', 'rankpublish' );
			echo '</a> ';
			echo '<a class="button" href="' . esc_url( $app . '/guide' ) . '" target="_blank" rel="noopener noreferrer">';
			esc_html_e( 'User guide', 'rankpublish' );
			echo '</a></p>';
		}
		echo '</div>';
	}
}
