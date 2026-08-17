<?php
/**
 * SchedulePress engine adapter.
 *
 * @package RankPublish
 */

declare(strict_types=1);

namespace RankPublish\Connector\Integrations;

use RankPublish\Connector\Internal_Rest;
use RankPublish\Modules\Schedule_Module;
use RankPublish\Modules\Schedule_Pro_Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Proxies RankPublish actions to SchedulePress REST.
 */
final class SchedulePress_Adapter implements Integration_Interface {

	public function id(): string {
		return 'schedulepress';
	}

	public function label(): string {
		return __( 'Publishing', 'rankpublish' );
	}

	public function is_available(): bool {
		return Schedule_Module::is_loaded() || defined( 'WPSP_VERSION' );
	}

	public function version(): ?string {
		return defined( 'WPSP_VERSION' ) ? (string) WPSP_VERSION : null;
	}

	public function capabilities(): array {
		if ( ! $this->is_available() ) {
			return array();
		}

		$items = array(
			array(
				'id'          => 'publishing.post.read',
				'label'       => __( 'Read post schedule', 'rankpublish' ),
				'integration' => $this->id(),
			),
			array(
				'id'          => 'publishing.post.write',
				'label'       => __( 'Update post schedule', 'rankpublish' ),
				'integration' => $this->id(),
			),
			array(
				'id'          => 'publishing.calendar.list',
				'label'       => __( 'Calendar posts', 'rankpublish' ),
				'integration' => $this->id(),
			),
		);

		if ( Schedule_Pro_Module::is_loaded() || defined( 'WPSP_PRO_VERSION' ) ) {
			$items[] = array(
				'id'          => 'publishing.advanced.read',
				'label'       => __( 'Advanced scheduling', 'rankpublish' ),
				'integration' => 'schedulepress-pro',
			);
		}

		return $items;
	}

	/**
	 * @param array<string, mixed> $payload
	 * @return array<string, mixed>|\WP_Error
	 */
	public function handle_action( string $action, array $payload ) {
		switch ( $action ) {
			case 'publishing.post.read':
				return $this->read_post_schedule( $payload );
			case 'publishing.post.write':
				return $this->write_post_schedule( $payload );
			case 'publishing.calendar.list':
				return $this->list_calendar_posts( $payload );
			default:
				return new \WP_Error( 'rankpublish_unknown_action', __( 'Unknown publishing action.', 'rankpublish' ), array( 'status' => 400 ) );
		}
	}

	/**
	 * @param array<string, mixed> $payload
	 * @return array<string, mixed>|\WP_Error
	 */
	private function read_post_schedule( array $payload ) {
		$post_id = isset( $payload['post_id'] ) ? absint( $payload['post_id'] ) : 0;
		if ( $post_id < 1 ) {
			return new \WP_Error( 'rankpublish_invalid_post', __( 'Invalid post ID.', 'rankpublish' ), array( 'status' => 400 ) );
		}

		$data = Internal_Rest::get(
			'/wp-scheduled-posts/v1/post-panel/' . $post_id,
			array( 'post_id' => $post_id )
		);

		if ( is_wp_error( $data ) ) {
			return $data;
		}

		return array(
			'post_id'  => $post_id,
			'schedule' => $data,
		);
	}

	/**
	 * @param array<string, mixed> $payload
	 * @return array<string, mixed>|\WP_Error
	 */
	private function write_post_schedule( array $payload ) {
		$post_id = isset( $payload['post_id'] ) ? absint( $payload['post_id'] ) : 0;
		if ( $post_id < 1 ) {
			return new \WP_Error( 'rankpublish_invalid_post', __( 'Invalid post ID.', 'rankpublish' ), array( 'status' => 400 ) );
		}

		$params = array( 'post_id' => $post_id );
		if ( isset( $payload['schedule_date'] ) ) {
			$params['schedule_date'] = (string) $payload['schedule_date'];
		}
		if ( isset( $payload['is_scheduled'] ) ) {
			$params['is_scheduled'] = (bool) $payload['is_scheduled'];
		}

		$data = Internal_Rest::post( '/wp-scheduled-posts/v1/post-panel/' . $post_id, $params );
		if ( is_wp_error( $data ) ) {
			return $data;
		}

		return $this->read_post_schedule( array( 'post_id' => $post_id ) );
	}

	/**
	 * @param array<string, mixed> $payload
	 * @return array<string, mixed>|\WP_Error
	 */
	private function list_calendar_posts( array $payload ) {
		$params = array();
		if ( isset( $payload['per_page'] ) ) {
			$params['per_page'] = absint( $payload['per_page'] );
		}

		$data = Internal_Rest::get( '/wpscp/v1/posts', $params );
		if ( is_wp_error( $data ) ) {
			return $data;
		}

		return array( 'posts' => $data );
	}
}
