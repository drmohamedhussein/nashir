<?php
/**
 * Dashboard widget and admin-bar scheduled posts.
 *
 * @package PublisherWP
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nashir_Dashboard {

	public function register(): void {
		add_action( 'wp_dashboard_setup', array( $this, 'widget' ) );
		add_action( 'admin_bar_menu', array( $this, 'admin_bar' ), 80 );
	}

	public function widget(): void {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return;
		}
		wp_add_dashboard_widget( 'nashir_scheduled', __( 'PublisherWP — المجدول', 'nashir' ), array( $this, 'render_widget' ) );
	}

	public function render_widget(): void {
		if ( ! Nashir_Plugin::licensed() ) {
			echo '<p>' . esc_html__( 'فعّل اشتراك PublisherWP لعرض المقالات المجدولة.', 'nashir' ) . '</p>';
			return;
		}
		$query = new WP_Query(
			array(
				'post_type'      => Nashir_Plugin::allowed_types(),
				'post_status'    => 'future',
				'posts_per_page' => 8,
				'orderby'        => 'date',
				'order'          => 'ASC',
			)
		);

		if ( ! $query->have_posts() ) {
			echo '<p>' . esc_html__( 'لا مقالات مجدولة حالياً.', 'nashir' ) . '</p>';
			return;
		}

		echo '<ul class="nashir-dash-list">';
		foreach ( $query->posts as $post ) {
			if ( ! $post instanceof WP_Post ) {
				continue;
			}
			echo '<li><a href="' . esc_url( get_edit_post_link( $post ) ?: '#' ) . '">' . esc_html( get_the_title( $post ) ) . '</a> — ' . esc_html( get_the_date( 'Y-m-d H:i', $post ) ) . '</li>';
		}
		echo '</ul>';
		echo '<p><a href="' . esc_url( admin_url( 'admin.php?page=nashir-calendar' ) ) . '">' . esc_html__( 'فتح التقويم', 'nashir' ) . '</a></p>';
	}

	public function admin_bar( WP_Admin_Bar $bar ): void {
		if ( ! is_admin_bar_showing() || ! current_user_can( 'edit_posts' ) ) {
			return;
		}

		$count = (int) ( new WP_Query(
			array(
				'post_type'      => Nashir_Plugin::allowed_types(),
				'post_status'    => 'future',
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'no_found_rows'  => false,
			)
		) )->found_posts;

		$bar->add_node(
			array(
				'id'    => 'nashir',
				'title' => sprintf(
					/* translators: %d scheduled count */
					__( 'PublisherWP (%d)', 'nashir' ),
					$count
				),
				'href'  => admin_url( 'admin.php?page=nashir-calendar' ),
			)
		);
	}
}
