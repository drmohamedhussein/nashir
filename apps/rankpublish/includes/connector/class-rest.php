<?php
/**
 * RankPublish Connector REST API (rankpublish/v1).
 *
 * @package RankPublish
 */

declare(strict_types=1);

namespace RankPublish\Connector;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Inbound signed endpoints for RankPublish Cloud.
 */
final class Rest {

	private const NS = 'rankpublish/v1';

	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'routes' ) );
	}

	public function routes(): void {
		$signed = array( 'permission_callback' => array( $this, 'verify_signature' ) );

		register_rest_route(
			self::NS,
			'/health',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'health' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route( self::NS, '/integrations', array_merge( $signed, array( 'methods' => 'GET', 'callback' => array( $this, 'integrations' ) ) ) );
		register_rest_route( self::NS, '/capabilities', array_merge( $signed, array( 'methods' => 'GET', 'callback' => array( $this, 'capabilities' ) ) ) );
		register_rest_route( self::NS, '/actions', array_merge( $signed, array( 'methods' => 'POST', 'callback' => array( $this, 'actions' ) ) ) );
		register_rest_route( self::NS, '/posts', array_merge( $signed, array( 'methods' => 'GET', 'callback' => array( $this, 'posts' ) ) ) );
		register_rest_route(
			self::NS,
			'/posts/(?P<post_id>\d+)',
			array_merge(
				$signed,
				array(
					'methods' => 'GET',
					'callback' => array( $this, 'post' ),
					'args'    => array(
						'post_id' => array(
							'type'              => 'integer',
							'required'          => true,
							'sanitize_callback' => 'absint',
						),
					),
				)
			)
		);
	}

	/**
	 * Health is public; other routes require HMAC when site is connected.
	 */
	public function verify_signature( \WP_REST_Request $request ): bool {
		if ( $request->get_route() === '/rankpublish/v1/health' ) {
			return true;
		}

		if ( ! self::is_connected() ) {
			return false;
		}

		return Crypto::verify_request( $request );
	}

	public static function is_connected(): bool {
		$site_id = (string) get_option( 'rankpublish_site_id', '' );
		$secret  = (string) get_option( 'rankpublish_signing_secret', '' );
		if ( $site_id !== '' && $secret !== '' ) {
			return true;
		}

		$site_id = (string) get_option( 'nashir_site_id', '' );
		$secret  = (string) get_option( 'nashir_signing_secret', '' );
		return $site_id !== '' && $secret !== '';
	}

	public function health(): \WP_REST_Response {
		return new \WP_REST_Response(
			array(
				'ok'                 => true,
				'connector_version'  => defined( 'RANKPUBLISH_CONNECTOR_VERSION' ) ? RANKPUBLISH_CONNECTOR_VERSION : '1.0.0',
				'rankpublish_version'=> defined( 'RANKPUBLISH_VERSION' ) ? RANKPUBLISH_VERSION : '',
				'wordpress_version'  => get_bloginfo( 'version' ),
				'site_url'           => home_url(),
				'connected'          => self::is_connected(),
				'integrations'       => Registry::integration_manifest(),
			),
			200
		);
	}

	public function integrations(): \WP_REST_Response {
		return new \WP_REST_Response(
			array(
				'ok'           => true,
				'integrations' => Registry::integration_manifest(),
			),
			200
		);
	}

	public function capabilities(): \WP_REST_Response {
		return new \WP_REST_Response(
			array(
				'ok'           => true,
				'capabilities' => Registry::capabilities(),
			),
			200
		);
	}

	public function actions( \WP_REST_Request $request ) {
		$params = $request->get_json_params();
		if ( ! is_array( $params ) ) {
			return new \WP_Error( 'rankpublish_bad_request', __( 'Invalid JSON body.', 'rankpublish' ), array( 'status' => 400 ) );
		}

		$action = isset( $params['action'] ) ? sanitize_key( (string) $params['action'] ) : '';
		if ( $action === '' ) {
			return new \WP_Error( 'rankpublish_missing_action', __( 'Action is required.', 'rankpublish' ), array( 'status' => 400 ) );
		}

		$payload = isset( $params['payload'] ) && is_array( $params['payload'] ) ? $params['payload'] : array();

		if ( in_array( $action, array( 'posts.list', 'integrations.discover' ), true ) ) {
			return new \WP_REST_Response( array( 'ok' => true, 'result' => $this->core_action( $action, $payload ) ), 200 );
		}

		if ( 'posts.get' === $action ) {
			$post_id = isset( $payload['post_id'] ) ? absint( $payload['post_id'] ) : 0;
			if ( $post_id < 1 ) {
				return new \WP_Error( 'rankpublish_invalid_post', __( 'Invalid post ID.', 'rankpublish' ), array( 'status' => 400 ) );
			}
			return new \WP_REST_Response( array( 'ok' => true, 'result' => $this->serialize_post_workspace( $post_id ) ), 200 );
		}

		$result = Registry::dispatch( $action, $payload );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return new \WP_REST_Response( array( 'ok' => true, 'result' => $result ), 200 );
	}

	public function posts( \WP_REST_Request $request ): \WP_REST_Response {
		$per_page = min( 200, max( 1, (int) $request->get_param( 'per_page' ) ?: 50 ) );
		$items    = $this->query_posts( $per_page );

		return new \WP_REST_Response( array( 'ok' => true, 'posts' => $items ), 200 );
	}

	public function post( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$post_id = (int) $request->get_param( 'post_id' );
		$data    = $this->serialize_post_workspace( $post_id );
		if ( is_wp_error( $data ) ) {
			return $data;
		}

		return new \WP_REST_Response( array( 'ok' => true, 'post' => $data ), 200 );
	}

	/**
	 * @return array<string, mixed>|\WP_Error
	 */
	private function core_action( string $action, array $payload ) {
		switch ( $action ) {
			case 'integrations.discover':
				return array(
					'integrations' => Registry::integration_manifest(),
					'capabilities' => Registry::capabilities(),
				);
			case 'posts.list':
				$per_page = isset( $payload['per_page'] ) ? min( 200, max( 1, absint( $payload['per_page'] ) ) ) : 50;
				return array( 'posts' => $this->query_posts( $per_page ) );
			default:
				return new \WP_Error( 'rankpublish_unknown_action', __( 'Unknown action.', 'rankpublish' ), array( 'status' => 400 ) );
		}
	}

	/**
	 * @return array<int, array<string, mixed>>
	 */
	private function query_posts( int $per_page ): array {
		$query = new \WP_Query(
			array(
				'post_type'      => array( 'post', 'page' ),
				'post_status'    => array( 'draft', 'pending', 'future', 'publish', 'private' ),
				'posts_per_page' => $per_page,
				'orderby'        => 'date',
				'order'          => 'DESC',
				'no_found_rows'  => true,
			)
		);

		$items = array();
		foreach ( $query->posts as $post ) {
			if ( $post instanceof \WP_Post ) {
				$items[] = $this->serialize_post_brief( $post );
			}
		}

		return $items;
	}

	/**
	 * @return array<string, mixed>
	 */
	private function serialize_post_brief( \WP_Post $post ): array {
		$gmt = get_post_datetime( $post, 'date', 'gmt' );

		return array(
			'wp_post_id'   => (int) $post->ID,
			'title'        => get_the_title( $post ),
			'status'       => $post->post_status,
			'post_type'    => $post->post_type,
			'permalink'    => get_permalink( $post ) ?: null,
			'scheduled_at' => 'future' === $post->post_status && $gmt ? $gmt->format( DATE_ATOM ) : null,
			'published_at' => 'publish' === $post->post_status && $gmt ? $gmt->format( DATE_ATOM ) : null,
		);
	}

	/**
	 * @return array<string, mixed>|\WP_Error
	 */
	private function serialize_post_workspace( int $post_id ) {
		$post = get_post( $post_id );
		if ( ! $post instanceof \WP_Post ) {
			return new \WP_Error( 'rankpublish_missing_post', __( 'Post not found.', 'rankpublish' ), array( 'status' => 404 ) );
		}

		$brief = $this->serialize_post_brief( $post );
		$seo   = Registry::dispatch( 'seo.post.read', array( 'post_id' => $post_id ) );
		$sched = Registry::dispatch( 'publishing.post.read', array( 'post_id' => $post_id ) );

		return array(
			...$brief,
			'seo'      => is_wp_error( $seo ) ? null : ( $seo['seo'] ?? null ),
			'schedule' => is_wp_error( $sched ) ? null : ( $sched['schedule'] ?? null ),
			'capabilities' => Registry::capabilities(),
		);
	}
}
