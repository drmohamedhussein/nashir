<?php
/**
 * Admin: Website marketing CMS.
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * RankPublish Core → Website submenu.
 */
final class RankPublish_Site_Marketing_Admin {

	private const MENU = 'rankpublish-core-website';

	public function init(): void {
		add_action( 'admin_menu', array( $this, 'register_menu' ), 20 );
		add_action( 'admin_post_rpsite_save_marketing', array( $this, 'handle_save' ) );
		add_action( 'admin_post_rpsite_reset_marketing_group', array( $this, 'handle_reset_group' ) );
		add_action( 'admin_post_nopriv_rpsite_contact', array( $this, 'handle_contact' ) );
		add_action( 'admin_post_rpsite_contact', array( $this, 'handle_contact' ) );
	}

	public function register_menu(): void {
		add_submenu_page(
			'rankpublish-core',
			__( 'Website', 'rankpublish-site' ),
			__( 'Website', 'rankpublish-site' ),
			'manage_options',
			self::MENU,
			array( $this, 'render' )
		);
	}

	public function handle_save(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Forbidden', 'rankpublish-site' ) );
		}
		check_admin_referer( 'rpsite_save_marketing' );

		$locale = isset( $_POST['locale'] ) && 'ar' === $_POST['locale'] ? 'ar' : 'en';
		$group  = isset( $_POST['group'] ) ? sanitize_key( (string) wp_unslash( $_POST['group'] ) ) : 'hero';
		$data   = RankPublish_Site_Marketing::get();

		$data['contact_email']   = isset( $_POST['contact_email'] ) ? sanitize_email( wp_unslash( (string) $_POST['contact_email'] ) ) : $data['contact_email'];
		$data['promo_enabled']   = ! empty( $_POST['promo_enabled'] );
		$data['show_tools']      = ! empty( $_POST['show_tools'] );
		$data['show_audience']   = ! empty( $_POST['show_audience'] );
		$data['show_cloud_card'] = ! empty( $_POST['show_cloud_card'] );

		$keys = RankPublish_Site_Marketing::editable_groups()[ $group ] ?? array();
		if ( ! isset( $data['overrides'][ $locale ] ) || ! is_array( $data['overrides'][ $locale ] ) ) {
			$data['overrides'][ $locale ] = array();
		}
		foreach ( $keys as $key ) {
			$field = 'mk_' . $key;
			if ( ! isset( $_POST[ $field ] ) ) {
				continue;
			}
			$val = trim( sanitize_textarea_field( wp_unslash( (string) $_POST[ $field ] ) ) );
			if ( '' === $val ) {
				unset( $data['overrides'][ $locale ][ $key ] );
			} else {
				$data['overrides'][ $locale ][ $key ] = $val;
			}
		}

		if ( isset( $_POST['faq_q_en'] ) && is_array( $_POST['faq_q_en'] ) ) {
			$faq = array();
			$q_en = wp_unslash( $_POST['faq_q_en'] ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
			$a_en = isset( $_POST['faq_a_en'] ) && is_array( $_POST['faq_a_en'] ) ? wp_unslash( $_POST['faq_a_en'] ) : array(); // phpcs:ignore
			$q_ar = isset( $_POST['faq_q_ar'] ) && is_array( $_POST['faq_q_ar'] ) ? wp_unslash( $_POST['faq_q_ar'] ) : array(); // phpcs:ignore
			$a_ar = isset( $_POST['faq_a_ar'] ) && is_array( $_POST['faq_a_ar'] ) ? wp_unslash( $_POST['faq_a_ar'] ) : array(); // phpcs:ignore
			$count = count( $q_en );
			for ( $i = 0; $i < $count; $i++ ) {
				$faq[] = array(
					'q_en' => sanitize_text_field( (string) ( $q_en[ $i ] ?? '' ) ),
					'a_en' => sanitize_textarea_field( (string) ( $a_en[ $i ] ?? '' ) ),
					'q_ar' => sanitize_text_field( (string) ( $q_ar[ $i ] ?? '' ) ),
					'a_ar' => sanitize_textarea_field( (string) ( $a_ar[ $i ] ?? '' ) ),
				);
			}
			$data['faq'] = $faq;
		}

		if ( isset( $_POST['cl_version'] ) && is_array( $_POST['cl_version'] ) ) {
			$cl = array();
			$versions = wp_unslash( $_POST['cl_version'] ); // phpcs:ignore
			$be = isset( $_POST['cl_body_en'] ) && is_array( $_POST['cl_body_en'] ) ? wp_unslash( $_POST['cl_body_en'] ) : array(); // phpcs:ignore
			$ba = isset( $_POST['cl_body_ar'] ) && is_array( $_POST['cl_body_ar'] ) ? wp_unslash( $_POST['cl_body_ar'] ) : array(); // phpcs:ignore
			$count = count( $versions );
			for ( $i = 0; $i < $count; $i++ ) {
				$cl[] = array(
					'version' => sanitize_text_field( (string) ( $versions[ $i ] ?? '' ) ),
					'body_en' => sanitize_textarea_field( (string) ( $be[ $i ] ?? '' ) ),
					'body_ar' => sanitize_textarea_field( (string) ( $ba[ $i ] ?? '' ) ),
				);
			}
			$data['changelog'] = $cl;
		}

		RankPublish_Site_Marketing::save( $data );

		wp_safe_redirect(
			admin_url(
				'admin.php?page=' . self::MENU . '&saved=1&group=' . rawurlencode( $group ) . '&locale=' . $locale
			)
		);
		exit;
	}

