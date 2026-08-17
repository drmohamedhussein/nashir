<?php
/**
 * ThinkRank engine adapter.
 *
 * @package RankPublish
 */

declare(strict_types=1);

namespace RankPublish\Connector\Integrations;

use RankPublish\Connector\Internal_Rest;
use RankPublish\Modules\Seo_Module;
use RankPublish\Modules\Seo_Pro_Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Proxies RankPublish actions to ThinkRank REST / APIs.
 */
final class ThinkRank_Adapter implements Integration_Interface {

	public function id(): string {
		return 'thinkrank';
	}

	public function label(): string {
		return 'SEO';
	}

	public function is_available(): bool {
		return Seo_Module::is_loaded() || defined( 'THINKRANK_VERSION' );
	}

	public function version(): ?string {
		return defined( 'THINKRANK_VERSION' ) ? (string) THINKRANK_VERSION : null;
	}

	public function capabilities(): array {
		if ( ! $this->is_available() ) {
			return array();
		}

		$items = array(
			array(
				'id'          => 'seo.post.read',
				'label'       => __( 'Read post SEO', 'rankpublish' ),
				'integration' => $this->id(),
			),
			array(
				'id'          => 'seo.post.write',
				'label'       => __( 'Update post SEO', 'rankpublish' ),
				'integration' => $this->id(),
			),
			array(
				'id'          => 'seo.settings.read',
				'label'       => __( 'Read SEO settings', 'rankpublish' ),
				'integration' => $this->id(),
			),
		);

		if ( Seo_Pro_Module::is_loaded() || defined( 'THINKRANK_PRO_VERSION' ) ) {
			$items[] = array(
				'id'          => 'seo.rank.read',
				'label'       => __( 'Rank tracker', 'rankpublish' ),
				'integration' => 'thinkrank-pro',
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
			case 'seo.post.read':
				return $this->read_post_seo( $payload );
			case 'seo.post.write':
				return $this->write_post_seo( $payload );
			case 'seo.settings.read':
				return Internal_Rest::get( '/thinkrank/v1/settings' );
			default:
				return new \WP_Error( 'rankpublish_unknown_action', __( 'Unknown SEO action.', 'rankpublish' ), array( 'status' => 400 ) );
		}
	}

	/**
	 * @param array<string, mixed> $payload
	 * @return array<string, mixed>|\WP_Error
	 */
	private function read_post_seo( array $payload ) {
		$post_id = isset( $payload['post_id'] ) ? absint( $payload['post_id'] ) : 0;
		if ( $post_id < 1 ) {
			return new \WP_Error( 'rankpublish_invalid_post', __( 'Invalid post ID.', 'rankpublish' ), array( 'status' => 400 ) );
		}

		$data = Internal_Rest::get(
			'/thinkrank/v1/metadata/' . $post_id,
			array( 'post_id' => $post_id )
		);

		if ( is_wp_error( $data ) ) {
			return $data;
		}

		return array(
			'post_id' => $post_id,
			'seo'     => $data,
		);
	}

	/**
	 * @param array<string, mixed> $payload
	 * @return array<string, mixed>|\WP_Error
	 */
	private function write_post_seo( array $payload ) {
		$post_id = isset( $payload['post_id'] ) ? absint( $payload['post_id'] ) : 0;
		if ( $post_id < 1 || ! get_post( $post_id ) ) {
			return new \WP_Error( 'rankpublish_invalid_post', __( 'Post not found.', 'rankpublish' ), array( 'status' => 404 ) );
		}

		if ( ! class_exists( '\ThinkRank\Admin\Metabox_Manager' ) ) {
			return new \WP_Error( 'thinkrank_unavailable', __( 'ThinkRank is not loaded.', 'rankpublish' ), array( 'status' => 503 ) );
		}

		$fields = array();
		if ( isset( $payload['title'] ) ) {
			$fields['thinkrank_seo_title'] = (string) $payload['title'];
		}
		if ( isset( $payload['description'] ) ) {
			$fields['thinkrank_meta_description'] = (string) $payload['description'];
		}
		if ( isset( $payload['focus_keyword'] ) ) {
			$fields['thinkrank_focus_keyword'] = (string) $payload['focus_keyword'];
		}
		if ( isset( $payload['focus_keywords'] ) && is_array( $payload['focus_keywords'] ) ) {
			$fields['thinkrank_focus_keywords'] = wp_json_encode( array_values( $payload['focus_keywords'] ) );
		}

		if ( $fields === array() ) {
			return new \WP_Error( 'rankpublish_empty_payload', __( 'No SEO fields to update.', 'rankpublish' ), array( 'status' => 400 ) );
		}

		( new \ThinkRank\Admin\Metabox_Manager() )->save_seo_fields( $post_id, $fields );

		return $this->read_post_seo( array( 'post_id' => $post_id ) );
	}
}
