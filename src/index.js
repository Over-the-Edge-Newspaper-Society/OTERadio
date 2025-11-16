import { registerBlockType } from '@wordpress/blocks';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';
import { useEffect } from '@wordpress/element';

import './style.scss';
import './editor.scss';
import { RadioPlayer, defaults } from './player';

const clampNumber = (value, min, max) => Math.min(Math.max(value, min), max);
const numberOr = (value, fallback) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const Edit = ({ attributes, setAttributes }) => {
  const {
    stationName,
    city,
    frequency,
    bandKind,
    bandMin,
    bandMax,
    bandStep,
    bandMajor,
    bandDecimals,
    streamUrl,
    track,
    artist,
    defaultLocked,
  } = attributes;

  useEffect(() => {
    const clampedFrequency = clampNumber(Number(frequency) || defaults.frequency, Number(bandMin), Number(bandMax));
    if (clampedFrequency !== frequency) {
      setAttributes({ frequency: clampedFrequency });
    }
  }, [bandMin, bandMax]);

  return (
    <>
      <InspectorControls>
        <PanelBody title="Station" initialOpen>
          <TextControl label="Station name" value={stationName} onChange={(value) => setAttributes({ stationName: value })} />
          <TextControl label="City" value={city} onChange={(value) => setAttributes({ city: value })} />
          <TextControl label="Stream URL" value={streamUrl} onChange={(value) => setAttributes({ streamUrl: value })} />
          <ToggleControl
            label="Lock tuner by default"
            checked={!!defaultLocked}
            onChange={(value) => setAttributes({ defaultLocked: !!value })}
          />
        </PanelBody>

        <PanelBody title="Track details" initialOpen={false}>
          <TextControl label="Track" value={track} onChange={(value) => setAttributes({ track: value })} />
          <TextControl label="Artist" value={artist} onChange={(value) => setAttributes({ artist: value })} />
        </PanelBody>

        <PanelBody title="Band" initialOpen={false}>
          <TextControl label="Band label (FM or AM)" value={bandKind} onChange={(value) => setAttributes({ bandKind: value })} />
          <TextControl
            type="number"
            label="Start of band"
            value={bandMin}
            onChange={(value) => setAttributes({ bandMin: numberOr(value, bandMin) })}
          />
          <TextControl
            type="number"
            label="End of band"
            value={bandMax}
            onChange={(value) => setAttributes({ bandMax: numberOr(value, bandMax) })}
          />
          <TextControl
            type="number"
            label="Tuning step"
            help="Amount changed when stepping left/right"
            value={bandStep}
            onChange={(value) => setAttributes({ bandStep: numberOr(value, bandStep) })}
          />
          <TextControl
            type="number"
            label="Major marker interval"
            value={bandMajor}
            onChange={(value) => setAttributes({ bandMajor: numberOr(value, bandMajor) })}
          />
          <TextControl
            type="number"
            label="Decimal places"
            value={bandDecimals}
            onChange={(value) => setAttributes({ bandDecimals: Math.max(0, numberOr(value, bandDecimals)) })}
          />
          <TextControl
            type="number"
            label="Default tuned frequency"
            value={frequency}
            onChange={(value) => setAttributes({ frequency: numberOr(value, frequency) })}
          />
        </PanelBody>
      </InspectorControls>

      <div {...useBlockProps()}>
        <RadioPlayer
          {...attributes}
          playbackDisabled
          onFrequencyChange={(value) => setAttributes({ frequency: value })}
        />
      </div>
    </>
  );
};

registerBlockType('ote/radio-player', {
  edit: Edit,
  save: () => null,
});
