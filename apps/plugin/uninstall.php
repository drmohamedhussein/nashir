<?php
/**
 * Remove stored connection secrets on uninstall.
 *
 * @package PublisherWP
 */

declare(strict_types=1);

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

$options = array(
	'nashir_app_url',
	'nashir_site_id',
	'nashir_api_key',
	'nashir_signing_secret',
	'nashir_plan',
	'nashir_scheduler_mode',
	'nashir_auto_interval',
	'nashir_allowed_types',
	'nashir_week_slots',
	'nashir_social_templates',
);

foreach ( $options as $option ) {
	delete_option( $option );
}
