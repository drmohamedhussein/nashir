/**
 * RankPublish branding — logos, license chrome, and vendor link rewrite.
 */
(function () {
	'use strict';

	var cfg = window.rankpublishSiteBrand || {};
	var logo = cfg.logoUrl || '';
	var logoFull = cfg.logoFullUrl || logo;
	var name = cfg.name || 'RankPublish';
	var plansUrl = cfg.plansUrl || (cfg.cloudUrl || '') + '/register';
	var guideUrl = cfg.guideUrl || (cfg.cloudUrl || '') + '/guide/';
	var cloudUrl = cfg.cloudUrl || 'https://nashir.satest.top';
	var isModuleWrap = !!cfg.isModuleWrap;
	var PROTECTED_ROOT_SELECTORS = ['.tr-root', 'body', '#wpwrap', '#wpbody-content'];

	var UPSTREAM_RE = /schedulepress|thinkrank|wpdeveloper|wpsp-logo|wp-scheduled/i;
	var VENDOR_HREF = /wpdeveloper\.com|schedulepress\.com|thinkrank\.ai|calendly\.com/i;
	var NAME_MAP = [
		[/WP Scheduled Posts Pro/g, name],
		[/WP Scheduled Posts/g, name],
		[/SchedulePress Pro/g, name],
		[/SchedulePress/g, name],
		[/ThinkRank Pro/g, name],
		[/ThinkRank/g, name],
		[/WPDeveloper/g, name],
	];

	function isAdminTarget() {
		if (isThinkRankSettingsScreen()) {
			return true;
		}
		return (
			document.body.classList.contains('rankpublish-site-branded') ||
			document.body.classList.contains('rpsite-os-module-wrap')
		);
	}

	function isThinkRankSettingsScreen() {
		var href = window.location.href || '';
		return /[?&]page=thinkrank(?:&|$)/.test(href);
	}

	function isLicenseScreen() {
		var href = window.location.href;
		return /page=(thinkrank-license|schedulepress-calendar|schedulepress)(&|$)/.test(href);
	}

	function isUpstreamSvg(svg) {
		if (!svg || svg.tagName !== 'svg') {
			return false;
		}
		var vb = svg.getAttribute('viewBox') || '';
		var inner = svg.innerHTML || '';
		if (/thinkrank-clip|M19\.5 7v5|6c63ff|6C62FF|6648fe|24e2ac|24E2AC|paint0_radial_883/i.test(inner)) {
			return true;
		}
		if (vb === '0 0 512 512' || vb === '0 0 20 20') {
			var header = svg.closest('.wpsp-admin-header, .wpsp-modal--header--left, .tr-root aside, .tr-root nav, a[href*="thinkrank"], a[href*="schedulepress"]');
			if (header) {
				return true;
			}
		}
		return false;
	}

	function injectImg(parent, src, w, h) {
		if (!parent || parent.querySelector('[data-rankpublish-logo="1"]')) {
			return;
		}
		var img = document.createElement('img');
		img.src = src;
		img.alt = name;
		img.width = w || 28;
		img.height = h || 28;
		img.setAttribute('data-rankpublish-logo', '1');
		img.style.width = (w || 28) + 'px';
		img.style.height = (h || 28) + 'px';
		parent.insertBefore(img, parent.firstChild);
	}

	function moduleRoot() {
		return document.querySelector('.rpsite-module-native') || document;
	}

	function isProtectedRoot(el) {
		if (!el || el.nodeType !== 1) {
			return false;
		}
		for (var i = 0; i < PROTECTED_ROOT_SELECTORS.length; i++) {
			if (el.matches(PROTECTED_ROOT_SELECTORS[i])) {
				return true;
			}
		}
		return false;
	}

	function shouldSkipHide(el) {
		if (!el || el.nodeType !== 1) {
			return true;
		}
		if (isProtectedRoot(el)) {
			return true;
		}
		if (el.querySelector && el.querySelector('.tr-root')) {
			return true;
		}
		if (el.childElementCount > 30) {
			return true;
		}
		if (((el.textContent || '').length || 0) > 1500) {
			return true;
		}
		if (
			el.closest('.tr-root') &&
			(el.closest('.tr-root') === el || el.matches('.tr-root, body, #wpwrap, #wpbody-content'))
		) {
			return true;
		}
		return false;
	}

	function hideElement(el) {
		if (shouldSkipHide(el)) {
			return;
		}
		el.style.setProperty('display', 'none', 'important');
	}

	function textOf(el) {
		return ((el && el.textContent) || '').replace(/\s+/g, ' ').trim();
	}

	function findClosestHideable(el) {
		if (!el || el.nodeType !== 1) {
			return null;
		}
		var candidate =
			el.closest(
				'[class*="card"], [class*="Card"], [class*="widget"], [class*="panel"], [class*="license"], [class*="License"], [class*="status"], [class*="badge"], [class*="chip"], section, article, aside, li, a, button'
			) ||
			el.parentElement;
		if (!candidate || shouldSkipHide(candidate)) {
			return null;
		}
		return candidate;
	}

	function hideByTextInScope(scope, selector, pattern) {
		scope.querySelectorAll(selector).forEach(function (el) {
			var text = textOf(el);
			if (!text || !pattern.test(text)) {
				return;
			}
			var target = findClosestHideable(el);
			if (target) {
				hideElement(target);
				return;
			}
			if (el.matches('a, button, span, strong, small')) {
				hideElement(el);
			}
		});
	}

	function hideUpstreamSidebars(root) {
		if (!isModuleWrap) {
			return;
		}
		root.querySelectorAll('.tr-root aside').forEach(function (aside) {
			aside.style.setProperty('display', 'none', 'important');
		});
	}

	function replaceHeaderLogos(root) {
		if (!logo) {
			return;
		}

		root.querySelectorAll('.wpsp-admin-header, .wpsp-modal--header--left').forEach(function (header) {
			header.querySelectorAll('svg, img').forEach(function (el) {
				el.style.setProperty('display', 'none', 'important');
			});
			injectImg(header, logo, 28, 28);
		});

		root.querySelectorAll('.tr-root aside a, .tr-root nav a, .tr-root header a, .tr-root [class*="logo"], .tr-root [class*="Logo"]').forEach(function (link) {
			var svg = link.querySelector('svg');
			var img = link.querySelector('img');
			if (img && UPSTREAM_RE.test(img.getAttribute('src') || '')) {
				img.src = logo;
				img.alt = name;
				return;
			}
			if (svg && (isModuleWrap || isUpstreamSvg(svg))) {
				svg.style.setProperty('display', 'none', 'important');
				injectImg(link, logo, 32, 32);
			}
		});

		root.querySelectorAll('.tr-root h1, .tr-root h2, .tr-root [class*="brand"], .tr-root [class*="logo"], .tr-root [class*="Logo"]').forEach(function (node) {
			if (!UPSTREAM_RE.test(node.textContent || '')) {
				return;
			}
			walkText(node);
		});
	}

	function swapImageSources(root) {
		root.querySelectorAll('img[src]').forEach(function (img) {
			var src = img.getAttribute('src') || '';
			if (UPSTREAM_RE.test(src)) {
				img.src = src.indexOf('full') !== -1 ? logoFull : logo;
				img.alt = name;
			}
		});
	}

	function rewriteVendorLinks(root) {
		root.querySelectorAll('a[href]').forEach(function (a) {
			var href = a.getAttribute('href') || '';
			if (!VENDOR_HREF.test(href)) {
				return;
			}
			var label = (a.textContent || '').replace(/\s+/g, ' ').trim();
			if (/go pro|upgrade|get now|pro version|learn more|view all features|manage license/i.test(label)) {
				a.setAttribute('href', plansUrl);
			} else if (/docs|faq|document|help|support|forum|guide|validation/i.test(label)) {
				a.setAttribute('href', guideUrl);
			} else {
				a.setAttribute('href', cloudUrl);
			}
			a.removeAttribute('target');
			a.setAttribute('data-rankpublish-rewritten', '1');
		});
	}

	function rewriteNoticeCopy(root) {
		root.querySelectorAll('.wpdeveloper-licensing-notice, .notice').forEach(function (el) {
			if (!/ThinkRank|SchedulePress|WP Scheduled Posts|WPDeveloper|License Key/i.test(el.textContent || '')) {
				return;
			}
			el.querySelectorAll('a[href]').forEach(function (a) {
				var href = a.getAttribute('href') || '';
				if (VENDOR_HREF.test(href)) {
					a.setAttribute('href', plansUrl);
				}
			});
			walkText(el);
		});
	}

	function walkText(node) {
		if (!node) {
			return;
		}
		if (node.nodeType === 3) {
			var next = node.nodeValue;
			NAME_MAP.forEach(function (pair) {
				next = next.replace(pair[0], pair[1]);
			});
			if (next !== node.nodeValue) {
				node.nodeValue = next;
			}
			return;
		}
		if (node.nodeType !== 1) {
			return;
		}
		if (/SCRIPT|STYLE|TEXTAREA|INPUT/.test(node.tagName)) {
			return;
		}
		for (var i = 0; i < node.childNodes.length; i++) {
			walkText(node.childNodes[i]);
		}
	}

	function hideVendorExtras(root) {
		root.querySelectorAll('iframe[src*="youtube"], iframe[src*="youtu.be"]').forEach(function (frame) {
			var wrap = frame.closest('.wprf-video, .wpsp-video, aside, section, article, li') || frame;
			hideElement(wrap);
		});

		root.querySelectorAll('a[href*="youtube.com"], a[href*="youtu.be"]').forEach(function (a) {
			if (/WPDeveloper|SchedulePress|ThinkRank|WP Scheduled/i.test(a.textContent || a.getAttribute('title') || '')) {
				var wrap = a.closest('.wpsp-sidebar-widget, .sidebar-widget, aside, section, article, li') || a;
				hideElement(wrap);
			}
		});
	}

	function hideVendorCards(root) {
		root.querySelectorAll('h2, h3, h4, strong, .title').forEach(function (h) {
			var t = (h.textContent || '').replace(/\s+/g, ' ').trim();
			if (!/Contribute to|Need Help\??|Show your Love|WPDeveloper Forum|Facebook Community|Watch The Video/i.test(t)) {
				return;
			}
			var card = h.closest('.wpsp-sidebar-widget, .sidebar-widget, aside, section, article, li, .wprf-control') || h.parentElement;
			hideElement(card);
		});
	}

	function hideThinkRankUpsells(root) {
		if (!isThinkRankSettingsScreen()) {
			return;
		}
		document.documentElement.classList.add('rpsite-thinkrank-screen');

		if (isModuleWrap) {
			hideThinkRankUpsellsSafe(root);
			return;
		}

		root.querySelectorAll('a[href*="cal.com"], a[href*="calendly.com"]').forEach(function (el) {
			hideElement(findClosestHideable(el) || el);
		});

		var appRoot = root.querySelector('.tr-root') || root;
		var headerScope = appRoot.querySelector('header') || appRoot;
		var bodyScope = appRoot;

		hideByTextInScope(headerScope, 'a, button, span, p, strong, small', /^pro$/i);
		hideByTextInScope(headerScope, 'a, button, span, p, strong, small', /^book a free call$/i);
		hideByTextInScope(headerScope, 'a, button, span, p, strong, small', /^search settings$/i);
		hideByTextInScope(headerScope, 'a, button, span, p, strong, small', /^v\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/i);

		hideByTextInScope(
			bodyScope,
			'h1, h2, h3, h4, p, strong, span, a, button',
			/activate your thinkrank pro license/i
		);
		hideByTextInScope(bodyScope, 'a, button, span, p', /^activate license$/i);
		hideByTextInScope(bodyScope, 'span, p, strong, div[class*="status"]', /^not activated$/i);
		hideByTextInScope(bodyScope, 'h2, h3, h4, strong, span, p', /^follow us$/i);
	}

	function hideThinkRankUpsellsSafe(root) {
		root.querySelectorAll('a[href*="cal.com"], a[href*="calendly.com"]').forEach(function (el) {
			hideElement(el);
		});

		root.querySelectorAll('a, button, span, strong, small, em, h2, h3, h4').forEach(function (el) {
			if (el.childElementCount > 2) {
				return;
			}
			var text = textOf(el);
			if (!text) {
				return;
			}
			if (/^(pro|book a free call|search settings|activate license|not activated|follow us)$/i.test(text)) {
				hideElement(el);
				return;
			}
			if (/^v\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/i.test(text)) {
				hideElement(el);
				return;
			}
			if (/activate your thinkrank pro license/i.test(text)) {
				var card = el.closest('[class*="card"], [class*="Card"], [class*="license"], [class*="License"], section, article, aside');
				if (card && card.childElementCount < 20) {
					hideElement(card);
				}
			}
		});
	}

	function injectLicenseBanner() {
		if (!isLicenseScreen() || document.getElementById('rankpublish-license-banner')) {
			return;
		}
		var host =
			document.querySelector('.wrap') ||
			document.querySelector('.wpsp-admin-header') ||
			document.querySelector('.thinkrank-admin-page') ||
			document.getElementById('wpbody-content');
		if (!host || !host.parentNode) {
			return;
		}
		var bar = document.createElement('div');
		bar.id = 'rankpublish-license-banner';
		bar.className = 'rankpublish-license-banner';
		bar.innerHTML =
			'<strong>RankPublish account</strong>' +
			'<p>Billing, trials, and updates are managed from your RankPublish Cloud account.</p>' +
			'<p>Create or open your account to start the 7-day trial, then pair this WordPress site.</p>' +
			'<p><a class="button button-primary" href="' +
			plansUrl +
			'">Open RankPublish account</a> ' +
			'<a class="button" href="' +
			guideUrl +
			'">Documentation</a></p>';
		host.parentNode.insertBefore(bar, host);

		var emptyRoot = document.getElementById('thinkrank-pro-license-root');
		if (emptyRoot && emptyRoot.childElementCount === 0 && emptyRoot.parentNode) {
			emptyRoot.parentNode.style.setProperty('display', 'none', 'important');
		}
	}

	function rebrandLicenseHeadings(root) {
		if (!isLicenseScreen()) {
			return;
		}
		root.querySelectorAll('h1, h2, h3, p, li, button, label, span, a').forEach(function (el) {
			if (el.childElementCount > 4) {
				return;
			}
			walkText(el);
		});
	}

	function rebrandModuleCopy(root) {
		if (!isModuleWrap) {
			return;
		}
		root.querySelectorAll('h1, h2, h3, h4, p, span, a, button, label, li, strong, em, div').forEach(function (el) {
			if (el.childElementCount > 6) {
				return;
			}
			if (!UPSTREAM_RE.test(el.textContent || '')) {
				return;
			}
			walkText(el);
		});
	}

	function apply() {
		if (!isAdminTarget()) {
			return;
		}
		document.body.classList.add('rankpublish-site-branded-admin');
		var root = moduleRoot();
		swapImageSources(root);
		replaceHeaderLogos(root);
		hideUpstreamSidebars(root);
		rewriteVendorLinks(root);
		rewriteNoticeCopy(root);
		hideVendorExtras(root);
		hideVendorCards(root);
		hideThinkRankUpsells(root);
		rebrandModuleCopy(root);
		injectLicenseBanner();
		rebrandLicenseHeadings(root);
	}

	var timer = null;
	function schedule() {
		if (timer) {
			window.clearTimeout(timer);
		}
		timer = window.setTimeout(apply, isModuleWrap ? 16 : 40);
	}

	if (isModuleWrap) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', apply);
		} else {
			apply();
		}
		window.setTimeout(apply, 250);
		window.setTimeout(apply, 1000);
	} else if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', apply);
	} else {
		apply();
	}

	if (window.MutationObserver && !isModuleWrap) {
		new MutationObserver(schedule).observe(document.documentElement, {
			childList: true,
			subtree: true,
		});
	} else if (window.MutationObserver && isModuleWrap) {
		new MutationObserver(schedule).observe(document.querySelector('.rpsite-module-native') || document.documentElement, {
			childList: true,
			subtree: true,
		});
	}
})();
