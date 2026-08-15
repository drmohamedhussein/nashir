<?php
/**
 * Push post changes to Nashir so the cloud calendar stays current.
 *
 * @package Nashir
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * WordPress → Nashir sync.
 */
final class Nashir_Sync {

	public function register(): void {
		add_action( 'save_post', array( $this, 'on_save' ), 20, 2 );
		add_action( 'trashed_post', array( $this, 'on_trash' ) );
		add_action( 'untrashed_post', array( $this, 'on_untrash' ) );
	}

	public function on_save( int $post_id, WP_Post $post ): void {
		if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
			return;
		}

		if ( ! in_array( $post->post_type, array( 'post', 'page' ), true ) ) {
			return;
		}

		$this->push_post( $post );
	}

	public function on_trash( int $post_id ): void {
		$post = get_post( $post_id );
		if ( $post instanceof WP_Post ) {
			$this->push_post( $post );
		}
	}

	public function on_untrash( int $post_id ): void {
		$post = get_post( $post_id );
		if ( $post instanceof WP_Post ) {
			$this->push_post( $post );
		}
	}

	private function push_post( WP_Post $post ): void {
		if ( ! get_option( 'nashir_site_id' ) ) {
			return;
		}

		$gmt = get_post_datetime( $post, 'date', 'gmt' );

		Nashir_Client::sync(
			array(
				'posts' => array(
					array(
						'wp_post_id'   => (int) $post->ID,
						'title'        => get_the_title( $post ),
						'status'       => $post->post_status,
						'post_type'    => $post->post_type,
						'permalink'    => get_permalink( $post ),
						'scheduled_at' => 'future' === $post->post_status && $gmt ? $gmt->format( DATE_ATOM ) : null,
						'published_at' => 'publish' === $post->post_status && $gmt ? $gmt->format( DATE_ATOM ) : null,
					),
				),
			)
		);
	}
}
