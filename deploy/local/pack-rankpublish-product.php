<?php
/**
 * Pack the full RankPublish customer plugin as a Windows PKZIP.
 *
 * Uses PHP ZipArchive (same extractor WordPress uses) with forward-slash
 * entry names so the zip installs on Windows and Linux WordPress.
 *
 * Usage:
 *   php pack-rankpublish-product.php <plugin-dir> <out.zip>
 */

declare(strict_types=1);

if ( $argc < 3 ) {
	fwrite( STDERR, "Usage: php pack-rankpublish-product.php <plugin-dir> <out.zip>\n" );
	exit( 1 );
}

$src_raw  = rtrim( $argv[1], "/\\" );
$src_norm = str_replace( '\\', '/', $src_raw );
$dest     = str_replace( '\\', '/', $argv[2] );

if ( ! is_file( $src_norm . '/rankpublish.php' ) ) {
	fwrite( STDERR, "Missing rankpublish.php in {$src_norm}\n" );
	exit( 1 );
}
if ( ! is_dir( $src_norm . '/modules' ) ) {
	fwrite( STDERR, "Refusing stub plugin (no modules/) at {$src_norm}\n" );
	exit( 1 );
}

$dir = dirname( $dest );
if ( ! is_dir( $dir ) && ! mkdir( $dir, 0777, true ) && ! is_dir( $dir ) ) {
	fwrite( STDERR, "Cannot create {$dir}\n" );
	exit( 1 );
}
if ( is_file( $dest ) ) {
	unlink( $dest );
}

$zip = new ZipArchive();
if ( true !== $zip->open( $dest, ZipArchive::CREATE | ZipArchive::OVERWRITE ) ) {
	fwrite( STDERR, "Cannot create {$dest}\n" );
	exit( 1 );
}

$added    = 0;
$prefix   = strlen( $src_norm ) + 1;
$iterator = new RecursiveIteratorIterator(
	new RecursiveDirectoryIterator( $src_raw, FilesystemIterator::SKIP_DOTS )
);

foreach ( $iterator as $file ) {
	if ( ! $file->isFile() ) {
		continue;
	}
	$full = str_replace( '\\', '/', $file->getPathname() );
	if ( str_contains( $full, '/node_modules/' ) || str_contains( $full, '/.git/' ) ) {
		continue;
	}
	$name = $file->getFilename();
	if ( '.DS_Store' === $name || 'Thumbs.db' === $name ) {
		continue;
	}

	$rel = substr( $full, $prefix );
	$zip->addFile( $file->getPathname(), 'rankpublish/' . $rel );
	++$added;
}

$zip->close();

$size = filesize( $dest );
if ( false === $size || $size < 6 * 1024 * 1024 ) {
	fwrite( STDERR, "Packed zip is too small ({$size} bytes). Expected full plugin.\n" );
	exit( 1 );
}

$check = new ZipArchive();
$check->open( $dest );
$plugin_ok = false !== $check->locateName( 'rankpublish/rankpublish.php' );
$css_ok    = false !== $check->locateName( 'rankpublish/assets/cloud-connect.css' );
$slash_ok  = true;
for ( $i = 0; $i < $check->numFiles; $i++ ) {
	if ( str_contains( (string) $check->getNameIndex( $i ), '\\' ) ) {
		$slash_ok = false;
		break;
	}
}
$entries = $check->numFiles;
$check->close();

if ( ! $plugin_ok || ! $css_ok || ! $slash_ok ) {
	fwrite( STDERR, "Zip failed WordPress layout checks (plugin/css/slashes).\n" );
	exit( 1 );
}

printf( "Packed %s (%.1f MB, %d files, %d zip entries)\n", $dest, $size / 1048576, $added, $entries );