	public function handle_reset_group(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Forbidden', 'rankpublish-site' ) );
		}
		check_admin_referer( 'rpsite_reset_marketing_group' );
		$locale = isset( $_POST['locale'] ) && 'ar' === $_POST['locale'] ? 'ar' : 'en';
		$group  = isset( $_POST['group'] ) ? sanitize_key( (string) wp_unslash( $_POST['group'] ) ) : 'hero';
		$data   = RankPublish_Site_Marketing::get();
		$keys   = RankPublish_Site_Marketing::editable_groups()[ $group ] ?? array();
		foreach ( $keys as $key ) {
			unset( $data['overrides'][ $locale ][ $key ] );
		}
		RankPublish_Site_Marketing::save( $data );
		wp_safe_redirect( admin_url( 'admin.php?page=' . self::MENU . '&reset=1&group=' . rawurlencode( $group ) . '&locale=' . $locale ) );
		exit;
	}

	public function handle_contact(): void {
		check_admin_referer( 'rpsite_contact' );
		$name    = isset( $_POST['rp_name'] ) ? sanitize_text_field( wp_unslash( (string) $_POST['rp_name'] ) ) : '';
		$email   = isset( $_POST['rp_email'] ) ? sanitize_email( wp_unslash( (string) $_POST['rp_email'] ) ) : '';
		$message = isset( $_POST['rp_message'] ) ? sanitize_textarea_field( wp_unslash( (string) $_POST['rp_message'] ) ) : '';
		$to      = (string) ( RankPublish_Site_Marketing::get()['contact_email'] ?? get_option( 'admin_email' ) );

		$ok = false;
		if ( $to && is_email( $email ) && '' !== $message ) {
			$subject = sprintf( '[RankPublish] Contact from %s', $name ?: $email );
			$body    = "Name: {$name}\nEmail: {$email}\n\n{$message}\n";
			$ok      = (bool) wp_mail( $to, $subject, $body, array( 'Reply-To: ' . $email ) );
		}

		$redirect = wp_get_referer() ?: home_url( '/contact/' );
		$redirect = add_query_arg( 'contact', $ok ? 'sent' : 'fail', $redirect );
		wp_safe_redirect( $redirect );
		exit;
	}

	public function render(): void {
		$group  = isset( $_GET['group'] ) ? sanitize_key( (string) wp_unslash( $_GET['group'] ) ) : 'hero';
		$locale = isset( $_GET['locale'] ) && 'ar' === $_GET['locale'] ? 'ar' : 'en';
		$groups = RankPublish_Site_Marketing::editable_groups();
		if ( ! isset( $groups[ $group ] ) ) {
			$group = 'hero';
		}
		$data = RankPublish_Site_Marketing::get();

		echo '<div class="wrap rpsite-os">';
		echo '<h1>' . esc_html__( 'Website', 'rankpublish-site' ) . '</h1>';
		echo '<p class="description">' . esc_html__( 'Control marketing copy, FAQ, changelog, and contact for the RankPublish site. Empty fields use the built-in defaults.', 'rankpublish-site' ) . '</p>';

		if ( isset( $_GET['saved'] ) ) {
			echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__( 'Website content saved.', 'rankpublish-site' ) . '</p></div>';
		}
		if ( isset( $_GET['reset'] ) ) {
			echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__( 'Group reset to defaults.', 'rankpublish-site' ) . '</p></div>';
		}

		echo '<h2 class="nav-tab-wrapper" style="margin-top:16px">';
		foreach ( array_keys( $groups ) as $g ) {
			$url = admin_url( 'admin.php?page=' . self::MENU . '&group=' . $g . '&locale=' . $locale );
			$class = $g === $group ? ' nav-tab-active' : '';
			echo '<a class="nav-tab' . esc_attr( $class ) . '" href="' . esc_url( $url ) . '">' . esc_html( ucfirst( $g ) ) . '</a>';
		}
		echo '<a class="nav-tab' . ( 'faq' === $group ? ' nav-tab-active' : '' ) . '" href="' . esc_url( admin_url( 'admin.php?page=' . self::MENU . '&group=faq&locale=' . $locale ) ) . '">FAQ</a>';
		echo '<a class="nav-tab' . ( 'changelog' === $group ? ' nav-tab-active' : '' ) . '" href="' . esc_url( admin_url( 'admin.php?page=' . self::MENU . '&group=changelog&locale=' . $locale ) ) . '">Changelog</a>';
		echo '<a class="nav-tab' . ( 'options' === $group ? ' nav-tab-active' : '' ) . '" href="' . esc_url( admin_url( 'admin.php?page=' . self::MENU . '&group=options&locale=' . $locale ) ) . '">Options</a>';
		echo '</h2>';

		echo '<p>';
		foreach ( array( 'en' => 'English', 'ar' => 'العربية' ) as $code => $label ) {
			$url = admin_url( 'admin.php?page=' . self::MENU . '&group=' . $group . '&locale=' . $code );
			$style = $code === $locale ? 'font-weight:700;text-decoration:underline' : '';
			echo '<a style="margin-inline-end:12px;' . esc_attr( $style ) . '" href="' . esc_url( $url ) . '">' . esc_html( $label ) . '</a>';
		}
		echo '</p>';

		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
		wp_nonce_field( 'rpsite_save_marketing' );
		echo '<input type="hidden" name="action" value="rpsite_save_marketing" />';
		echo '<input type="hidden" name="group" value="' . esc_attr( $group ) . '" />';
		echo '<input type="hidden" name="locale" value="' . esc_attr( $locale ) . '" />';

		if ( 'options' === $group ) {
			$this->render_options( $data );
		} elseif ( 'faq' === $group ) {
			$this->render_faq( $data );
		} elseif ( 'changelog' === $group ) {
			$this->render_changelog( $data );
		} else {
			$this->render_group_fields( $group, $locale, $data );
		}

		submit_button( __( 'Save website content', 'rankpublish-site' ) );
		echo '</form>';

		if ( isset( $groups[ $group ] ) ) {
			echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" style="margin-top:12px" onsubmit="return confirm(\'Reset this group to defaults?\');">';
			wp_nonce_field( 'rpsite_reset_marketing_group' );
			echo '<input type="hidden" name="action" value="rpsite_reset_marketing_group" />';
			echo '<input type="hidden" name="group" value="' . esc_attr( $group ) . '" />';
			echo '<input type="hidden" name="locale" value="' . esc_attr( $locale ) . '" />';
			submit_button( __( 'Reset this group to defaults', 'rankpublish-site' ), 'delete', 'submit', false );
			echo '</form>';
		}

		echo '</div>';
	}

	/**
	 * @param array<string, mixed> $data Marketing data.
	 */
	private function render_options( array $data ): void {
		echo '<table class="form-table"><tbody>';
		echo '<tr><th>' . esc_html__( 'Contact email', 'rankpublish-site' ) . '</th><td><input type="email" class="regular-text" name="contact_email" value="' . esc_attr( (string) $data['contact_email'] ) . '" /></td></tr>';
		echo '<tr><th>' . esc_html__( 'Promo bar', 'rankpublish-site' ) . '</th><td><label><input type="checkbox" name="promo_enabled" value="1" ' . checked( ! empty( $data['promo_enabled'] ), true, false ) . ' /> ' . esc_html__( 'Show promo bar on inner pages', 'rankpublish-site' ) . '</label></td></tr>';
		echo '<tr><th>' . esc_html__( 'Homepage sections', 'rankpublish-site' ) . '</th><td>';
		echo '<label style="display:block;margin-bottom:6px"><input type="checkbox" name="show_cloud_card" value="1" ' . checked( ! empty( $data['show_cloud_card'] ), true, false ) . ' /> ' . esc_html__( 'Show Cloud Connect product card', 'rankpublish-site' ) . '</label>';
		echo '<label style="display:block;margin-bottom:6px"><input type="checkbox" name="show_tools" value="1" ' . checked( ! empty( $data['show_tools'] ), true, false ) . ' /> ' . esc_html__( 'Show tools grid', 'rankpublish-site' ) . '</label>';
		echo '<label style="display:block"><input type="checkbox" name="show_audience" value="1" ' . checked( ! empty( $data['show_audience'] ), true, false ) . ' /> ' . esc_html__( 'Show audience section', 'rankpublish-site' ) . '</label>';
		echo '</td></tr></tbody></table>';
	}

	/**
	 * @param array<string, mixed> $data Marketing data.
	 */
	private function render_faq( array $data ): void {
		$rows = is_array( $data['faq'] ?? null ) ? $data['faq'] : array();
		$rows[] = array( 'q_en' => '', 'a_en' => '', 'q_ar' => '', 'a_ar' => '' );
		echo '<p class="description">' . esc_html__( 'Add a blank row at the end for a new question. Clear all fields in a row to remove it on save.', 'rankpublish-site' ) . '</p>';
		foreach ( $rows as $i => $row ) {
			echo '<fieldset style="border:1px solid #dcdcde;padding:12px;margin-bottom:12px;border-radius:8px">';
			echo '<legend>#' . esc_html( (string) ( $i + 1 ) ) . '</legend>';
			echo '<p><label>Q EN<br><input class="large-text" name="faq_q_en[]" value="' . esc_attr( (string) ( $row['q_en'] ?? '' ) ) . '" /></label></p>';
			echo '<p><label>A EN<br><textarea class="large-text" rows="3" name="faq_a_en[]">' . esc_textarea( (string) ( $row['a_en'] ?? '' ) ) . '</textarea></label></p>';
			echo '<p><label>Q AR<br><input class="large-text" name="faq_q_ar[]" value="' . esc_attr( (string) ( $row['q_ar'] ?? '' ) ) . '" dir="rtl" /></label></p>';
			echo '<p><label>A AR<br><textarea class="large-text" rows="3" name="faq_a_ar[]" dir="rtl">' . esc_textarea( (string) ( $row['a_ar'] ?? '' ) ) . '</textarea></label></p>';
			echo '</fieldset>';
		}
	}

	/**
	 * @param array<string, mixed> $data Marketing data.
	 */
	private function render_changelog( array $data ): void {
		$rows = is_array( $data['changelog'] ?? null ) ? $data['changelog'] : array();
		$rows[] = array( 'version' => '', 'body_en' => '', 'body_ar' => '' );
		foreach ( $rows as $row ) {
			echo '<fieldset style="border:1px solid #dcdcde;padding:12px;margin-bottom:12px;border-radius:8px">';
			echo '<p><label>Version<br><input class="regular-text" name="cl_version[]" value="' . esc_attr( (string) ( $row['version'] ?? '' ) ) . '" /></label></p>';
			echo '<p><label>EN<br><textarea class="large-text" rows="2" name="cl_body_en[]">' . esc_textarea( (string) ( $row['body_en'] ?? '' ) ) . '</textarea></label></p>';
			echo '<p><label>AR<br><textarea class="large-text" rows="2" name="cl_body_ar[]" dir="rtl">' . esc_textarea( (string) ( $row['body_ar'] ?? '' ) ) . '</textarea></label></p>';
			echo '</fieldset>';
		}
	}

	/**
	 * @param array<string, mixed> $data Marketing data.
	 */
	private function render_group_fields( string $group, string $locale, array $data ): void {
		$keys = RankPublish_Site_Marketing::editable_groups()[ $group ] ?? array();
		echo '<table class="form-table"><tbody>';
		foreach ( $keys as $key ) {
			$current = (string) ( $data['overrides'][ $locale ][ $key ] ?? '' );
			$default = RankPublish_Site_Marketing::text( $key, $locale );
			// If current empty, show default as placeholder (not as value so save keeps default).
			echo '<tr><th scope="row"><label for="mk-' . esc_attr( $key ) . '"><code>' . esc_html( $key ) . '</code></label></th>';
			echo '<td><textarea class="large-text" rows="2" id="mk-' . esc_attr( $key ) . '" name="mk_' . esc_attr( $key ) . '" placeholder="' . esc_attr( $default ) . '" ' . ( 'ar' === $locale ? 'dir="rtl"' : '' ) . '>' . esc_textarea( $current ) . '</textarea>';
			if ( '' === $current ) {
				echo '<p class="description">' . esc_html__( 'Using default:', 'rankpublish-site' ) . ' ' . esc_html( mb_strimwidth( $default, 0, 120, '…' ) ) . '</p>';
			}
			echo '</td></tr>';
		}
		echo '</tbody></table>';
	}
}
