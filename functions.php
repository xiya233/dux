<?php
// Require theme functions
require get_stylesheet_directory() . '/functions-theme.php';

// Customize your functions





function enqueue_shiki_script() {
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
function add_type_attribute($tag, $handle, $src) {
    if ('shiki-init' === $handle) {
        $tag = '<script type="module" src="' . esc_url($src) . '"></script>';
    }
    return $tag;
}
add_filter('script_loader_tag', 'add_type_attribute', 10, 3);
