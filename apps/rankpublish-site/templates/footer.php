<?php
/**
 * Marketing footer.
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
</main>
<footer class="site-footer">
	<div class="wrap foot-grid">
		<div>
			<h4 class="foot-brand">
				<span class="os-mark" aria-hidden="true">R</span>
				<span>
					<span class="os-name"><?php echo esc_html( rpsite_t( 'brand' ) ); ?></span>
					<span class="os-sub"><?php echo esc_html( rpsite_t( 'os_sub' ) ); ?></span>
				</span>
			</h4>
			<p><?php echo esc_html( rpsite_t( 'tagline' ) ); ?></p>
		</div>
		<div>
			<h4><?php echo esc_html( rpsite_t( 'footer_prod' ) ); ?></h4>
			<a href="<?php echo esc_url( home_url( '/features/' ) ); ?>"><?php echo esc_html( rpsite_t( 'nav_features' ) ); ?></a>
			<a href="<?php echo esc_url( home_url( '/social/' ) ); ?>"><?php echo esc_html( rpsite_t( 'nav_social' ) ); ?></a>
			<a href="<?php echo esc_url( home_url( '/pricing/' ) ); ?>"><?php echo esc_html( rpsite_t( 'nav_pricing' ) ); ?></a>
			<a href="<?php echo esc_url( home_url( '/download/' ) ); ?>"><?php echo esc_html( rpsite_t( 'nav_plugin' ) ); ?></a>
		</div>
		<div>
			<h4><?php echo esc_html( rpsite_t( 'footer_support' ) ); ?></h4>
			<a href="<?php echo esc_url( home_url( '/guide/' ) ); ?>"><?php echo esc_html( rpsite_t( 'nav_guide' ) ); ?></a>
			<a href="<?php echo esc_url( home_url( '/faq/' ) ); ?>"><?php echo esc_html( rpsite_t( 'nav_faq' ) ); ?></a>
			<a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>"><?php echo esc_html( rpsite_t( 'contact' ) ); ?></a>
			<a href="<?php echo esc_url( get_permalink( (int) get_option( 'page_for_posts' ) ) ?: home_url( '/blog/' ) ); ?>"><?php echo esc_html( rpsite_t( 'nav_blog' ) ); ?></a>
		</div>
		<div>
			<h4><?php echo esc_html( rpsite_t( 'footer_legal' ) ); ?></h4>
			<a href="<?php echo esc_url( home_url( '/about/' ) ); ?>"><?php echo esc_html( rpsite_t( 'nav_about' ) ); ?></a>
			<a href="<?php echo esc_url( home_url( '/privacy/' ) ); ?>"><?php echo esc_html( rpsite_t( 'privacy' ) ); ?></a>
			<a href="<?php echo esc_url( home_url( '/terms/' ) ); ?>"><?php echo esc_html( rpsite_t( 'terms' ) ); ?></a>
			<a href="<?php echo esc_url( home_url( '/changelog/' ) ); ?>"><?php echo esc_html( rpsite_t( 'changelog' ) ); ?></a>
		</div>
	</div>
	<div class="wrap legal">
		<span><?php echo esc_html( rpsite_t( 'copy_note' ) ); ?></span>
	</div>
</footer>
<?php wp_footer(); ?>
</body>
</html>
