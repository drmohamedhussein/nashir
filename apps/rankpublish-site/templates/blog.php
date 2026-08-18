<?php
/**
 * Blog index.
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require RPSITE_PATH . 'templates/header.php';
?>
<div class="page-hero">
	<div class="wrap">
		<p class="kicker"><?php echo esc_html( rpsite_t( 'res_h' ) ); ?></p>
		<h1><?php echo esc_html( rpsite_t( 'nav_blog' ) ); ?></h1>
	</div>
</div>
<section class="wrap section">
	<div class="grid-2">
		<?php
		if ( have_posts() ) {
			while ( have_posts() ) {
				the_post();
				echo '<article class="post-card"><time>' . esc_html( get_the_date() ) . '</time><h3><a href="' . esc_url( get_permalink() ) . '">' . esc_html( get_the_title() ) . '</a></h3><p class="muted">' . esc_html( wp_trim_words( (string) get_the_excerpt(), 28 ) ) . '</p></article>';
			}
		}
		?>
	</div>
</section>
<?php
require RPSITE_PATH . 'templates/footer.php';
