<?php
declare(strict_types=1);


get_header();
?>
<div class="page-hero">
	<div class="wrap">
		<p class="kicker"><?php echo esc_html( nashir_t( 'res_h' ) ); ?></p>
		<h1><?php echo esc_html( nashir_t( 'nav_blog' ) ); ?></h1>
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
get_footer();
