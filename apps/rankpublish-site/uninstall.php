<?php
/**
 * Uninstall RankPublish Site.
 *
 * Leaves WordPress pages in place. Only removes plugin options.
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_option( 'rankpublish_cloud_url' );
