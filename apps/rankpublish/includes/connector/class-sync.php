<?php
/**
 * Push posts to RankPublish Cloud so calendar/SEO stay current.
 *
 * @package RankPublish
 */

declare(strict_types=1);

namespace RankPublish\Connector;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * WordPress → Cloud post sync (required when the site URL is not reachable from the cloud).
 */
final class Sync {

	public function register(): void {
		add_action( 'save_post', array( $this, 'on_save' ), 20, 2 );
		add_action( 'trashed_post', array( $this, 'on_trash' ) );
		add_action( 'untrashed_post', array( $this, 'on_untrash' ) );
	}

	public function on_save( int $post_id, \WP_Post $post ): void {
		if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
			return;
		}
		if ( ! in_array( $post->post_type, array( 'post', 'page' ), true ) ) {
			return;
		}
		$this->push_posts( array( Rest::export_post( $post ) ) );
	}

	public function on_trash( int $post_id ): void {
		$post = get_post( $post_id );
		if ( $post instanceof \WP_Post ) {
			$this->push_posts( array( Rest::export_post( $post ) ) );
		}
	}

	public function on_untrash( int $post_id ): void {
		$post = get_post( $post_id );
		if ( $post instanceof \WP_Post ) {
			$this->push_posts( array( Rest::export_post( $post ) ) );
		}
	}

	/**
	 * @return array<string, mixed>|\WP_Error
	 */
	public static function push_all() {
		return self::push_posts( Rest::export_posts( 100 ) );
	}

	/**
	 * @param array<int, array<string, mixed>> $posts
	 * @return array<string, mixed>|\WP_Error
	 */
	private static function push_posts( array $posts ) {
		if ( ! Rest::is_connected() || $posts === array() ) {
			return array( 'ok' => true, 'skipped' => true );
		}

		return Cloud_Client::signed_post(
			'/sync',
			array( 'posts' => $posts ),
			20,
			__( 'Could not sync posts to RankPublish Cloud.', 'rankpublish' )
		);
	}
}
