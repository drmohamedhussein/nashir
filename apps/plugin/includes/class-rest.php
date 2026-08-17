<?php
/**
 * REST API exposed to the Nashir cloud scheduler.
 *
 * @package PublisherWP
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
		$signed = array( 'permission_callback' => array( $this, 'verify_signature' ) );

		register_rest_route( 'nashir/v1', '/health', array_merge( $signed, array( 'methods' => 'GET', 'callback' => array( $this, 'health' ) ) ) );
		register_rest_route( 'nashir/v1', '/posts', array_merge( $signed, array( 'methods' => 'GET', 'callback' => array( $this, 'posts' ) ) ) );
		register_rest_route( 'nashir/v1', '/calendar', array_merge( $signed, array( 'methods' => 'GET', 'callback' => array( $this, 'posts' ) ) ) );
		register_rest_route( 'nashir/v1', '/publish', array_merge( $signed, array( 'methods' => 'POST', 'callback' => array( $this, 'publish' ) ) ) );
		register_rest_route( 'nashir/v1', '/unpublish', array_merge( $signed, array( 'methods' => 'POST', 'callback' => array( $this, 'unpublish' ) ) ) );
		register_rest_route( 'nashir/v1', '/republish', array_merge( $signed, array( 'methods' => 'POST', 'callback' => array( $this, 'republish' ) ) ) );
		register_rest_route( 'nashir/v1', '/schedule', array_merge( $signed, array( 'methods' => 'POST', 'callback' => array( $this, 'schedule' ) ) ) );
		register_rest_route( 'nashir/v1', '/advanced', array_merge( $signed, array( 'methods' => 'POST', 'callback' => array( $this, 'advanced' ) ) ) );
		register_rest_route( 'nashir/v1', '/settings', array_merge( $signed, array( 'methods' => 'POST', 'callback' => array( $this, 'settings' ) ) ) );
	}

	public function verify_signature( WP_REST_Request $request ): bool {
		$secret    = (string) get_option( 'nashir_signing_secret', '' );
		$timestamp = (string) $request->get_header( 'x-nashir-timestamp' );
		$signature = (string) $request->get_header( 'x-nashir-signature' );
		$body      = (string) $request->get_body();

		return Nashir_Crypto::verify( $secret, $timestamp, $body, $signature );
	}

	public function health() {
		return new WP_REST_Response(
			array(
				'ok'      => true,
				'version' => NASHIR_VERSION,
				'site'    => home_url(),
				'licensed'=> Nashir_Plugin::connected(),
			),
			200
		);
	}

	public function posts( WP_REST_Request $request ) {
		$query = new WP_Query(
			array(
				'post_type'      => Nashir_Plugin::allowed_types(),
				'post_status'    => array( 'draft', 'pending', 'future', 'publish', 'private' ),
				'posts_per_page' => 200,
				'orderby'        => 'date',
				'order'          => 'DESC',
				'no_found_rows'  => true,
			)
		);

		$items = array();
		foreach ( $query->posts as $post ) {
			if ( $post instanceof WP_Post ) {
				$items[] = $this->serialize_post( $post );
			}
		}

		return new WP_REST_Response( array( 'posts' => $items ), 200 );
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public function publish( WP_REST_Request $request ) {
		$params  = $request->get_json_params();
		$post_id = isset( $params['post_id'] ) ? absint( $params['post_id'] ) : 0;
		$action  = isset( $params['action'] ) ? sanitize_key( (string) $params['action'] ) : 'publish';
		$post    = $this->require_post( $post_id );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		if ( 'unpublish' === $action ) {
			return $this->set_status( $post_id, 'draft' );
		}

		if ( 'publish_keep_date' === $action ) {
			return $this->publish_keep_date( $post );
		}

		wp_update_post(
			array(
				'ID'          => $post_id,
				'post_status' => 'publish',
				'post_date'   => current_time( 'mysql' ),
			)
		);
		clean_post_cache( $post_id );
		return $this->ok_post( $post_id );
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public function unpublish( WP_REST_Request $request ) {
		$params  = $request->get_json_params();
		$post_id = isset( $params['post_id'] ) ? absint( $params['post_id'] ) : 0;
		$post    = $this->require_post( $post_id );
		if ( is_wp_error( $post ) ) {
			return $post;
		}
		$at = isset( $params['datetime'] ) ? sanitize_text_field( (string) $params['datetime'] ) : '';
		if ( $at !== '' && strtotime( $at ) > time() ) {
			update_post_meta( $post_id, '_nashir_unpublish_at', $at );
			return $this->ok_post( $post_id );
		}
		return $this->set_status( $post_id, 'draft' );
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public function republish( WP_REST_Request $request ) {
		$params  = $request->get_json_params();
		$post_id = isset( $params['post_id'] ) ? absint( $params['post_id'] ) : 0;
		$post    = $this->require_post( $post_id );
		if ( is_wp_error( $post ) ) {
			return $post;
		}
		$at = isset( $params['datetime'] ) ? sanitize_text_field( (string) $params['datetime'] ) : '';
		if ( $at !== '' && strtotime( $at ) > time() ) {
			update_post_meta( $post_id, '_nashir_republish_at', $at );
			return $this->ok_post( $post_id );
		}
		return $this->set_status( $post_id, 'publish' );
	}

	/**
	 * @return WP_REST_Response|WP_Error
	 */
	public function schedule( WP_REST_Request $request ) {
		$params  = $request->get_json_params();
		$post_id = isset( $params['post_id'] ) ? absint( $params['post_id'] ) : 0;
		$post    = $this->require_post( $post_id );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		$datetime = isset( $params['datetime'] ) ? (string) $params['datetime'] : '';
		$ts       = strtotime( $datetime );
		if ( ! $ts ) {
			return new WP_Error( 'nashir_bad_date', __( 'موعد غير صالح.', 'nashir' ), array( 'status' => 400 ) );
		}

		$local = wp_date( 'Y-m-d H:i:s', $ts );
		wp_update_post(
			array(
				'ID'            => $post_id,
				'post_status'   => 'future',
				'post_date'     => $local,
				'post_date_gmt' => get_gmt_from_date( $local ),
			)
		);
		clean_post_cache( $post_id );
		return $this->ok_post( $post_id );
	}

	/**
	 * Apply a scheduled content update to an already-published post.
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public function advanced( WP_REST_Request $request ) {
		$params  = $request->get_json_params();
		$post_id = isset( $params['post_id'] ) ? absint( $params['post_id'] ) : 0;
		$post    = $this->require_post( $post_id );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		$at = isset( $params['datetime'] ) ? sanitize_text_field( (string) $params['datetime'] ) : '';
		if ( $at !== '' && strtotime( $at ) > time() ) {
			update_post_meta( $post_id, '_nashir_advanced_at', $at );
			return $this->ok_post( $post_id );
		}

		Nashir_Editors::apply_pending( $post_id );
		delete_post_meta( $post_id, '_nashir_advanced_at' );
		return $this->ok_post( $post_id );
	}

	public function settings( WP_REST_Request $request ) {
		$params = $request->get_json_params();
		if ( isset( $params['allowed_types'] ) ) {
			update_option( 'nashir_allowed_types', sanitize_text_field( (string) $params['allowed_types'] ) );
		}
		if ( isset( $params['scheduler_mode'] ) ) {
			update_option( 'nashir_scheduler_mode', sanitize_key( (string) $params['scheduler_mode'] ) );
		}
		return new WP_REST_Response( array( 'ok' => true ), 200 );
	}

	/**
	 * @return WP_Post|WP_Error
	 */
	private function require_post( int $post_id ) {
		$post = get_post( $post_id );
		if ( ! $post instanceof WP_Post ) {
			return new WP_Error( 'nashir_missing_post', __( 'المقال غير موجود.', 'nashir' ), array( 'status' => 404 ) );
		}
		return $post;
	}

	private function set_status( int $post_id, string $status ) {
		wp_update_post(
			array(
				'ID'          => $post_id,
				'post_status' => $status,
			)
		);
		clean_post_cache( $post_id );
		return $this->ok_post( $post_id );
	}

	private function publish_keep_date( WP_Post $post ) {
		global $wpdb;
		$wpdb->update(
			$wpdb->posts,
			array( 'post_status' => 'publish' ),
			array( 'ID' => $post->ID ),
			array( '%s' ),
			array( '%d' )
		);
		clean_post_cache( $post->ID );
		return $this->ok_post( (int) $post->ID );
	}

	private function ok_post( int $post_id ) {
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
	public function serialize_post( WP_Post $post ): array {
		$gmt = get_post_datetime( $post, 'date', 'gmt' );

		return array(
			'wp_post_id'   => (int) $post->ID,
			'title'        => get_the_title( $post ),
			'status'       => $post->post_status,
			'post_type'    => $post->post_type,
			'permalink'    => get_permalink( $post ),
			'scheduled_at' => 'future' === $post->post_status && $gmt ? $gmt->format( DATE_ATOM ) : null,
			'published_at' => 'publish' === $post->post_status && $gmt ? $gmt->format( DATE_ATOM ) : null,
			'unpublish_at' => (string) get_post_meta( $post->ID, '_nashir_unpublish_at', true ) ?: null,
			'republish_at' => (string) get_post_meta( $post->ID, '_nashir_republish_at', true ) ?: null,
			'advanced_at'  => (string) get_post_meta( $post->ID, '_nashir_advanced_at', true ) ?: null,
		);
	}
}
