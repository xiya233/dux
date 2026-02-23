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
                    var options = '<option value="" disabled selected>💻 代码块 (Shiki)...</option>';
                    for (var i = 0; i < langs.length; i++) {
                        options += '<option value="' + langs[i] + '">' + langs[i] + '</option>';
                    }
                    var $select = $('<select class="ed_button shiki-qt-select" title="选择语言并插入代码块" style="margin: 2px 4px; padding: 0 5px;">' + options + '</select>');

                    // 将下拉框直接追加到 QuickTags 工具栏中
                    $('#ed_toolbar').append($select);

                    $(document).on('change', '.shiki-qt-select', function () {
                        var lang = $(this).val();
                        if (lang) {
                            var openTag = '<pre><code class="language-' + lang + '">';
                            var closeTag = '</code></pre>';

                            var canvasId = $(this).closest('.wp-editor-wrap').find('textarea.wp-editor-area').attr('id');
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
                                    var selectedText = canvas.value.substring(startPos, endPos);

                                    canvas.value = canvas.value.substring(0, startPos) + openTag + selectedText + closeTag + canvas.value.substring(endPos, canvas.value.length);
                                    canvas.focus();
                                    canvas.selectionStart = startPos + openTag.length + selectedText.length;
                                    canvas.selectionEnd = canvas.selectionStart;
                                    canvas.scrollTop = scrollTop;
                                } else {
                                    canvas.value += openTag + closeTag;
                                }
                            } else if (typeof QTags.insertContent === 'function') {
                                QTags.insertContent(openTag + closeTag);
                            }

                            $(this).val(''); // Reset dropdown
                        }
                    });
                }
            });
        </script>
        <?php
    }
}
add_action('admin_print_footer_scripts', 'add_shiki_quicktags_dropdown', 100);
