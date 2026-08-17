<?php
/**
 * Unpublish, republish, advanced schedule, publish-keep-date.
 *
 * @package PublisherWP
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Nashir_Metabox {

	public function register(): void {
		add_action( 'add_meta_boxes', array( $this, 'box' ) );
		add_action( 'save_post', array( $this, 'save' ), 10, 2 );
	}

	public function box(): void {
		foreach ( Nashir_Plugin::allowed_types() as $type ) {
			add_meta_box(
				'nashir-schedule-box',
				__( 'جدولة PublisherWP', 'nashir' ),
				array( $this, 'render' ),
				$type,
				'side',
				'high'
			);
		}
	}

	public function render( WP_Post $post ): void {
		if ( ! Nashir_Plugin::licensed() ) {
			echo '<p>' . esc_html__( 'يلزم تفعيل اشتراك PublisherWP لاستخدام الجدولة المتقدمة على هذا الموقع.', 'nashir' ) . '</p>';
			return;
		}
		wp_nonce_field( 'nashir_metabox', 'nashir_metabox_nonce' );
		$unpublish = (string) get_post_meta( $post->ID, '_nashir_unpublish_at', true );
		$republish = (string) get_post_meta( $post->ID, '_nashir_republish_at', true );
		$advanced  = (string) get_post_meta( $post->ID, '_nashir_advanced_at', true );
		$keep      = (string) get_post_meta( $post->ID, '_nashir_keep_date', true );
		?>
		<p>
			<label>
				<input type="checkbox" name="nashir_keep_date" value="1" <?php checked( $keep, '1' ); ?>>
				<?php esc_html_e( 'انشر الآن مع الإبقاء على التاريخ المستقبلي', 'nashir' ); ?>
			</label>
		</p>
		<p>
			<label><?php esc_html_e( 'إلغاء النشر في', 'nashir' ); ?></label>
			<input type="datetime-local" name="nashir_unpublish_at" value="<?php echo esc_attr( $this->to_local_input( $unpublish ) ); ?>">
		</p>
		<p>
			<label><?php esc_html_e( 'إعادة النشر في', 'nashir' ); ?></label>
			<input type="datetime-local" name="nashir_republish_at" value="<?php echo esc_attr( $this->to_local_input( $republish ) ); ?>">
		</p>
		<p>
			<label><?php esc_html_e( 'تحديث مجدول (يبقى منشوراً)', 'nashir' ); ?></label>
			<input type="datetime-local" name="nashir_advanced_at" value="<?php echo esc_attr( $this->to_local_input( $advanced ) ); ?>">
		</p>
		<p class="description"><?php esc_html_e( 'عند حلول موعد التحديث تُطبَّق النسخة المحفوظة دون تحويل المقال إلى مسودة. يعمل مع المحرر الكلاسيكي وغوتنبرغ وإليمنتور إن وُجد.', 'nashir' ); ?></p>
		<?php
	}

	public function save( int $post_id, WP_Post $post ): void {
		if ( ! Nashir_Plugin::licensed() ) {
			return;
		}
		if ( ! isset( $_POST['nashir_metabox_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( (string) $_POST['nashir_metabox_nonce'] ) ), 'nashir_metabox' ) ) {
			return;
		}
		if ( wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) ) {
			return;
		}
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		$this->save_meta_date( $post_id, 'nashir_unpublish_at', '_nashir_unpublish_at' );
		$this->save_meta_date( $post_id, 'nashir_republish_at', '_nashir_republish_at' );
		$this->save_meta_date( $post_id, 'nashir_advanced_at', '_nashir_advanced_at' );

		$keep = isset( $_POST['nashir_keep_date'] ) ? '1' : '';
		if ( $keep ) {
			update_post_meta( $post_id, '_nashir_keep_date', '1' );
			if ( 'publish' === $post->post_status || isset( $_POST['publish'] ) ) {
				global $wpdb;
				$wpdb->update( $wpdb->posts, array( 'post_status' => 'publish' ), array( 'ID' => $post_id ), array( '%s' ), array( '%d' ) );
				clean_post_cache( $post_id );
			}
		} else {
			delete_post_meta( $post_id, '_nashir_keep_date' );
		}

		if ( (string) get_post_meta( $post_id, '_nashir_advanced_at', true ) !== '' ) {
			Nashir_Editors::store_pending( $post_id );
		}
	}

	private function save_meta_date( int $post_id, string $field, string $meta ): void {
		$value = isset( $_POST[ $field ] ) ? sanitize_text_field( wp_unslash( (string) $_POST[ $field ] ) ) : '';
		if ( $value === '' ) {
			delete_post_meta( $post_id, $meta );
			return;
		}
		$ts = strtotime( $value );
		if ( ! $ts ) {
			return;
		}
		update_post_meta( $post_id, $meta, gmdate( 'c', $ts ) );
	}

	private function to_local_input( string $iso ): string {
		if ( $iso === '' ) {
			return '';
		}
		$ts = strtotime( $iso );
		return $ts ? wp_date( 'Y-m-d\TH:i', $ts ) : '';
	}
}
