<?php
/**
 * Render callback for the OTE Radio Player block.
 */

if (!function_exists('ote_radio_render_block')) {
    function ote_radio_render_block(array $attributes, string $content = '', $block = null) {
        $defaults = array(
            'stationName'   => 'CFUR Radio',
            'city'          => 'Prince George',
            'frequency'     => 88.7,
            'bandKind'      => 'fm',
            'bandMin'       => 70,
            'bandMax'       => 108,
            'bandStep'      => 0.2,
            'bandMajor'     => 1,
            'bandDecimals'  => 1,
            'streamUrl'     => 'https://cfur-radio-proxy.ote-publisher.workers.dev',
            'track'         => 'One More Cup of Coffee',
            'artist'        => 'Bob Dylan',
            'defaultLocked' => true,
        );

        $attributes = wp_parse_args($attributes, $defaults);
        $data       = wp_json_encode($attributes);

        if (!$data) {
            return '';
        }

        // Ensure front-end assets are present when the block renders.
        wp_enqueue_script('ote-radio-player-view-script');
        wp_enqueue_style('ote-radio-player-style');

        $id = 'ote-radio-' . wp_rand(1000, 999999);

        return sprintf(
            '<div id="%1$s" class="wp-block-ote-radio-player" data-ote-radio="%2$s"></div>',
            esc_attr($id),
            esc_attr($data)
        );
    }
}
