<?php
/**
 * Inline product illustrations for the marketing homepage.
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Named SVG illustration.
 */
function rpsite_illu( string $name ): string {
	$svgs = array(
		'cal'     => '<svg viewBox="0 0 280 140" fill="none" aria-hidden="true"><rect width="280" height="140" rx="18" fill="#0b1530"/><rect x="16" y="16" width="248" height="108" rx="12" fill="#111b36"/><rect x="28" y="28" width="72" height="10" rx="5" fill="#38bdf8"/><g fill="#1e293b">{cells}</g></svg>',
		'seo'     => '<svg viewBox="0 0 280 140" fill="none" aria-hidden="true"><rect width="280" height="140" rx="18" fill="#12082a"/><circle cx="86" cy="72" r="42" stroke="#7c3aed" stroke-width="10" opacity=".35"/><circle cx="86" cy="72" r="42" stroke="#a78bfa" stroke-width="10" stroke-dasharray="180 80" stroke-linecap="round"/><rect x="148" y="36" width="108" height="12" rx="6" fill="#ede9fe"/><rect x="148" y="58" width="86" height="10" rx="5" fill="#c4b5fd"/><rect x="148" y="78" width="96" height="10" rx="5" fill="#ddd6fe"/><rect x="148" y="98" width="64" height="10" rx="5" fill="#a78bfa"/></svg>',
		'gutenberg' => '<svg viewBox="0 0 120 72" fill="none" aria-hidden="true"><rect width="120" height="72" rx="10" fill="rgba(255,255,255,.18)"/><rect x="12" y="14" width="96" height="8" rx="4" fill="#fff"/><rect x="12" y="30" width="64" height="8" rx="4" fill="rgba(255,255,255,.7)"/><rect x="12" y="46" width="80" height="12" rx="4" fill="rgba(255,255,255,.35)"/></svg>',
		'classic' => '<svg viewBox="0 0 120 72" fill="none" aria-hidden="true"><rect width="120" height="72" rx="10" fill="rgba(255,255,255,.18)"/><rect x="10" y="12" width="100" height="14" rx="3" fill="#fff"/><rect x="10" y="34" width="100" height="26" rx="4" fill="rgba(255,255,255,.4)"/></svg>',
		'elementor' => '<svg viewBox="0 0 120 72" fill="none" aria-hidden="true"><rect width="120" height="72" rx="10" fill="rgba(255,255,255,.18)"/><rect x="10" y="12" width="28" height="48" rx="4" fill="#fff"/><rect x="46" y="12" width="64" height="20" rx="4" fill="rgba(255,255,255,.7)"/><rect x="46" y="38" width="64" height="22" rx="4" fill="rgba(255,255,255,.4)"/></svg>',
		'seo-ui'  => '<svg viewBox="0 0 120 72" fill="none" aria-hidden="true"><rect width="120" height="72" rx="10" fill="rgba(255,255,255,.18)"/><circle cx="36" cy="36" r="18" stroke="#fff" stroke-width="6" opacity=".35"/><circle cx="36" cy="36" r="18" stroke="#fff" stroke-width="6" stroke-dasharray="70 40"/><rect x="64" y="22" width="42" height="8" rx="4" fill="#fff"/><rect x="64" y="36" width="32" height="8" rx="4" fill="rgba(255,255,255,.7)"/></svg>',
		'ai'      => '<svg viewBox="0 0 120 72" fill="none" aria-hidden="true"><rect width="120" height="72" rx="10" fill="rgba(255,255,255,.18)"/><path d="M36 18l6 14 14 6-14 6-6 14-6-14-14-6 14-6z" fill="#fff"/><rect x="68" y="28" width="38" height="8" rx="4" fill="rgba(255,255,255,.8)"/><rect x="68" y="42" width="28" height="8" rx="4" fill="rgba(255,255,255,.5)"/></svg>',
		'schema'  => '<svg viewBox="0 0 120 72" fill="none" aria-hidden="true"><rect width="120" height="72" rx="10" fill="rgba(255,255,255,.18)"/><rect x="18" y="16" width="28" height="16" rx="3" fill="#fff"/><rect x="74" y="16" width="28" height="16" rx="3" fill="#fff"/><rect x="46" y="42" width="28" height="16" rx="3" fill="rgba(255,255,255,.7)"/><path d="M32 32v8h16M88 32v8H72" stroke="#fff" stroke-width="2"/></svg>',
		'rank'    => '<svg viewBox="0 0 120 72" fill="none" aria-hidden="true"><rect width="120" height="72" rx="10" fill="rgba(255,255,255,.18)"/><path d="M16 52l18-16 16 10 28-26 10 8" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"/><circle cx="88" cy="20" r="5" fill="#fff"/></svg>',
		'redirect'=> '<svg viewBox="0 0 120 72" fill="none" aria-hidden="true"><rect width="120" height="72" rx="10" fill="rgba(255,255,255,.18)"/><path d="M24 28h48l12-10M24 48h48l12 10" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"/></svg>',
		'widget'  => '<svg viewBox="0 0 120 72" fill="none" aria-hidden="true"><rect width="120" height="72" rx="10" fill="rgba(255,255,255,.18)"/><rect x="14" y="14" width="92" height="18" rx="4" fill="#fff"/><rect x="14" y="40" width="42" height="18" rx="4" fill="rgba(255,255,255,.55)"/><rect x="64" y="40" width="42" height="18" rx="4" fill="rgba(255,255,255,.35)"/></svg>',
		'trial'   => '<svg viewBox="0 0 120 72" fill="none" aria-hidden="true"><rect width="120" height="72" rx="10" fill="rgba(255,255,255,.18)"/><circle cx="60" cy="36" r="20" stroke="#fff" stroke-width="4"/><path d="M60 24v14l10 6" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>',
	);

	if ( 'cal' === $name ) {
		$cells = '';
		for ( $r = 0; $r < 4; $r++ ) {
			for ( $c = 0; $c < 7; $c++ ) {
				$x    = 28 + ( $c * 34 );
				$y    = 48 + ( $r * 18 );
				$on   = ( 1 === $r && $c < 4 ) || ( 2 === $r && in_array( $c, array( 1, 3, 5 ), true ) );
				$fill = $on ? '#38bdf8' : '#1e293b';
				$cells .= '<rect x="' . $x . '" y="' . $y . '" width="22" height="12" rx="3" fill="' . $fill . '"/>';
			}
		}
		return str_replace( '{cells}', $cells, $svgs['cal'] );
	}

	return $svgs[ $name ] ?? '';
}
