<?php
/**
 * In-process REST dispatch to ThinkRank / SchedulePress routes.
 *
 * @package RankPublish
 */

declare(strict_types=1);

namespace RankPublish\Connector;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Wraps rest_do_request() under the connector service user.
 */
final class Internal_Rest {

	/**
	 * @param array<string, mixed> $params
	 * @return array<string, mixed>|\WP_Error
	 */
	public static function request( string $method, string $route, array $params = array() ) {
		return Service_User::as_service(
			static function () use ( $method, $route, $params ): \WP_REST_Response|\WP_Error {
				$request = new \WP_REST_Request( $method, $route );
				foreach ( $params as $key => $value ) {
					$request->set_param( $key, $value );
				}

				$response = rest_do_request( $request );
				if ( $response->is_error() ) {
					return $response->as_error();
				}

				$data = $response->get_data();
				return is_array( $data ) ? $data : array( 'data' => $data );
			}
		);
	}

	/**
	 * @return array<string, mixed>|\WP_Error
	 */
	public static function get( string $route, array $params = array() ) {
		return self::request( 'GET', $route, $params );
	}

	/**
	 * @return array<string, mixed>|\WP_Error
	 */
	public static function post( string $route, array $params = array() ) {
		return self::request( 'POST', $route, $params );
	}
}
