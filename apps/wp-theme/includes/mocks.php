<?php
/**
 * Interface mockups for the marketing homepage.
 *
 * @package PublisherWP
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function nashir_mock_calendar(): void {
	$days = 'en' === nashir_locale() ? array( 'S', 'S', 'M', 'T', 'W', 'T', 'F' ) : array( 'س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج' );
	echo '<div class="dash"><div class="dash-bar"><i></i><i></i><i></i></div><div class="cal-ui">';
	foreach ( $days as $day ) {
		echo '<span>' . esc_html( $day ) . '</span>';
	}
	for ( $d = 1; $d <= 28; $d++ ) {
		$on = in_array( $d, array( 8, 15, 22 ), true );
		echo '<div class="' . ( $on ? 'on' : '' ) . '">' . esc_html( (string) $d );
		if ( 8 === $d ) {
			echo '<div class="chip chip-a">publish</div>';
		} elseif ( 15 === $d ) {
			echo '<div class="chip chip-b">future</div>';
		} elseif ( 22 === $d ) {
			echo '<div class="chip chip-c">draft</div>';
		}
		echo '</div>';
	}
	echo '</div></div>';
}

function nashir_mock_schedule(): void {
	$rows = array(
		array( '08:00', 'publish' ),
		array( '11:30', 'future' ),
		array( '16:00', 'draft' ),
		array( '19:15', 'social' ),
	);
	echo '<div class="mock-scene mock-scene-schedule"><div class="mock"><div class="mock-head">' . esc_html( nashir_t( 'f2t' ) ) . '<span class="pill">auto</span></div>';
	foreach ( $rows as $row ) {
		echo '<div class="mock-row"><span>' . esc_html( $row[0] ) . '</span><span class="pill">' . esc_html( $row[1] ) . '</span></div>';
	}
	echo '</div></div>';
}

function nashir_mock_social(): void {
	echo '<div class="mock-scene mock-scene-social"><div class="mock"><div class="mock-head">' . esc_html( nashir_t( 'nav_social' ) ) . '</div><div class="social-tiles">';
	foreach ( nashir_platforms() as $platform ) {
		echo '<b>' . esc_html( $platform['name'] ) . '</b>';
	}
	echo '</div></div></div>';
}

function nashir_mock_bars(): void {
	echo '<div class="mock-scene mock-scene-bars"><div class="mock"><div class="mock-head">' . esc_html( nashir_t( 'f4t' ) ) . '</div><div class="bars">';
	foreach ( array( '82%', '64%', '91%', '48%' ) as $w ) {
		echo '<div class="bar"><span style="width:' . esc_attr( $w ) . '"></span></div>';
	}
	echo '</div></div></div>';
}

function nashir_mock_templates(): void {
	echo '<div class="mock-scene mock-scene-templates"><div class="mock"><div class="mock-head">{title} · {url}</div>';
	echo '<div class="mock-row"><span>Facebook</span><span class="pill">{excerpt}</span></div>';
	echo '<div class="mock-row"><span>X</span><span class="pill">{title}</span></div>';
	echo '<div class="mock-row"><span>LinkedIn</span><span class="pill">{excerpt}</span></div>';
	echo '</div></div>';
}

function nashir_mock_editors(): void {
	echo '<div class="mock-scene mock-scene-editors"><div class="mock"><div class="mock-head">' . esc_html( nashir_t( 'f6t' ) ) . '</div>';
	echo '<div class="mock-row"><span>Gutenberg</span><span class="pill">ok</span></div>';
	echo '<div class="mock-row"><span>Classic</span><span class="pill">ok</span></div>';
	echo '<div class="mock-row"><span>Elementor</span><span class="pill">ok</span></div>';
	echo '</div></div>';
}

function nashir_render_mock( string $name ): void {
	$map = array(
		'calendar' => 'hero.jpg',
		'schedule' => 'schedule.jpg',
		'social'   => 'social.jpg',
	);
	$file = $map[ $name ] ?? '';
	$src  = $file ? nashir_art( $file ) : '';
	if ( $src ) {
		echo '<div class="art-3d"><img src="' . esc_url( $src ) . '" alt=""></div>';
		return;
	}
	switch ( $name ) {
		case 'calendar':
			nashir_mock_calendar();
			break;
		case 'schedule':
			nashir_mock_schedule();
			break;
		case 'social':
			nashir_mock_social();
			break;
		case 'bars':
			nashir_mock_bars();
			break;
		case 'templates':
			nashir_mock_templates();
			break;
		case 'editors':
			nashir_mock_editors();
			break;
	}
}
