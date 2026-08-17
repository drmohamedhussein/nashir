<?php
/**
 * Dedicated WP user for internal engine REST calls.
 *
 * @package RankPublish
 */

declare(strict_types=1);

namespace RankPublish\Connector;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Ensures a service account exists for adapter → engine dispatch.
 */
final class Service_User {

	private const OPTION_ID   = 'rankpublish_service_user_id';
	private const LOGIN       = 'rankpublish-connector';
	private const DISPLAY     = 'RankPublish Connector';

	/**
	 * Return a user ID suitable for engine REST permission checks.
	 */
	public static function ensure(): int {
		$stored = (int) get_option( self::OPTION_ID, 0 );
		if ( $stored > 0 && get_user_by( 'id', $stored ) instanceof \WP_User ) {
			return $stored;
		}

		$existing = get_user_by( 'login', self::LOGIN );
		if ( $existing instanceof \WP_User ) {
			update_option( self::OPTION_ID, $existing->ID );
			self::grant_caps( $existing->ID );
			return (int) $existing->ID;
		}

		$user_id = wp_insert_user(
			array(
				'user_login'   => self::LOGIN,
				'user_pass'    => wp_generate_password( 32, true, true ),
				'user_email'   => self::LOGIN . '@localhost.invalid',
				'display_name' => self::DISPLAY,
				'role'         => 'administrator',
			)
		);

		if ( is_wp_error( $user_id ) ) {
			// Dev fallback: first admin.
			return 1;
		}

		update_option( self::OPTION_ID, $user_id );
		self::grant_caps( (int) $user_id );
		return (int) $user_id;
	}

	/**
	 * Run callback as service user, then restore previous user.
	 *
	 * @template T
	 * @param callable():T $callback
	 * @return T
	 */
	public static function as_service( callable $callback ) {
		$previous = get_current_user_id();
		wp_set_current_user( self::ensure() );

		try {
			return $callback();
		} finally {
			wp_set_current_user( $previous );
		}
	}

	private static function grant_caps( int $user_id ): void {
		$user = get_user_by( 'id', $user_id );
		if ( ! $user instanceof \WP_User ) {
			return;
		}

		$caps = array(
			'read',
			'edit_posts',
			'edit_pages',
			'publish_posts',
			'manage_options',
			'thinkrank_access',
			'thinkrank_settings',
			'thinkrank_content_tools',
			'thinkrank_analytics',
		);

		foreach ( $caps as $cap ) {
			$user->add_cap( $cap );
		}
	}
}
