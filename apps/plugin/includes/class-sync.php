<?php
/**
 * Push post changes to Nashir so the cloud calendar stays current.
 *
 * @package PublisherWP
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

		if ( ! in_array( $post->post_type, Nashir_Plugin::allowed_types(), true ) ) {
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

		$rest = new Nashir_REST();
		Nashir_Client::sync(
			array(
				'posts' => array( $rest->serialize_post( $post ) ),
			)
		);
	}
}
