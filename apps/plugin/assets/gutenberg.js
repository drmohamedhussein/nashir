(function () {
  if (!window.wp || !wp.plugins || !wp.editPost || !wp.element) {
    return;
  }
  const el = wp.element.createElement;
  wp.plugins.registerPlugin("nashir-advanced", {
    render: function () {
      return el(
        wp.editPost.PluginPostStatusInfo,
        {},
        el(
          "p",
          { className: "nashir-gutenberg-note" },
          "PublisherWP: استخدم صندوق «جدولة PublisherWP» في الشريط لتحديث مجدول دون سحب المقال من النشر."
        )
      );
    },
  });
})();
