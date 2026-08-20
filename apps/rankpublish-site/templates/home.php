<?php
/**
 * Marketing homepage — Publishing OS chrome on WordPress Site Core.
 *
 * @package RankPublishSite
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require RPSITE_PATH . 'templates/header.php';
$cloud = rpsite_cloud_url();
$start = $cloud ? $cloud . '/register' : rpsite_plugin_zip_url();
$mkt   = RankPublish_Site_Marketing::get();
$tools = array(
	array( 'g1', 'gutenberg' ),
	array( 'g2', 'classic' ),
	array( 'g3', 'elementor' ),
	array( 'g4', 'seo-ui' ),
	array( 'g5', 'ai' ),
	array( 'g6', 'schema' ),
	array( 'g7', 'rank' ),
	array( 'g8', 'redirect' ),
	array( 'g9', 'widget' ),
	array( 'g10', 'trial' ),
);
$tones = array( 't1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10' );
?>
<section class="os-hero">
	<div class="wrap os-hero-copy">
		<p class="os-pill rp-rise-in"><?php echo esc_html( rpsite_t( 'os_pill' ) ); ?></p>
		<h1 class="rp-rise-in rp-rise-delay"><?php echo esc_html( rpsite_t( 'hero' ) ); ?> <em><?php echo esc_html( rpsite_t( 'hero_accent' ) ); ?></em></h1>
		<p class="os-lead rp-rise-in rp-rise-delay"><?php echo esc_html( rpsite_t( 'hero_body' ) ); ?></p>
		<div class="actions os-actions">
			<a class="btn btn-sky" href="<?php echo esc_url( $start ); ?>"><?php echo esc_html( rpsite_t( 'cta_workspace' ) ); ?><span class="btn-arrow" aria-hidden="true">↗</span></a>
			<a class="btn btn-ghost-light" href="#workflow"><?php echo esc_html( rpsite_t( 'cta_how' ) ); ?></a>
		</div>
		<div class="os-workspace reveal" aria-hidden="true">
			<div class="os-chrome-bar">
				<span class="dot rose"></span><span class="dot amber"></span><span class="dot green"></span>
				<span class="os-url"><?php echo esc_html( rpsite_t( 'workspace_url' ) ); ?></span>
				<span class="os-ok"><?php echo esc_html( rpsite_t( 'systems_ok' ) ); ?></span>
			</div>
			<div class="os-dash">
				<aside class="os-rail">
					<span class="os-rail-mark">R</span>
					<span></span><span></span><span class="on"></span><span></span><span></span>
				</aside>
				<div class="os-dash-main">
					<p class="os-kicker"><?php echo esc_html( rpsite_t( 'mock_pub_k' ) ); ?></p>
					<p class="os-panel-title"><?php echo esc_html( rpsite_t( 'mock_pub_t' ) ); ?></p>
					<div class="os-metrics">
						<div><strong>12</strong><span><?php echo esc_html( rpsite_t( 'scheduled' ) ); ?></span></div>
						<div><strong>03</strong><span><?php echo esc_html( rpsite_t( 'in_queue' ) ); ?></span></div>
						<div><strong>100%</strong><span><?php echo esc_html( rpsite_t( 'synced' ) ); ?></span></div>
						<div><strong>8</strong><span><?php echo esc_html( rpsite_t( 'stat3n' ) ); ?></span></div>
					</div>
					<div class="os-chart" aria-hidden="true">
						<svg viewBox="0 0 360 88" preserveAspectRatio="none">
							<defs>
								<linearGradient id="rpChart" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stop-color="#38bdf8" stop-opacity="0.45"/>
									<stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
								</linearGradient>
							</defs>
							<path d="M0 70 C40 62 70 48 110 52 C150 56 170 28 210 24 C250 20 280 36 320 18 L360 12 V88 H0 Z" fill="url(#rpChart)"/>
							<path d="M0 70 C40 62 70 48 110 52 C150 56 170 28 210 24 C250 20 280 36 320 18 L360 12" fill="none" stroke="#7dd3fc" stroke-width="3"/>
						</svg>
					</div>
				</div>
				<div class="os-dash-side">
					<div class="os-panel light">
						<p class="os-kicker violet"><?php echo esc_html( rpsite_t( 'mock_seo_k' ) ); ?></p>
						<p class="os-panel-title ink"><?php echo esc_html( rpsite_t( 'mock_seo_t' ) ); ?></p>
						<div class="os-score"><span style="width:78%"></span></div>
						<p class="muted"><?php echo esc_html( rpsite_t( 'mock_seo_b' ) ); ?></p>
					</div>
					<div class="os-panel mint">
						<p class="os-kicker" style="color:#0f766e"><?php echo esc_html( rpsite_t( 'mock_health_k' ) ); ?></p>
						<p class="os-panel-title ink"><?php echo esc_html( rpsite_t( 'mock_control_t' ) ); ?></p>
						<p class="muted"><?php echo esc_html( rpsite_t( 'mock_control_b' ) ); ?></p>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<section class="section" id="products">
	<div class="wrap os-products">
		<div class="os-products-copy reveal">
			<p class="kicker"><?php echo esc_html( rpsite_t( 'products_k' ) ); ?></p>
			<h2><?php echo esc_html( rpsite_t( 'products_h' ) ); ?></h2>
			<p class="lead"><?php echo esc_html( rpsite_t( 'products_b' ) ); ?></p>
		</div>
		<div class="os-product-grid<?php echo ! empty( $mkt['show_cloud_card'] ) ? ' os-product-grid--3' : ''; ?>">
			<article class="os-product sky reveal">
				<div class="os-product-art"><?php echo rpsite_illu( 'cal' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></div>
				<p class="os-kicker"><?php echo esc_html( rpsite_t( 'prod_cal_k' ) ); ?></p>
				<h3><?php echo esc_html( rpsite_t( 'prod_cal_t' ) ); ?></h3>
				<p><?php echo esc_html( rpsite_t( 'prod_cal_b' ) ); ?></p>
				<ul>
					<li><?php echo esc_html( rpsite_t( 'prod_cal_1' ) ); ?></li>
					<li><?php echo esc_html( rpsite_t( 'prod_cal_2' ) ); ?></li>
					<li><?php echo esc_html( rpsite_t( 'prod_cal_3' ) ); ?></li>
				</ul>
				<a class="os-product-link" href="<?php echo esc_url( home_url( '/calendar/' ) ); ?>"><?php echo esc_html( rpsite_t( 'f1k' ) ); ?> →</a>
			</article>
			<article class="os-product violet reveal">
				<div class="os-product-art"><?php echo rpsite_illu( 'seo' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></div>
				<p class="os-kicker"><?php echo esc_html( rpsite_t( 'prod_seo_k' ) ); ?></p>
				<h3><?php echo esc_html( rpsite_t( 'prod_seo_t' ) ); ?></h3>
				<p><?php echo esc_html( rpsite_t( 'prod_seo_b' ) ); ?></p>
				<ul>
					<li><?php echo esc_html( rpsite_t( 'prod_seo_1' ) ); ?></li>
					<li><?php echo esc_html( rpsite_t( 'prod_seo_2' ) ); ?></li>
					<li><?php echo esc_html( rpsite_t( 'prod_seo_3' ) ); ?></li>
				</ul>
				<a class="os-product-link" href="<?php echo esc_url( home_url( '/features/' ) ); ?>"><?php echo esc_html( rpsite_t( 'nav_features' ) ); ?> →</a>
			</article>
			<?php if ( ! empty( $mkt['show_cloud_card'] ) ) : ?>
			<article class="os-product mint reveal">
				<div class="os-product-art"><?php echo rpsite_illu( 'trial' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></div>
				<p class="os-kicker"><?php echo esc_html( rpsite_t( 'prod_cloud_k' ) ); ?></p>
				<h3><?php echo esc_html( rpsite_t( 'prod_cloud_t' ) ); ?></h3>
				<p><?php echo esc_html( rpsite_t( 'prod_cloud_b' ) ); ?></p>
				<ul>
					<li><?php echo esc_html( rpsite_t( 'prod_cloud_1' ) ); ?></li>
					<li><?php echo esc_html( rpsite_t( 'prod_cloud_2' ) ); ?></li>
					<li><?php echo esc_html( rpsite_t( 'prod_cloud_3' ) ); ?></li>
				</ul>
				<a class="os-product-link" href="<?php echo esc_url( $start ); ?>"><?php echo esc_html( rpsite_t( 'cta_workspace' ) ); ?> →</a>
			</article>
			<?php endif; ?>
		</div>
	</div>
</section>

<section class="section section-alt" id="workflow">
	<div class="wrap" style="text-align:center">
		<p class="kicker"><?php echo esc_html( rpsite_t( 'how_os_k' ) ); ?></p>
		<h2><?php echo esc_html( rpsite_t( 'how_os_h' ) ); ?></h2>
		<div class="os-steps">
			<?php foreach ( array( '1', '2', '3' ) as $n ) : ?>
			<article class="reveal">
				<span class="os-step-num">0<?php echo esc_html( $n ); ?></span>
				<h3><?php echo esc_html( rpsite_t( 'how' . $n . 't' ) ); ?></h3>
				<p class="muted"><?php echo esc_html( rpsite_t( 'how' . $n . 'b' ) ); ?></p>
			</article>
			<?php endforeach; ?>
		</div>
	</div>
</section>

<section class="section" id="plans">
	<div class="wrap">
		<div class="os-plans-head">
			<div>
				<p class="kicker"><?php echo esc_html( rpsite_t( 'price_k' ) ); ?></p>
				<h2><?php echo esc_html( rpsite_t( 'price_h' ) ); ?></h2>
			</div>
			<p class="muted"><?php echo esc_html( rpsite_t( 'trial' ) ); ?></p>
		</div>
		<div class="os-plans">
			<article class="reveal">
				<h3><?php echo esc_html( rpsite_t( 'monthly' ) ); ?></h3>
				<div class="price"><?php echo esc_html( rpsite_t( 'mprice' ) ); ?></div>
				<p class="muted"><?php echo esc_html( rpsite_t( 'per_site' ) ); ?></p>
				<ul class="checks">
					<?php foreach ( array( 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8' ) as $item ) : ?>
						<li><?php echo esc_html( rpsite_t( $item ) ); ?></li>
					<?php endforeach; ?>
				</ul>
				<a class="btn btn-ink" href="<?php echo esc_url( $start ); ?>"><?php echo esc_html( rpsite_t( 'choose_plan' ) ); ?></a>
			</article>
			<article class="reveal featured">
				<span class="badge"><?php echo esc_html( rpsite_t( 'popular' ) ); ?></span>
				<h3><?php echo esc_html( rpsite_t( 'yearly' ) ); ?></h3>
				<div class="price"><?php echo esc_html( rpsite_t( 'yprice' ) ); ?></div>
				<p class="muted"><?php echo esc_html( rpsite_t( 'per_site' ) ); ?> · <?php echo esc_html( rpsite_t( 'save_badge' ) ); ?></p>
				<ul class="checks">
					<?php foreach ( array( 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8' ) as $item ) : ?>
						<li><?php echo esc_html( rpsite_t( $item ) ); ?></li>
					<?php endforeach; ?>
				</ul>
				<a class="btn btn-sky" href="<?php echo esc_url( $start ); ?>"><?php echo esc_html( rpsite_t( 'choose_plan' ) ); ?></a>
			</article>
		</div>
	</div>
</section>

<?php if ( ! empty( $mkt['show_tools'] ) ) : ?>
<section class="section section-alt" id="tools">
	<div class="wrap">
		<p class="kicker"><?php echo esc_html( rpsite_t( 'tools_k' ) ); ?></p>
		<h2><?php echo esc_html( rpsite_t( 'tools_h' ) ); ?></h2>
		<div class="tool-grid" style="margin-top:28px">
			<?php foreach ( $tools as $index => $tool ) : ?>
			<article class="tool-card reveal">
				<div class="tool-banner <?php echo esc_attr( $tones[ $index ] ); ?>" aria-hidden="true">
					<?php echo rpsite_illu( $tool[1] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				</div>
				<div class="tool-body">
					<h3><?php echo esc_html( rpsite_t( $tool[0] . 't' ) ); ?></h3>
					<p class="muted"><?php echo esc_html( rpsite_t( $tool[0] . 'b' ) ); ?></p>
				</div>
			</article>
			<?php endforeach; ?>
		</div>
	</div>
</section>
<?php endif; ?>

<section class="section">
	<div class="wrap">
		<?php if ( ! empty( $mkt['show_audience'] ) ) : ?>
		<p class="kicker"><?php echo esc_html( rpsite_t( 'who_k' ) ); ?></p>
		<h2><?php echo esc_html( rpsite_t( 'who_h' ) ); ?></h2>
		<div class="use-grid" style="margin-top:28px">
			<?php foreach ( array( '1', '2', '3' ) as $n ) : ?>
			<article class="use-card reveal">
				<div class="avatar"><?php echo esc_html( $n ); ?></div>
				<h3><?php echo esc_html( rpsite_t( 'who' . $n . 't' ) ); ?></h3>
				<p class="muted"><?php echo esc_html( rpsite_t( 'who' . $n . 'b' ) ); ?></p>
			</article>
			<?php endforeach; ?>
		</div>
		<?php endif; ?>
		<div class="cta-finale reveal" style="margin-top:56px">
			<h2><?php echo esc_html( rpsite_t( 'bottom_h' ) ); ?></h2>
			<p class="muted"><?php echo esc_html( rpsite_t( 'bottom_b' ) ); ?></p>
			<div class="actions">
				<a class="btn btn-ink" href="<?php echo esc_url( $start ); ?>"><?php echo esc_html( rpsite_t( 'cta_started' ) ); ?><span class="btn-arrow light" aria-hidden="true">↗</span></a>
				<a class="btn btn-ghost" href="<?php echo esc_url( rpsite_plugin_zip_url() ); ?>"><?php echo esc_html( rpsite_t( 'cta_download' ) ); ?></a>
			</div>
		</div>
	</div>
</section>
<?php
require RPSITE_PATH . 'templates/footer.php';
