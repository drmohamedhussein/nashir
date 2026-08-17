<?php
/**
 * Pending content snapshots for Gutenberg, Classic, and Elementor.
 *
 * @package PublisherWP
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nashir_Editors {

	public function register(): void {
		add_action( 'enqueue_block_editor_assets', array( $this, 'gutenberg' ) );
		if ( did_action( 'elementor/loaded' ) || class_exists( '\Elementor\Plugin' ) ) {
			add_action( 'elementor/editor/after_save', array( $this, 'elementor_after_save' ) );
		}
	}

	public function gutenberg(): void {
		wp_enqueue_script(
			'nashir-gutenberg',
			NASHIR_URL . 'assets/gutenberg.js',
			array( 'wp-plugins', 'wp-edit-post', 'wp-element', 'wp-data' ),
			NASHIR_VERSION,
			true
		);
	}

	public function elementor_after_save( int $post_id ): void {
		if ( get_post_meta( $post_id, '_nashir_advanced_at', true ) ) {
			self::store_pending( $post_id );
		}
	}

	public static function store_pending( int $post_id ): void {
		$post = get_post( $post_id );
		if ( ! $post instanceof WP_Post ) {
			return;
		}

		update_post_meta( $post_id, '_nashir_pending_content', $post->post_content );
		update_post_meta( $post_id, '_nashir_pending_title', $post->post_title );
		update_post_meta( $post_id, '_nashir_pending_excerpt', $post->post_excerpt );

		$elementor = get_post_meta( $post_id, '_elementor_data', true );
		if ( is_string( $elementor ) && $elementor !== '' ) {
			update_post_meta( $post_id, '_nashir_pending_elementor', $elementor );
		}

		if ( function_exists( 'get_fields' ) ) {
			$acf = get_fields( $post_id );
			if ( $acf ) {
				update_post_meta( $post_id, '_nashir_pending_acf', wp_json_encode( $acf ) );
			}
		}
	}

	public static function apply_pending( int $post_id ): void {
		$content = get_post_meta( $post_id, '_nashir_pending_content', true );
		$title   = get_post_meta( $post_id, '_nashir_pending_title', true );
		$excerpt = get_post_meta( $post_id, '_nashir_pending_excerpt', true );

		$update = array(
			'ID'          => $post_id,
			'post_status' => 'publish',
		);
		if ( is_string( $title ) && $title !== '' ) {
			$update['post_title'] = $title;
		}
		if ( is_string( $content ) && $content !== '' ) {
			$update['post_content'] = $content;
		}
		if ( is_string( $excerpt ) ) {
			$update['post_excerpt'] = $excerpt;
		}
		wp_update_post( $update );

		$elementor = get_post_meta( $post_id, '_nashir_pending_elementor', true );
		if ( is_string( $elementor ) && $elementor !== '' ) {
			update_post_meta( $post_id, '_elementor_data', wp_slash( $elementor ) );
		}

		delete_post_meta( $post_id, '_nashir_pending_content' );
		delete_post_meta( $post_id, '_nashir_pending_title' );
		delete_post_meta( $post_id, '_nashir_pending_excerpt' );
		delete_post_meta( $post_id, '_nashir_pending_elementor' );
	}
}
