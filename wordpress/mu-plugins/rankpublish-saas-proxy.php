<?php
/**
 * Forwards SaaS routes to the local Next.js process (PM2 on 127.0.0.1:3001).
 * Used when OpenLiteSpeed cannot apply [P] proxy rules from .htaccess.
 *
 * @package RankPublish
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( defined( 'RANKPUBLISH_SAAS_PROXY_LOADED' ) ) {
	return;
}
define( 'RANKPUBLISH_SAAS_PROXY_LOADED', true );

/**
 * @return list<string>
 */
function rankpublish_saas_proxy_prefixes(): array {
	return array( 'app', 'api', 'login', 'register', 'privacy', 'terms', '_next', 'sitemap.xml' );
}

function rankpublish_saas_proxy_should_forward(): bool {
	if ( PHP_SAPI === 'cli' ) {
		return false;
	}

	$path = wp_parse_url( $_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH );
	if ( ! is_string( $path ) || $path === '' ) {
		return false;
	}

	$path = '/' . ltrim( $path, '/' );

	if ( str_starts_with( $path, '/wp-' ) || str_starts_with( $path, '/wp-content/' ) ) {
		return false;
	}

	foreach ( rankpublish_saas_proxy_prefixes() as $prefix ) {
		if ( $path === '/' . $prefix || str_starts_with( $path, '/' . $prefix . '/' ) ) {
			return true;
		}
	}

	return false;
}

function rankpublish_saas_proxy_backend_port(): string {
	$port = (string) get_option( 'rankpublish_saas_port', '3001' );
	return preg_match( '/^\d{2,5}$/', $port ) ? $port : '3001';
}

function rankpublish_saas_proxy_forward(): void {
	if ( ! rankpublish_saas_proxy_should_forward() ) {
		return;
	}

	if ( ! function_exists( 'curl_init' ) ) {
		status_header( 503 );
		header( 'Content-Type: text/plain; charset=utf-8' );
		echo 'RankPublish SaaS proxy requires PHP cURL.';
		exit;
	}

	$port     = rankpublish_saas_proxy_backend_port();
	$target   = 'http://127.0.0.1:' . $port . ( $_SERVER['REQUEST_URI'] ?? '/' );
	$method   = strtoupper( $_SERVER['REQUEST_METHOD'] ?? 'GET' );
	$headers  = array();
	$skip     = array( 'host', 'connection', 'content-length', 'accept-encoding' );

	if ( function_exists( 'getallheaders' ) ) {
		$incoming = getallheaders();
		if ( is_array( $incoming ) ) {
			foreach ( $incoming as $name => $value ) {
				$key = strtolower( (string) $name );
				if ( in_array( $key, $skip, true ) ) {
					continue;
				}
				$headers[] = $name . ': ' . $value;
			}
		}
	}

	$public_host = wp_parse_url( (string) get_option( 'rankpublish_cloud_url', home_url() ), PHP_URL_HOST );
	if ( is_string( $public_host ) && $public_host !== '' ) {
		$headers[] = 'Host: ' . $public_host;
		$headers[] = 'X-Forwarded-Host: ' . $public_host;
	}
	$headers[] = 'X-Forwarded-Proto: ' . ( is_ssl() ? 'https' : 'http' );
	$headers[] = 'X-Forwarded-For: ' . ( $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1' );

	$body = file_get_contents( 'php://input' );
	$ch   = curl_init( $target );
	if ( false === $ch ) {
		status_header( 502 );
		exit;
	}

	curl_setopt_array(
		$ch,
		array(
			CURLOPT_CUSTOMREQUEST  => $method,
			CURLOPT_HTTPHEADER     => $headers,
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_HEADER         => true,
			CURLOPT_FOLLOWLOCATION => false,
			CURLOPT_TIMEOUT        => 120,
			CURLOPT_POSTFIELDS     => in_array( $method, array( 'POST', 'PUT', 'PATCH', 'DELETE' ), true ) ? $body : null,
		)
	);

	$response = curl_exec( $ch );
	if ( false === $response ) {
		status_header( 502 );
		header( 'Content-Type: text/plain; charset=utf-8' );
		echo 'RankPublish SaaS backend unreachable on port ' . esc_html( $port ) . '.';
		curl_close( $ch );
		exit;
	}

	$status = (int) curl_getinfo( $ch, CURLINFO_HTTP_CODE );
	$header_size = (int) curl_getinfo( $ch, CURLINFO_HEADER_SIZE );
	curl_close( $ch );

	$raw_headers = substr( $response, 0, $header_size );
	$payload     = substr( $response, $header_size );

	status_header( $status > 0 ? $status : 502 );

	foreach ( preg_split( "/\r\n|\n|\r/", $raw_headers ) as $line ) {
		if ( $line === '' || str_starts_with( $line, 'HTTP/' ) ) {
			continue;
		}
		$lower = strtolower( $line );
		if ( str_starts_with( $lower, 'transfer-encoding:' ) || str_starts_with( $lower, 'connection:' ) ) {
			continue;
		}
		header( $line, str_starts_with( $lower, 'set-cookie:' ) ? false : true );
	}

	echo $payload; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- proxied SaaS response.
	exit;
}

add_action( 'muplugins_loaded', 'rankpublish_saas_proxy_forward', 0 );
