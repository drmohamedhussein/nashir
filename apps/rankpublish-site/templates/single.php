<?php
/**
 * Single post.
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require RPSITE_PATH . 'templates/header.php';
while ( have_posts() ) {
	the_post();
	?>
<div class="page-hero">
	<div class="wrap">
		<time class="muted"><?php echo esc_html( get_the_date() ); ?></time>
		<h1><?php the_title(); ?></h1>
	</div>
</div>
<article class="wrap prose">
	<div class="card">
		<?php the_content(); ?>
	</div>
</article>
	<?php
}
require RPSITE_PATH . 'templates/footer.php';
