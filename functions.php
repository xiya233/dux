<?php
// Require theme functions
require get_stylesheet_directory() . '/functions-theme.php';

// Customize your functions





function enqueue_shiki_script()
{
    wp_enqueue_script(
        'shiki-init',
        get_stylesheet_directory_uri() . '/js/shiki-init.js',
        array(),
        THEME_VERSION,
        true
    );
}
add_action('wp_enqueue_scripts', 'enqueue_shiki_script', 100);

// Add type="module" to shiki-init script tag
function add_type_attribute($tag, $handle, $src)
{
    if ('shiki-init' === $handle) {
        $tag = '<script type="module" src="' . esc_url($src) . '"></script>';
    }
    return $tag;
}
add_filter('script_loader_tag', 'add_type_attribute', 10, 3);

// 添加后台经典编辑器的代码快速插入下拉框
function add_shiki_quicktags_dropdown()
{
    if (wp_script_is('quicktags')) {
        ?>
        <script type="text/javascript">
            jQuery(document).ready(function ($) {
                if (typeof QTags !== 'undefined') {
                    var langs = ['bash', 'yaml', 'json', 'toml', 'python', 'javascript', 'nginx', 'apache', 'systemd', 'dotenv', 'text'];

                    var menuHtml = '<div class="shiki-qt-menu" style="display:none; position:absolute; top:100%; left:0; background:#fff; border:1px solid #ddd; box-shadow:0 1px 3px rgba(0,0,0,0.1); z-index:9999; min-width:130px; border-radius:3px; padding:4px 0; margin-top:2px;">';
                    for (var i = 0; i < langs.length; i++) {
                        menuHtml += '<div class="shiki-qt-item" data-lang="' + langs[i] + '" style="padding:4px 12px; cursor:pointer; font-size:12px; color:#333; line-height:1.5;">' + langs[i] + '</div>';
                    }
                    menuHtml += '</div>';

                    var $wrapper = $('<div class="shiki-qt-wrapper" style="display:inline-block; position:relative; vertical-align:top;">' +
                        '<input type="button" class="ed_button shiki-qt-btn" title="选择语言并插入代码块" value="💻 代码块 ▾" style="margin: 2px 4px; padding: 2px 8px; border: 1px solid #8c8f94; border-radius: 3px; background: #f6f7f7; color: #2c3338; cursor: pointer; outline: none; box-shadow: none;" />' +
                        menuHtml +
                        '</div>');

                    $('#ed_toolbar').append($wrapper);

                    $(document).on('mouseenter', '.shiki-qt-item', function () {
                        $(this).css({ backgroundColor: '#007cba', color: '#fff' });
                    }).on('mouseleave', '.shiki-qt-item', function () {
                        $(this).css({ backgroundColor: 'transparent', color: '#333' });
                    });

                    // 核心逻辑：阻止 mousedown 获取焦点，从而完全保留输入框内的原生选中状态高亮！
                    $(document).on('mousedown', '.shiki-qt-btn, .shiki-qt-item', function (e) {
                        e.preventDefault();
                    });

                    $(document).on('click', '.shiki-qt-btn', function (e) {
                        $(this).siblings('.shiki-qt-menu').toggle();
                    });

                    $(document).on('click', function (e) {
                        if (!$(e.target).closest('.shiki-qt-wrapper').length) {
                            $('.shiki-qt-menu').hide();
                        }
                    });

                    $(document).on('click', '.shiki-qt-item', function () {
                        var btn = $(this);
                        btn.closest('.shiki-qt-menu').hide();
                        var lang = btn.data('lang');
                        if (!lang) return;

                        var openTag = '<pre><code class="language-' + lang + '">';
                        var closeTag = '</code></pre>';

                        var canvasId = btn.closest('.wp-editor-wrap').find('textarea.wp-editor-area').attr('id');
                        var canvas = canvasId ? document.getElementById(canvasId) : document.getElementById(wpActiveEditor) || document.getElementById('content');

                        if (canvas) {
                            if (document.selection) { // IE
                                canvas.focus();
                                var sel = document.selection.createRange();
                                sel.text = openTag + sel.text + closeTag;
                            } else if (canvas.selectionStart || canvas.selectionStart === 0) { // FF/Webkit
                                var startPos = canvas.selectionStart;
                                var endPos = canvas.selectionEnd;
                                var scrollTop = canvas.scrollTop;
                                var winScroll = $(window).scrollTop();
                                var selectedText = canvas.value.substring(startPos, endPos);

                                canvas.value = canvas.value.substring(0, startPos) + openTag + selectedText + closeTag + canvas.value.substring(endPos, canvas.value.length);
                                canvas.focus();
                                canvas.selectionStart = startPos + openTag.length + selectedText.length;
                                canvas.selectionEnd = canvas.selectionStart;
                                canvas.scrollTop = scrollTop;
                                $(window).scrollTop(winScroll);
                            } else {
                                canvas.value += openTag + closeTag;
                            }
                        } else if (typeof QTags.insertContent === 'function') {
                            QTags.insertContent(openTag + closeTag);
                        }
                    });
                }
            });
        </script>
        <?php
    }
}
add_action('admin_print_footer_scripts', 'add_shiki_quicktags_dropdown', 100);
