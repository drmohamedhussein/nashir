<?php
/**
 * Marketing homepage.
 *
 * @package PublisherWP
 */

declare(strict_types=1);

get_header();
$cloud    = nashir_cloud_url();
$start    = $cloud ? $cloud . '/register' : nashir_plugin_zip_url();
$hero_art = nashir_art( 'hero.jpg' );
$char_art = nashir_art( 'character.jpg' );
$features = array(
	array( 'f1', 'calendar' ),
	array( 'f2', 'schedule' ),
	array( 'f3', 'social' ),
	array( 'f4', 'bars' ),
	array( 'f5', 'templates' ),
	array( 'f6', 'editors' ),
);
$tools    = array( 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10' );
?>
<div class="hero-shell">
	<section class="wrap hero">
		<div>
			<p class="kicker"><?php echo esc_html( nashir_t( 'tagline' ) ); ?></p>
			<h1><?php echo esc_html( nashir_t( 'hero' ) ); ?></h1>
			<p class="lead"><?php echo esc_html( nashir_t( 'hero_body' ) ); ?></p>
			<div class="actions">
				<a class="btn btn-gradient" href="<?php echo esc_url( $start ); ?>"><?php echo esc_html( nashir_t( 'cta_free' ) ); ?></a>
				<a class="btn btn-ghost" href="<?php echo esc_url( home_url( '/pricing/' ) ); ?>"><?php echo esc_html( nashir_t( 'cta_pricing' ) ); ?></a>
			</div>
		</div>
		<div class="hero-visual">
			<?php if ( $hero_art ) : ?>
				<div class="art-3d art-cutout">
					<img src="<?php echo esc_url( $hero_art ); ?>" alt="<?php echo esc_attr( nashir_t( 'hero_note' ) ); ?>">
				</div>
			<?php else : ?>
				<?php nashir_mock_calendar(); ?>
			<?php endif; ?>
		</div>
	</section>
	<section class="wrap">
		<div class="stats">
		<?php foreach ( array( '1', '2', '3' ) as $n ) : ?>
			<div class="stat">
				<div class="stat-ico"><?php echo esc_html( $n ); ?></div>
				<div>
					<strong><?php echo esc_html( nashir_t( 'stat' . $n . 'n' ) ); ?></strong>
					<span class="muted"><?php echo esc_html( nashir_t( 'stat' . $n . 'l' ) ); ?></span>
				</div>
			</div>
		<?php endforeach; ?>
	</div>
	</section>
</div>

<section class="section" id="features">
	<div class="wrap">
		<p class="kicker reveal"><?php echo esc_html( nashir_t( 'features_k' ) ); ?></p>
		<h2 class="reveal"><?php echo esc_html( nashir_t( 'features_h' ) ); ?></h2>
		<?php
		$i = 0;
		foreach ( $features as $feat ) :
			$key = $feat[0];
			$mock = $feat[1];
			++$i;
			$text_first = 1 === $i % 2;
			?>
		<div class="feature-row">
			<?php if ( $text_first ) : ?>
			<div class="feature-copy reveal">
				<div class="icon"><?php echo esc_html( (string) $i ); ?></div>
				<p class="kicker"><?php echo esc_html( nashir_t( $key . 'k' ) ); ?></p>
				<h3><?php echo esc_html( nashir_t( $key . 't' ) ); ?></h3>
				<p class="lead"><?php echo esc_html( nashir_t( $key . 'b' ) ); ?></p>
			</div>
			<div class="reveal">
				<?php nashir_render_mock( $mock ); ?>
			</div>
			<?php else : ?>
			<div class="reveal">
				<?php nashir_render_mock( $mock ); ?>
			</div>
			<div class="feature-copy reveal">
				<div class="icon"><?php echo esc_html( (string) $i ); ?></div>
				<p class="kicker"><?php echo esc_html( nashir_t( $key . 'k' ) ); ?></p>
				<h3><?php echo esc_html( nashir_t( $key . 't' ) ); ?></h3>
				<p class="lead"><?php echo esc_html( nashir_t( $key . 'b' ) ); ?></p>
			</div>
			<?php endif; ?>
		</div>
		<?php endforeach; ?>
	</div>
</section>

<section class="section section-alt">
	<div class="wrap">
		<p class="kicker reveal"><?php echo esc_html( nashir_t( 'tools_k' ) ); ?></p>
		<h2 class="reveal"><?php echo esc_html( nashir_t( 'tools_h' ) ); ?></h2>
		<div class="tool-grid" style="margin-top:28px">
			<?php
			$tones = array( 't1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10' );
			foreach ( $tools as $index => $tool ) :
				?>
			<article class="tool-card reveal">
				<div class="tool-banner <?php echo esc_attr( $tones[ $index ] ); ?>" aria-hidden="true">
					<span class="iso-orb"></span>
					<span class="iso-chip"></span>
					<div class="iso-card">
						<span class="iso-bar"></span>
						<div class="iso-grid"><b></b><b></b><b></b><b></b><b></b><b></b></div>
					</div>
				</div>
				<div class="tool-body">
					<h3><?php echo esc_html( nashir_t( $tool . 't' ) ); ?></h3>
					<p class="muted"><?php echo esc_html( nashir_t( $tool . 'b' ) ); ?></p>
				</div>
			</article>
			<?php endforeach; ?>
		</div>
	</div>
</section>

<section class="section" id="pricing">
	<div class="wrap" style="text-align:center">
		<p class="kicker reveal"><?php echo esc_html( nashir_t( 'price_k' ) ); ?></p>
		<h2 class="reveal"><?php echo esc_html( nashir_t( 'price_h' ) ); ?></h2>
		<p class="muted reveal"><?php echo esc_html( nashir_t( 'trial' ) ); ?></p>
		<div class="pricing-row" style="margin-top:32px;text-align:start">
			<article class="price-card reveal">
				<h3><?php echo esc_html( nashir_t( 'monthly' ) ); ?></h3>
				<div class="price"><?php echo esc_html( nashir_t( 'mprice' ) ); ?></div>
				<p class="muted"><?php echo esc_html( nashir_t( 'per_site' ) ); ?></p>
				<ul class="checks">
					<?php foreach ( array( 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8' ) as $item ) : ?>
						<li><?php echo esc_html( nashir_t( $item ) ); ?></li>
					<?php endforeach; ?>
				</ul>
				<a class="btn btn-brand" href="<?php echo esc_url( $start ); ?>"><?php echo esc_html( nashir_t( 'choose_plan' ) ); ?></a>
			</article>
			<article class="price-card featured reveal">
				<span class="badge"><?php echo esc_html( nashir_t( 'popular' ) ); ?></span>
				<h3><?php echo esc_html( nashir_t( 'yearly' ) ); ?></h3>
				<div class="price"><?php echo esc_html( nashir_t( 'yprice' ) ); ?></div>
				<p class="muted"><?php echo esc_html( nashir_t( 'per_site' ) ); ?></p>
				<ul class="checks">
					<?php foreach ( array( 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8' ) as $item ) : ?>
						<li><?php echo esc_html( nashir_t( $item ) ); ?></li>
					<?php endforeach; ?>
				</ul>
				<a class="btn btn-white" href="<?php echo esc_url( $start ); ?>"><?php echo esc_html( nashir_t( 'choose_plan' ) ); ?></a>
			</article>
		</div>
		<p class="kicker" style="margin-top:36px"><?php echo esc_html( nashir_t( 'platforms_h' ) ); ?></p>
		<div class="platform-row">
			<?php foreach ( nashir_platforms() as $platform ) : ?>
				<article class="platform-chip">
					<span class="dot" aria-hidden="true"></span>
					<div>
						<strong><?php echo esc_html( $platform['name'] ); ?></strong>
						<span class="muted"><?php echo esc_html( $platform['copy'] ); ?></span>
					</div>
				</article>
			<?php endforeach; ?>
		</div>
	</div>
</section>

<section class="section section-alt">
	<div class="wrap">
		<div class="trial-banner reveal">
			<div>
				<p class="kicker" style="color:#7cffb2"><?php echo esc_html( nashir_t( 'trial_k' ) ); ?></p>
				<h2><?php echo esc_html( nashir_t( 'trial_h' ) ); ?></h2>
				<p class="muted"><?php echo esc_html( nashir_t( 'trial_b' ) ); ?></p>
				<div class="actions">
					<a class="btn btn-white" href="<?php echo esc_url( $start ); ?>"><?php echo esc_html( nashir_t( 'cta_start' ) ); ?></a>
				</div>
			</div>
			<?php if ( $char_art ) : ?>
				<img class="trial-photo" src="<?php echo esc_url( $char_art ); ?>" alt="">
			<?php else : ?>
				<div class="trial-visual">14</div>
			<?php endif; ?>
		</div>
	</div>
</section>

<section class="section">
	<div class="wrap">
		<p class="kicker reveal"><?php echo esc_html( nashir_t( 'who_k' ) ); ?></p>
		<h2 class="reveal"><?php echo esc_html( nashir_t( 'who_h' ) ); ?></h2>
		<div class="use-grid" style="margin-top:28px">
			<?php foreach ( array( '1', '2', '3' ) as $n ) : ?>
			<article class="use-card reveal">
				<div class="avatar" aria-hidden="true"><?php echo esc_html( $n ); ?></div>
				<h3><?php echo esc_html( nashir_t( 'who' . $n . 't' ) ); ?></h3>
				<p class="muted"><?php echo esc_html( nashir_t( 'who' . $n . 'b' ) ); ?></p>
			</article>
			<?php endforeach; ?>
		</div>
		<p class="kicker" style="text-align:center;margin-top:40px"><?php echo esc_html( nashir_t( 'trust_h' ) ); ?></p>
		<div class="trust-row">
			<span>WordPress</span><span>Gutenberg</span><span>Elementor</span><span>Facebook</span><span>LinkedIn</span>
		</div>
	</div>
</section>

<section class="wrap section">
	<div class="cta-finale reveal">
		<h2><?php echo esc_html( nashir_t( 'bottom_h' ) ); ?></h2>
		<p class="muted"><?php echo esc_html( nashir_t( 'bottom_b' ) ); ?></p>
		<div class="actions">
			<a class="btn btn-ink" href="<?php echo esc_url( $start ); ?>"><?php echo esc_html( nashir_t( 'cta_started' ) ); ?></a>
			<a class="btn btn-ghost" href="<?php echo esc_url( nashir_plugin_zip_url() ); ?>"><?php echo esc_html( nashir_t( 'cta_download' ) ); ?></a>
		</div>
	</div>
</section>
<?php
get_footer();
