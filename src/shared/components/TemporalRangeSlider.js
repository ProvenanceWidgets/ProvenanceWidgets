import { Slider } from "primereact/slider/slider.esm.js";

const temporalRangeSliderStyles = `
    .pw-temporal-range-slider {
        box-sizing: border-box;
        width: 100%;
        color: #55637d;
        font-size: 16px;
        font-weight: 700;
    }

    .pw-temporal-range-slider__labels {
        display: flex;
        justify-content: space-between;
        line-height: 1;
        pointer-events: none;
    }

    .pw-temporal-range-slider--inline
        .pw-temporal-range-slider__labels {
        margin-top: 5px;
    }

    .pw-temporal-range-slider--footer
        .pw-temporal-range-slider__labels {
        margin-bottom: 19px;
    }

    .pw-temporal-range-slider__control.p-slider {
        height: 3px !important;
        margin: 0 !important;
        background: lightgray !important;
        border: 0 !important;
        border-radius: 0 !important;
    }

    .pw-temporal-range-slider__control .p-slider-range {
        background: var(--blue-500, #3b82f6) !important;
    }

    .pw-temporal-range-slider__control .p-slider-handle {
        top: auto !important;
        bottom: 0 !important;
        width: 8px !important;
        height: 16px !important;
        margin-top: 0 !important;
        margin-left: -4px !important;
        background: #333 !important;
        border: 0 !important;
        border-radius: 3px 3px 0 0 !important;
        box-shadow: none !important;
    }

`;

const TemporalRangeSlider = ({
    id,
    label,
    mode,
    onChange,
    onSlideEnd,
    placement = "inline",
    value,
}) => {
    const labels = (
        <div
            className="pw-temporal-range-slider__labels"
            aria-hidden="true"
        >
            <span>{mode === "time" ? "t=0" : "n=0"}</span>
            <span>now</span>
        </div>
    );

    return (
        <div
            className={
                `pw-temporal-range-slider ` +
                `pw-temporal-range-slider--${placement}`
            }
            data-provenance-temporal-brush={id}
            title="Drag both handles to zoom the visible provenance range"
        >
            <style>{temporalRangeSliderStyles}</style>
            {placement === "footer" && labels}
            <Slider
                className="pw-temporal-range-slider__control"
                range
                min={0}
                max={100}
                value={value}
                onChange={onChange}
                onSlideEnd={onSlideEnd}
                aria-label={`${label} temporal range`}
            />
            {placement === "inline" && labels}
        </div>
    );
};

export default TemporalRangeSlider;
