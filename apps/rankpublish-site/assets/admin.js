(function () {
	'use strict';

	var root = document.querySelector('.rpsite-os');
	if (!root) {
		return;
	}

	var strings = window.rpsiteAdmin || {};

	function qs(sel, scope) {
		return (scope || root).querySelector(sel);
	}

	function qsa(sel, scope) {
		return Array.prototype.slice.call((scope || root).querySelectorAll(sel));
	}

	function toast(message) {
		var el = qs('.rpsite-os-toast', document);
		if (!el) {
			el = document.createElement('div');
			el.className = 'rpsite-os-toast';
			document.body.appendChild(el);
		}
		el.textContent = message;
		el.hidden = false;
		window.clearTimeout(el._timer);
		el._timer = window.setTimeout(function () {
			el.hidden = true;
		}, 1800);
	}

	function closeMenus() {
		qsa('[data-rpsite-menu]').forEach(function (node) {
			node.classList.remove('is-open');
		});
	}

	function setModal(name, open) {
		var modal = qs('[data-rpsite-modal="' + name + '"]');
		if (!modal) {
			return;
		}
		modal.hidden = !open;
		document.body.style.overflow = open ? 'hidden' : '';
		if (open) {
			var urlInput = qs('[data-rpsite-wp-url]');
			if (urlInput) {
				window.setTimeout(function () {
					urlInput.focus();
				}, 0);
			}
		}
	}

	function setSidebar(open) {
		root.classList.toggle('is-nav-open', open);
		var burger = qs('[data-rpsite-sidebar-toggle]');
		if (burger) {
			burger.setAttribute('aria-expanded', open ? 'true' : 'false');
		}
		var scrim = qs('[data-rpsite-sidebar-close]');
		if (scrim) {
			scrim.hidden = !open;
		}
	}

	function parseHttpUrl(value) {
		try {
			var parsed = new URL(value);
			if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
				return null;
			}
			return parsed;
		} catch (err) {
			return null;
		}
	}

	function isHqHost(hostname) {
		var hq = String(strings.hqHost || '').toLowerCase().replace(/^www\./, '');
		var host = String(hostname || '').toLowerCase().replace(/^www\./, '');
		return hq !== '' && host === hq;
	}

	function continueToCloud(link, event) {
		var input = qs('[data-rpsite-wp-url]');
		var raw = input ? String(input.value || '').trim() : '';
		var parsed = parseHttpUrl(raw);
		if (!parsed) {
			event.preventDefault();
			toast(strings.invalidWpUrl || 'Enter a valid WordPress URL, including https://');
			if (input) {
				input.focus();
			}
			return;
		}
		if (isHqHost(parsed.hostname)) {
			event.preventDefault();
			toast(strings.hqUrlBlocked || 'Enter the customer WordPress URL instead.');
			if (input) {
				input.focus();
			}
			return;
		}
		var base = link.getAttribute('data-rpsite-cloud-base') || link.getAttribute('href') || '';
		try {
			var next = new URL(base, window.location.origin);
			next.searchParams.set('siteUrl', parsed.origin);
			var nameInput = qs('[data-rpsite-site-name]');
			var siteName = nameInput ? String(nameInput.value || '').trim() : '';
			if (siteName) {
				next.searchParams.set('siteName', siteName);
			}
			link.setAttribute('href', next.toString());
		} catch (err) {
			event.preventDefault();
			toast(strings.invalidWpUrl || 'Enter a valid WordPress URL, including https://');
		}
	}

	function copyText(value) {
		var done = function () {
			toast(strings.copied || 'Copied');
		};
		var fail = function () {
			toast(strings.copyFailed || 'Could not copy');
		};
		if (navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard.writeText(value).then(done).catch(fail);
			return;
		}
		var input = document.createElement('textarea');
		input.value = value;
		input.setAttribute('readonly', '');
		input.style.position = 'absolute';
		input.style.left = '-9999px';
		document.body.appendChild(input);
		input.select();
		try {
			document.execCommand('copy');
			done();
		} catch (err) {
			fail();
		}
		document.body.removeChild(input);
	}

	root.addEventListener('click', function (event) {
		var openBtn = event.target.closest('[data-rpsite-open]');
		if (openBtn) {
			event.preventDefault();
			closeMenus();
			setModal(openBtn.getAttribute('data-rpsite-open'), true);
			return;
		}

		var closeBtn = event.target.closest('[data-rpsite-close]');
		if (closeBtn) {
			event.preventDefault();
			setModal(closeBtn.getAttribute('data-rpsite-close'), false);
			return;
		}

		var copyBtn = event.target.closest('[data-rpsite-copy]');
		if (copyBtn) {
			event.preventDefault();
			copyText(copyBtn.getAttribute('data-rpsite-copy') || '');
			return;
		}

		var toggle = event.target.closest('[data-rpsite-toggle]');
		if (toggle) {
			event.preventDefault();
			var menu = toggle.closest('[data-rpsite-menu]');
			var wasOpen = menu && menu.classList.contains('is-open');
			closeMenus();
			if (menu && !wasOpen) {
				menu.classList.add('is-open');
			}
			return;
		}

		if (event.target.closest('[data-rpsite-sidebar-toggle]')) {
			event.preventDefault();
			setSidebar(!root.classList.contains('is-nav-open'));
			return;
		}

		if (event.target.closest('[data-rpsite-sidebar-close]')) {
			setSidebar(false);
			return;
		}

		var continueLink = event.target.closest('[data-rpsite-continue-cloud]');
		if (continueLink) {
			continueToCloud(continueLink, event);
			return;
		}

		if (!event.target.closest('[data-rpsite-menu]')) {
			closeMenus();
		}
	});

	document.addEventListener('keydown', function (event) {
		if (event.key !== 'Escape') {
			return;
		}
		closeMenus();
		setSidebar(false);
		qsa('[data-rpsite-modal]').forEach(function (modal) {
			modal.hidden = true;
		});
		document.body.style.overflow = '';
	});
})();
