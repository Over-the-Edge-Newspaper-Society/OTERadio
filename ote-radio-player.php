<?php
/**
 * Plugin Name: OTE Radio Player
 * Description: Gutenberg block that renders the OTE live radio player.
 * Version: 0.1.0
 * Author: OTE
 * License: GPL-2.0-or-later
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

require_once __DIR__ . '/render.php';

add_action( 'init', function () {
    register_block_type(
        __DIR__,
        array(
            'render_callback' => 'ote_radio_render_block',
        )
    );
} );
