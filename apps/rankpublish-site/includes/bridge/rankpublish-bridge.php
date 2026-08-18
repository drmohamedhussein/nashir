<?php
/**
 * RankPublish Bridge — standalone connector for customer WordPress sites.
 *
 * Packaged from RankPublish Site Core; does not include SchedulePress or ThinkRank.
 *
 * @package RankPublishBridge
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const RANKPUBLISH_BRIDGE_OPTION = 'rankpublish_bridge_connection';
const RANKPUBLISH_BRIDGE_VERSION = '0.2.0';

/**
 * @return array<string, mixed>
 */
function rankpublish_bridge_get_connection(): array {
	$connection = get_option( RANKPUBLISH_BRIDGE_OPTION, array() );
	return is_array( $connection ) ? $connection : array();
}

/**
 * Default SaaS bootstrap endpoint from Site Core cloud URL.
 */
function rankpublish_bridge_default_endpoint(): string {
	$cloud = untrailingslashit( (string) get_option( 'rankpublish_cloud_url', '' ) );
	if ( '' === $cloud ) {
		$cloud = 'https://nashir.satest.top';
	}
	return trailingslashit( $cloud ) . 'api/rankpublish/bridge/connect';
}

function rankpublish_bridge_render_settings(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	$connection = rankpublish_bridge_get_connection();
	$notice     = isset( $_GET['rankpublish_notice'] ) ? sanitize_key( wp_unslash( (string) $_GET['rankpublish_notice'] ) ) : '';
	$endpoint   = isset( $connection['endpoint'] ) ? (string) $connection['endpoint'] : rankpublish_bridge_default_endpoint();
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'Connect RankPublish', 'rankpublish-bridge' ); ?></h1>
		<p><?php esc_html_e( 'Paste the one-time connection details from your RankPublish workspace. The setup token is exchanged once and is never saved on this site.', 'rankpublish-bridge' ); ?></p>
		<?php if ( 'connected' === $notice ) : ?>
			<div class="notice notice-success"><p><?php esc_html_e( 'This site is securely connected to RankPublish.', 'rankpublish-bridge' ); ?></p></div>
		<?php elseif ( 'failed' === $notice ) : ?>
			<div class="notice notice-error"><p><?php esc_html_e( 'RankPublish could not verify the connection. Check the endpoint, site ID, and unexpired token, then try again.', 'rankpublish-bridge' ); ?></p></div>
		<?php endif; ?>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<?php wp_nonce_field( 'rankpublish_bridge_connect' ); ?>
			<input type="hidden" name="action" value="rankpublish_bridge_connect" />
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="rankpublish_endpoint"><?php esc_html_e( 'RankPublish endpoint', 'rankpublish-bridge' ); ?></label></th>
					<td><input class="regular-text code" id="rankpublish_endpoint" name="endpoint" type="url" required value="<?php echo esc_attr( $endpoint ); ?>" placeholder="https://app.example.com/api/rankpublish/bridge/connect" /></td>
				</tr>
				<tr>
					<th scope="row"><label for="rankpublish_site_id"><?php esc_html_e( 'Site ID', 'rankpublish-bridge' ); ?></label></th>
					<td><input class="regular-text code" id="rankpublish_site_id" name="site_id" type="text" required value="<?php echo esc_attr( isset( $connection['site_id'] ) ? (string) $connection['site_id'] : '' ); ?>" /></td>
				</tr>
				<tr>
					<th scope="row"><label for="rankpublish_token"><?php esc_html_e( 'One-time token', 'rankpublish-bridge' ); ?></label></th>
					<td><input class="regular-text code" id="rankpublish_token" name="token" type="password" required autocomplete="off" /></td>
				</tr>
			</table>
			<?php submit_button( __( 'Verify and connect', 'rankpublish-bridge' ) ); ?>
		</form>
		<?php if ( ! empty( $connection['connected_at'] ) ) : ?>
			<p><strong><?php esc_html_e( 'Connected:', 'rankpublish-bridge' ); ?></strong> <?php echo esc_html( (string) $connection['connected_at'] ); ?></p>
		<?php endif; ?>
	</div>
	<?php
}

function rankpublish_bridge_connect(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have permission to connect this site.', 'rankpublish-bridge' ) );
	}
	check_admin_referer( 'rankpublish_bridge_connect' );

	$endpoint = esc_url_raw( trim( (string) ( $_POST['endpoint'] ?? '' ) ) );
	$site_id  = sanitize_text_field( wp_unslash( (string) ( $_POST['site_id'] ?? '' ) ) );
	$token    = sanitize_text_field( wp_unslash( (string) ( $_POST['token'] ?? '' ) ) );

	$redirect = admin_url( 'options-general.php?page=rankpublish-bridge' );

	if ( '' === $endpoint || '' === $site_id || '' === $token ) {
		wp_safe_redirect( add_query_arg( 'rankpublish_notice', 'failed', $redirect ) );
		exit;
	}

	$response = wp_remote_post(
		$endpoint,
		array(
			'timeout'   => 20,
			'sslverify' => true,
			'headers'   => array(
				'Content-Type' => 'application/json',
				'Accept'       => 'application/json',
			),
			'body'      => wp_json_encode(
				array(
					'siteId'           => $site_id,
					'token'            => $token,
					'siteUrl'          => home_url( '/' ),
					'wordpressVersion' => get_bloginfo( 'version' ),
				)
			),
		)
	);

	$body = is_wp_error( $response ) ? array() : json_decode( (string) wp_remote_retrieve_body( $response ), true );
	if (
		is_wp_error( $response )
		|| 201 !== (int) wp_remote_retrieve_response_code( $response )
		|| empty( $body['ok'] )
		|| empty( $body['bridgeSecret'] )
	) {
		wp_safe_redirect( add_query_arg( 'rankpublish_notice', 'failed', $redirect ) );
		exit;
	}

	update_option(
		RANKPUBLISH_BRIDGE_OPTION,
		array(
			'endpoint'      => $endpoint,
			'site_id'       => $site_id,
			'bridge_secret' => sanitize_text_field( (string) $body['bridgeSecret'] ),
			'connected_at'  => current_time( 'mysql', true ),
		),
		false
	);

	wp_safe_redirect( add_query_arg( 'rankpublish_notice', 'connected', $redirect ) );
	exit;
}

function rankpublish_bridge_register_rest(): void {
	register_rest_route(
		'rankpublish-bridge/v1',
		'/health',
		array(
			'methods'             => 'GET',
			'permission_callback' => static function (): bool {
				return current_user_can( 'manage_options' );
			},
			'callback'            => static function (): WP_REST_Response {
				$connection = rankpublish_bridge_get_connection();
				return rest_ensure_response(
					array(
						'connected'        => ! empty( $connection['bridge_secret'] ),
						'wordpressVersion' => get_bloginfo( 'version' ),
						'bridgeVersion'    => RANKPUBLISH_BRIDGE_VERSION,
					)
				);
			},
		)
	);
}

add_action(
	'admin_menu',
	static function (): void {
		add_options_page(
			__( 'RankPublish Bridge', 'rankpublish-bridge' ),
			__( 'RankPublish Bridge', 'rankpublish-bridge' ),
			'manage_options',
			'rankpublish-bridge',
			'rankpublish_bridge_render_settings'
		);
	}
);
add_action( 'admin_post_rankpublish_bridge_connect', 'rankpublish_bridge_connect' );
add_action( 'rest_api_init', 'rankpublish_bridge_register_rest' );
