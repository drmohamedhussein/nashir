<?php
declare(strict_types=1);


get_header();
?>
<div class="wrap prose">
	<?php
	if ( have_posts() ) {
		while ( have_posts() ) {
			the_post();
			the_title( '<h1>', '</h1>' );
			the_content();
		}
	}
	?>
</div>
<?php
get_footer();
