<?php
/**
 * REST API exposed to the Nashir cloud scheduler.
 *
 * @package Nashir
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Inbound signed endpoints.
 */
final class Nashir_REST {

	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'routes' ) );
	}

	public function routes(): void {
		register_rest_route(
			'nashir/v1',
			'/health',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'health' ),
				'permission_callback' => array( $this, 'verify_signature' ),
			)
		);

		register_rest_route(
			'nashir/v1',
			'/posts',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'posts' ),
				'permission_callback' => array( $this, 'verify_signature' ),
			)
		);

		register_rest_route(
			'nashir/v1',
			'/publish',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'publish' ),
				'permission_callback' => array( $this, 'verify_signature' ),
			)
		);
	}

	/**
	 * Signature check for machine-to-machine calls.
	 */
	public function verify_signature( WP_REST_Request $request ): bool {
		$secret    = (string) get_option( 'nashir_signing_secret', '' );
		$timestamp = (string) $request->get_header( 'x-nashir-timestamp' );
		$signature = (string) $request->get_header( 'x-nashir-signature' );
		$body      = (string) $request->get_body();

		return Nashir_Crypto::verify( $secret, $timestamp, $body, $signature );
	}

	/**
	 * @return WP_REST_Response
	 */
	public function health() {
		return new WP_REST_Response(
			array(
				'ok'      => true,
				'version' => NASHIR_VERSION,
				'site'    => home_url(),
			),
			200
		);
	}

	/**
	 * @return WP_REST_Response
	 */
	public function posts( WP_REST_Request $request ) {
		$query = new WP_Query(
			array(
				'post_type'      => array( 'post', 'page' ),
				'post_status'    => array( 'draft', 'pending', 'future', 'publish', 'private' ),
				'posts_per_page' => 100,
				'orderby'        => 'date',
				'order'          => 'DESC',
				'no_found_rows'  => true,
			)
		);

		$items = array();
		foreach ( $query->posts as $post ) {
			if ( ! $post instanceof WP_Post ) {
				continue;
			}
			$items[] = $this->serialize_post( $post );
		}

		return new WP_REST_Response( array( 'posts' => $items ), 200 );
	}

	/**
	 * Publish or unpublish a post on command from Nashir cloud.
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public function publish( WP_REST_Request $request ) {
		$params  = $request->get_json_params();
		$post_id = isset( $params['post_id'] ) ? absint( $params['post_id'] ) : 0;
		$action  = isset( $params['action'] ) ? sanitize_key( (string) $params['action'] ) : 'publish';

		$post = get_post( $post_id );
		if ( ! $post instanceof WP_Post ) {
			return new WP_Error( 'nashir_missing_post', __( 'المقال غير موجود.', 'nashir' ), array( 'status' => 404 ) );
		}

		if ( ! in_array( $action, array( 'publish', 'unpublish' ), true ) ) {
			return new WP_Error( 'nashir_bad_action', __( 'إجراء غير مدعوم.', 'nashir' ), array( 'status' => 400 ) );
		}

		if ( 'publish' === $action ) {
			wp_update_post(
				array(
					'ID'          => $post_id,
					'post_status' => 'publish',
					'post_date'   => current_time( 'mysql' ),
				)
			);
			clean_post_cache( $post_id );
		} else {
			wp_update_post(
				array(
					'ID'          => $post_id,
					'post_status' => 'draft',
				)
			);
		}

		$updated = get_post( $post_id );
		return new WP_REST_Response(
			array(
				'ok'   => true,
				'post' => $updated instanceof WP_Post ? $this->serialize_post( $updated ) : null,
			),
			200
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function serialize_post( WP_Post $post ): array {
		$gmt = get_post_datetime( $post, 'date', 'gmt' );

		return array(
			'wp_post_id'   => (int) $post->ID,
			'title'        => get_the_title( $post ),
			'status'       => $post->post_status,
			'post_type'    => $post->post_type,
			'permalink'    => get_permalink( $post ),
			'scheduled_at' => in_array( $post->post_status, array( 'future' ), true ) && $gmt ? $gmt->format( DATE_ATOM ) : null,
			'published_at' => 'publish' === $post->post_status && $gmt ? $gmt->format( DATE_ATOM ) : null,
		);
	}
}
